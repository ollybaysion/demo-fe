"use client";

import { useCallback, useState } from "react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { SCENARIOS, type Scenario } from "@/demo/scenarios";
import { parseSseStream } from "@/lib/sse";
import type { ContextRow, Message } from "@/lib/types";
import { ChatEmptyState } from "./ChatEmptyState";
import { ChatHeader } from "./ChatHeader";
import { ChatInput } from "./ChatInput";
import { MessageList } from "./MessageList";
import { SuggestedQuestions } from "./SuggestedQuestions";
import { SummaryPanel } from "./SummaryPanel";
import {
  ContextPanel,
  ContextToggleHandle,
  useContextRows,
} from "./context";

type TokenPayload = { content: string };
type ErrorPayload = { message: string };

type DemoMeta = { scenarioId: string; turnIndex: number };
type DemoState = DemoMeta & { ended: boolean };

function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function nonEmptyRows(rows: ContextRow[]): ContextRow[] {
  return rows
    .map((r) => {
      const chambers = r.chambers
        .map((c) => ({
          ...c,
          sensors: c.sensors.filter((s) => s.name.trim().length > 0),
        }))
        .filter(
          (c) => c.name.trim().length > 0 || c.sensors.length > 0,
        );
      return { ...r, chambers };
    })
    .filter(
      (r) => r.equipment.trim().length > 0 || r.chambers.length > 0,
    );
}

