"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SCENARIOS, type Scenario } from "@/demo/scenarios";
import { parseSseStream } from "@/lib/sse";
import type { ContextRow, Message, MessageTable } from "@/lib/types";
import { ChatEmptyState } from "./ChatEmptyState";
import { ChatHeader } from "./ChatHeader";
import { ChatInput } from "./ChatInput";
import { EquipmentDetailPanel } from "./EquipmentDetailPanel";
import { MessageList } from "./MessageList";
import { SuggestedQuestions } from "./SuggestedQuestions";
import { SummaryPanel } from "./SummaryPanel";
import { SummaryToggleHandle } from "./SummaryToggleHandle";
import {
  ContextPanel,
  ContextToggleHandle,
  useContextRows,
} from "./context";
import {
  ConversationsSidebar,
  ConversationToggleHandle,
  useConversations,
} from "./history";

type TokenPayload = { content: string };
type ErrorPayload = { message: string };
type StreamPayload = TokenPayload | ErrorPayload | MessageTable;

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
  const [leftPanel, setLeftPanel] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
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
    reset: resetContext,
  } = useContextRows();
  const {
    list: conversations,
    activeId,
    hydrated: conversationsHydrated,
    createConversation,
    updateConversation,
    selectConversation,
    startNewConversation,
  } = useConversations();

  // ── Conversation ↔ local state sync (#11) ─────────────────────────
  // Load: when activeId transitions to a real id, hydrate local chat state
  // from that conversation. The ref tracks the last-loaded id so this
  // effect only fires on actual transitions (not on every list update).
  const loadedIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!conversationsHydrated) return;
    if (activeId === loadedIdRef.current) return;
    loadedIdRef.current = activeId;
    if (!activeId) return; // null transition handled by handleNewConversation
    const conv = conversations.find((c) => c.id === activeId);
    if (!conv) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMessages(conv.messages);
    replaceRows(conv.context.rows);
    replaceTimeRange(conv.context.timeRange);
  }, [
    activeId,
    conversationsHydrated,
    conversations,
    replaceRows,
    replaceTimeRange,
  ]);

  // Persist: throttle local state writes to the active conversation. The
  // 300ms idle window collapses per-token streaming updates into a single
  // localStorage write while preserving freshness for typed input.
  // updateConversation has an identity check, so the load case (state ===
  // conv contents) is a no-op — updatedAt is not bumped.
  useEffect(() => {
    if (!conversationsHydrated) return;
    if (!activeId) return;
    const handle = setTimeout(() => {
      updateConversation(activeId, {
        messages,
        context: { rows, timeRange },
      });
    }, 300);
    return () => clearTimeout(handle);
  }, [
    messages,
    rows,
    timeRange,
    activeId,
    conversationsHydrated,
    updateConversation,
  ]);

  const sendToApi = useCallback(
    async (
      history: Message[],
      context: ContextRow[],
      timeRangeSnapshot: { start: string; end: string },
      demoMeta?: DemoMeta,
    ) => {
      const assistantId = newId();
      let assistantInserted = false;
      // 표 페이로드(#34) 는 모든 토큰 스트리밍이 끝난 뒤 `done` 이벤트
      // 시점에 한 번에 적용 → 응답이 다 끝나고 자연스럽게 표가 등장.
      let pendingTable: MessageTable | null = null;

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

        for await (const ev of parseSseStream<StreamPayload>(res.body)) {
          if (ev.event === "token") {
            const piece = (ev.data as TokenPayload).content;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, content: m.content + piece }
                  : m,
              ),
            );
          } else if (ev.event === "table") {
            // 들어오는 즉시 적용하지 않고 보관 — `done` 시점에 한 번에 적용.
            pendingTable = ev.data as MessageTable;
          } else if (ev.event === "done") {
            // 모든 토큰이 끝난 시점 — 표가 있으면 이때 화면에 등장.
            if (pendingTable && assistantInserted) {
              const table = pendingTable;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId ? { ...m, table } : m,
                ),
              );
            }
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

      // Auto-persist (#11): create a Conversation on the first non-demo
      // user message. Demo flows are ephemeral — their messages do not
      // populate the sidebar.
      if (!demoState && !activeId) {
        createConversation({
          messages: nextHistory,
          context: { rows, timeRange },
        });
      }

      if (demoState) {
        const scenario = SCENARIOS.find((s) => s.id === demoState.scenarioId);
        const currentTurn = scenario?.turns[demoState.turnIndex];

        let effectiveTimeRange = timeRange;
        if (currentTurn?.contextPanel) {
          replaceRows(currentTurn.contextPanel);
          setRightPanel("context");
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
      activeId,
      sendToApi,
      replaceRows,
      replaceTimeRange,
      createConversation,
    ],
  );

  const handleNewConversation = useCallback(() => {
    setMessages([]);
    setIsStreaming(false);
    setDemoState(null);
    setDetailOpen(false);
    resetContext();
    startNewConversation();
  }, [resetContext, startNewConversation]);

  const handleSidebarSelect = useCallback(
    (id: string) => {
      // Mid-stream switch would orphan the in-flight assistant message —
      // require the user to wait for the current turn to settle.
      if (isStreaming) return;
      setDemoState(null);
      setDetailOpen(false);
      selectConversation(id);
    },
    [isStreaming, selectConversation],
  );

  const equipmentNames = useMemo(
    () =>
      rows
        .map((r) => r.equipment.trim())
        .filter((n) => n.length > 0),
    [rows],
  );

  function handleContextToggle() {
    setRightPanel((prev) => {
      const next = prev === "context" ? null : "context";
      if (next !== "context") setDetailOpen(false);
      return next;
    });
  }

  function handleSummaryToggle() {
    setRightPanel((prev) => (prev === "summary" ? null : "summary"));
    setDetailOpen(false);
  }

  function handleLeftToggle() {
    setLeftPanel((p) => !p);
  }

  // #30 재생성 / 에러 재시도 공통 핸들러. 마지막 user 메시지까지
  // 잘라낸 뒤 같은 컨텍스트로 다시 API 호출. 데모 시나리오 진행 중엔
  // 호출되지 않도록 onRegenerate prop 자체를 빼서 버튼이 안 보이게 한다.
  const handleRegenerate = useCallback(() => {
    setMessages((prev) => {
      const lastUserIndex = findLastIndex(prev, (m) => m.role === "user");
      if (lastUserIndex === -1) return prev;
      const trimmed = prev.slice(0, lastUserIndex + 1);
      setIsStreaming(true);
      void sendToApi(trimmed, nonEmptyRows(rows), timeRange);
      return trimmed;
    });
  }, [rows, timeRange, sendToApi]);

  let lockedValue: string | undefined;
  let inputPlaceholder: string | undefined;
  if (demoState) {
    if (demoState.ended) {
      lockedValue = "";
      inputPlaceholder = "데모 종료 — 헤더의 '새 대화' 버튼을 눌러주세요";
    } else if (!isStreaming && demoState.turnIndex > 0) {
      const scenario = SCENARIOS.find((s) => s.id === demoState.scenarioId);
      lockedValue = scenario?.turns[demoState.turnIndex]?.user;
    }
  }

  return (
    <div className="flex h-dvh bg-brand-canvas text-brand-ink">
      {/* Left — conversation history sidebar (#11). Push layout: chat
          column shrinks when this opens. */}
      <ConversationsSidebar
        open={leftPanel}
        conversations={conversations}
        activeId={activeId}
        onSelect={handleSidebarSelect}
      />

      {/* Chat column */}
      <div className="flex flex-1 min-w-0 flex-col">
        <ChatHeader onNewConversation={handleNewConversation} />

        <main className="flex-1 overflow-y-auto">
          {/* 메시지 목록은 xl+ 에서 좌·우 5vw 만 남기고 풀 폭 사용 —
              풍선 자체는 항상 중앙(`[1fr | 768 | 1fr]`)에 두어 표 유무에
              따라 움직이지 않음. 풍선이 오른쪽으로 슬라이드되는 더 적극
              적인 레이아웃은 별도 이슈에서 검토. */}
          <div
            className={[
              "mx-auto py-xl",
              messages.length === 0
                ? "max-w-chat-narrow px-lg"
                : "max-w-chat-narrow px-lg xl:max-w-none xl:px-[5vw]",
            ].join(" ")}
          >
            {messages.length === 0 ? (
              <ChatEmptyState onScenarioStart={handleScenarioStart} />
            ) : (
              <MessageList
                messages={messages}
                isStreaming={isStreaming}
                onRegenerate={demoState ? undefined : handleRegenerate}
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
        onReset={resetContext}
        onExpandDetail={() => setDetailOpen(true)}
        detailOpen={detailOpen}
        canExpandDetail={equipmentNames.length > 0}
      />

      <EquipmentDetailPanel
        open={rightPanel === "context" && detailOpen}
        equipmentNames={equipmentNames}
        onClose={() => setDetailOpen(false)}
      />

      <SummaryPanel
        open={rightPanel === "summary"}
        rows={rows}
        timeRange={timeRange}
      />

      {/* Left-edge floating handle — mirror of right stack */}
      <div
        className={[
          "fixed top-1/4 left-0 z-20 flex flex-col gap-xs",
          "transition-transform duration-200 ease-out",
          leftPanel ? "translate-x-[320px]" : "translate-x-0",
        ].join(" ")}
      >
        <ConversationToggleHandle
          isOpen={leftPanel}
          onToggle={handleLeftToggle}
        />
      </div>

      {/* Right-edge floating handle stack */}
      <div
        className={[
          "fixed top-1/4 right-0 z-20 flex flex-col gap-xs",
          "transition-transform duration-200 ease-out",
          rightPanel !== null ? "translate-x-[-320px]" : "translate-x-0",
        ].join(" ")}
      >
        <ContextToggleHandle
          isOpen={rightPanel === "context"}
          onToggle={handleContextToggle}
        />
        {messages.length > 0 && (
          <SummaryToggleHandle
            isOpen={rightPanel === "summary"}
            onToggle={handleSummaryToggle}
          />
        )}
      </div>
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
