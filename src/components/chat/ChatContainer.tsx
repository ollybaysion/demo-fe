"use client";

import { useCallback, useState } from "react";
import { parseSseStream } from "@/lib/sse";
import type { ContextRow, Message } from "@/lib/types";
import { ChatEmptyState } from "./ChatEmptyState";
import { ChatHeader } from "./ChatHeader";
import { ChatInput } from "./ChatInput";
import { MessageList } from "./MessageList";
import { SuggestedQuestions } from "./SuggestedQuestions";
import {
  ContextPanel,
  ContextToggleHandle,
  useContextRows,
} from "./context";

type TokenPayload = { content: string };
type ErrorPayload = { message: string };

function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Strip rows / chambers / sensors with no user input so we don't ship
 * blank scaffolding to the API. A row keeps its non-empty members and
 * is itself dropped if everything inside is empty.
 */
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
  const [panelOpen, setPanelOpen] = useState(false);
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
    reset,
  } = useContextRows();

  const sendToApi = useCallback(
    async (
      history: Message[],
      context: ContextRow[],
      timeRangeSnapshot: { start: string; end: string },
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
        // assistantInserted exists for callers that want to know whether
        // the partial bubble was emitted; current behavior is identical.
        void assistantInserted;
      } finally {
        setIsStreaming(false);
      }
    },
    [],
  );

  const handleSubmit = useCallback(
    (text: string) => {
      const userMessage: Message = {
        id: newId(),
        role: "user",
        content: text,
        createdAt: Date.now(),
      };
      const nextHistory = [...messages, userMessage];
      setMessages(nextHistory);
      setIsStreaming(true);
      void sendToApi(nextHistory, nonEmptyRows(rows), timeRange);
    },
    [messages, rows, timeRange, sendToApi],
  );

  const handleRetry = useCallback(() => {
    setMessages((prev) => {
      const lastUserIndex = findLastIndex(prev, (m) => m.role === "user");
      if (lastUserIndex === -1) return prev;
      const trimmed = prev.slice(0, lastUserIndex + 1);
      setIsStreaming(true);
      void sendToApi(trimmed, nonEmptyRows(rows), timeRange);
      return trimmed;
    });
  }, [rows, timeRange, sendToApi]);

  return (
    <div className="flex h-dvh bg-brand-canvas text-brand-ink">
      {/* Chat column */}
      <div className="flex flex-1 min-w-0 flex-col">
        <ChatHeader />

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-chat-narrow px-lg py-xl">
            {messages.length === 0 ? (
              <ChatEmptyState />
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
            {messages.length === 0 && !isStreaming && (
              <SuggestedQuestions onSelect={handleSubmit} />
            )}
            <ChatInput onSubmit={handleSubmit} disabled={isStreaming} />
          </div>
        </div>
      </div>

      {/* Right-side context panel (push layout) */}
      <ContextPanel
        open={panelOpen}
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

      {/* Toggle handle (fixed) — sits at panel's left edge when open */}
      <ContextToggleHandle
        open={panelOpen}
        onToggle={() => setPanelOpen((o) => !o)}
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