export function ChatContainer() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  // Single source of truth for the right-side slot — at most one panel
  // is shown at a time; flipping flips both visually.
  const [rightPanel, setRightPanel] = useState<"context" | "summary" | null>(
    null,
  );
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [demoState, setDemoState] = useState<DemoState | null>(null);
  const {
    rows,
    timeRange,
    setStart,
    setEnd,
    setEquipment,
    addRow,
    deleteRow,
    addChamber,
    setChamberName,
    deleteChamber,
    addSensor,
    setSensorName,
    deleteSensor,
    replaceRows,
    replaceTimeRange,
    reset,
  } = useContextRows();

  const sendToApi = useCallback(
    async (
      history: Message[],
      context: ContextRow[],
      timeRangeSnapshot: { start: string; end: string },
      demoMeta?: DemoMeta,
    ) => {
      const assistantId = newId();
      let assistantInserted = false;

      const hasRange =
        timeRangeSnapshot.start.length > 0 || timeRangeSnapshot.end.length > 0;

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: history,
            context,
            timeRange: hasRange ? timeRangeSnapshot : undefined,
            demo: demoMeta,
          }),
        });

        if (!res.ok || !res.body) {
          const reason =
            res.status === 0
              ? "네트워크 연결을 확인해주세요."
              : `요청 실패 (${res.status}). 잠시 후 다시 시도해주세요.`;
          appendErrorMessage(setMessages, reason);
          return;
        }

        setMessages((prev) => [
          ...prev,
          {
            id: assistantId,
            role: "assistant",
            content: "",
            createdAt: Date.now(),
          },
        ]);
        assistantInserted = true;

        for await (const ev of parseSseStream<TokenPayload | ErrorPayload>(
          res.body,
        )) {
          if (ev.event === "token") {
            const piece = (ev.data as TokenPayload).content;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, content: m.content + piece }
                  : m,
              ),
            );
          } else if (ev.event === "done") {
            break;
          } else if (ev.event === "error") {
            const msg =
              (ev.data as ErrorPayload).message ?? "응답 생성 중 오류";
            appendErrorMessage(setMessages, msg);
            break;
          }
        }
      } catch (err) {
        const reason =
          err instanceof Error ? err.message : "응답을 받지 못했습니다.";
        appendErrorMessage(setMessages, reason);
        void assistantInserted;
      } finally {
        setIsStreaming(false);
      }
    },
    [],
  );

  const handleScenarioStart = useCallback(
    async (scenario: Scenario) => {
      // Auto-fill context panel + optional time range
      replaceRows(scenario.contextPanel);
      if (scenario.timeRange) {
        replaceTimeRange(scenario.timeRange);
      }
      // Send starter as the first user message
      const starterMsg: Message = {
        id: newId(),
        role: "user",
        content: scenario.starter,
        createdAt: Date.now(),
      };
      setMessages([starterMsg]);
      setIsStreaming(true);
      setDemoState({ scenarioId: scenario.id, turnIndex: 0, ended: false });

      await sendToApi(
        [starterMsg],
        [],
        scenario.timeRange ?? timeRange,
        { scenarioId: scenario.id, turnIndex: 0 },
      );

      // Advance to next turn (or mark ended if no more)
      const nextIdx = 1;
      setDemoState({
        scenarioId: scenario.id,
        turnIndex: nextIdx,
        ended: nextIdx >= scenario.turns.length,
      });
    },
    [replaceRows, replaceTimeRange, sendToApi, timeRange],
  );

  const handleSubmit = useCallback(
    async (text: string) => {
      if (demoState?.ended) {
        // Demo finished — Enter is a no-op until reset.
        return;
      }
      const userMessage: Message = {
        id: newId(),
        role: "user",
        content: text,
        createdAt: Date.now(),
      };
      const nextHistory = [...messages, userMessage];
      setMessages(nextHistory);
      setIsStreaming(true);

      if (demoState) {
        const scenario = SCENARIOS.find((s) => s.id === demoState.scenarioId);
        const currentTurn = scenario?.turns[demoState.turnIndex];

        // Per-turn auto-fill (used when a scripted user message names
        // the equipment, time, etc. — the panel "follows" the script).
        let effectiveTimeRange = timeRange;
        if (currentTurn?.contextPanel) {
          replaceRows(currentTurn.contextPanel);
          setRightPanel("context"); // surface the just-filled panel
        }
        if (currentTurn?.timeRange) {
          replaceTimeRange(currentTurn.timeRange);
          effectiveTimeRange = currentTurn.timeRange;
        }

        await sendToApi(
          nextHistory,
          [],
          effectiveTimeRange,
          { scenarioId: demoState.scenarioId, turnIndex: demoState.turnIndex },
        );
        const nextIdx = demoState.turnIndex + 1;
        setDemoState({
          scenarioId: demoState.scenarioId,
          turnIndex: nextIdx,
          ended: !scenario || nextIdx >= scenario.turns.length,
        });
      } else {
        await sendToApi(nextHistory, nonEmptyRows(rows), timeRange);
      }
    },
    [
      demoState,
      messages,
      rows,
      timeRange,
      sendToApi,
      replaceRows,
      replaceTimeRange,
    ],
  );

  const handleRequestReset = useCallback(() => {
    setResetDialogOpen(true);
  }, []);

  const handleConfirmReset = useCallback(() => {
    setMessages([]);
    setIsStreaming(false);
    setDemoState(null);
    reset();
  }, [reset]);

  const handleRetry = useCallback(() => {
    setMessages((prev) => {
      const lastUserIndex = findLastIndex(prev, (m) => m.role === "user");
      if (lastUserIndex === -1) return prev;
      const trimmed = prev.slice(0, lastUserIndex + 1);
      setIsStreaming(true);
      // Retry uses the same demo turn (decremented earlier? no — error
      // doesn't advance turnIndex in the success path, but on async
      // catch it does). For v1 we just send without demo on retry to
      // keep behavior predictable; the user can hit "다시 시작" if the
      // scripted flow is broken.
      void sendToApi(trimmed, nonEmptyRows(rows), timeRange);
      return trimmed;
    });
  }, [rows, timeRange, sendToApi]);

  // Locked input value (ghost text) for demo turns 1+.
  let lockedValue: string | undefined;
  let inputPlaceholder: string | undefined;
  if (demoState) {
    if (demoState.ended) {
      lockedValue = "";
      inputPlaceholder = "데모 종료 — 헤더의 '다시 시작' 버튼을 눌러주세요";
    } else if (!isStreaming && demoState.turnIndex > 0) {
      const scenario = SCENARIOS.find((s) => s.id === demoState.scenarioId);
      lockedValue = scenario?.turns[demoState.turnIndex]?.user;
    }
  }

  const resetDialogTitle = demoState
    ? "데모를 다시 시작하시겠습니까?"
    : "대화를 초기화하시겠습니까?";
  const resetDialogDescription = demoState
    ? "현재 데모를 종료하고 시작 화면으로 돌아갑니다. 입력하신 설비 정보와 발생 시간도 함께 비워집니다."
    : "입력하신 설비 정보와 발생 시간도 함께 비워집니다. 되돌릴 수 없습니다.";
  const resetDialogConfirm = demoState ? "다시 시작" : "초기화";

  return (
    <div className="flex h-dvh bg-brand-canvas text-brand-ink">
      {/* Chat column */}
      <div className="flex flex-1 min-w-0 flex-col">
        <ChatHeader
          onReset={handleRequestReset}
          onOpenSummary={
            messages.length > 0
              ? () => setRightPanel("summary")
              : undefined
          }
        />

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-chat-narrow px-lg py-xl">
            {messages.length === 0 ? (
              <ChatEmptyState onScenarioStart={handleScenarioStart} />
            ) : (
              <MessageList
                messages={messages}
                isStreaming={isStreaming}
                onRetry={handleRetry}
              />
            )}
          </div>
        </main>

        <div
          className="bg-brand-canvas"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <div className="mx-auto max-w-chat-narrow px-lg pt-sm pb-lg">
            {messages.length === 0 && !isStreaming && !demoState && (
              <SuggestedQuestions onSelect={handleSubmit} />
            )}
            <ChatInput
              onSubmit={handleSubmit}
              disabled={isStreaming}
              lockedValue={lockedValue}
              placeholder={inputPlaceholder}
            />
          </div>
        </div>
      </div>

      {/* Right-side context panel (push layout) — mutex with summary */}
      <ContextPanel
        open={rightPanel === "context"}
        rows={rows}
        timeRange={timeRange}
        onStartChange={setStart}
        onEndChange={setEnd}
        onEquipmentChange={setEquipment}
        onAddRow={addRow}
        onDeleteRow={deleteRow}
        onAddChamber={addChamber}
        onSetChamberName={setChamberName}
        onDeleteChamber={deleteChamber}
        onAddSensor={addSensor}
        onSetSensorName={setSensorName}
        onDeleteSensor={deleteSensor}
        onReset={reset}
      />

      {/* Right-side summary panel (#24) — mutex with context */}
      <SummaryPanel
        open={rightPanel === "summary"}
        rows={rows}
        timeRange={timeRange}
        onClose={() => setRightPanel(null)}
      />

      {/* Toggle handle (fixed) — context panel access */}
      <ContextToggleHandle
        pulledOut={rightPanel !== null}
        isContextOpen={rightPanel === "context"}
        onToggle={() =>
          setRightPanel((prev) => (prev === "context" ? null : "context"))
        }
      />

      <ConfirmDialog
        open={resetDialogOpen}
        onClose={() => setResetDialogOpen(false)}
        onConfirm={handleConfirmReset}
        title={resetDialogTitle}
        description={resetDialogDescription}
        confirmLabel={resetDialogConfirm}
        cancelLabel="취소"
      />
    </div>
  );
}

function appendErrorMessage(
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>,
  content: string,
) {
  setMessages((prev) => [
    ...prev,
    {
      id: newId(),
      role: "error",
      content,
      createdAt: Date.now(),
    },
  ]);
}

function findLastIndex<T>(
  arr: T[],
  predicate: (value: T) => boolean,
): number {
  for (let i = arr.length - 1; i >= 0; i--) {
    if (predicate(arr[i])) return i;
  }
  return -1;
}
