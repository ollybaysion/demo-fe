"use client";

import { useCallback, useState } from "react";
import { parseSseStream } from "@/lib/sse";
import type { Message } from "@/lib/types";
import { ChatEmptyState } from "./ChatEmptyState";
import { ChatHeader } from "./ChatHeader";
import { ChatInput } from "./ChatInput";
import { MessageList } from "./MessageList";

type TokenPayload = { content: string };
type ErrorPayload = { message: string };

function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function ChatContainer() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);

  const sendToApi = useCallback(async (history: Message[]) => {
    const assistantId = newId();
    let assistantInserted = false;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });

      if (!res.ok || !res.body) {
        const reason =
          res.status === 0
            ? "네트워크 연결을 확인해주세요."
            : `요청 실패 (${res.status}). 잠시 후 다시 시도해주세요.`;
        appendErrorMessage(setMessages, reason);
        return;
      }

      // Insert empty assistant placeholder once we know the response is OK.
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

      for await (const ev of parseSseStream<TokenPayload | ErrorPayload>(res.body)) {
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
          const msg = (ev.data as ErrorPayload).message ?? "응답 생성 중 오류";
          appendErrorMessage(setMessages, msg);
          break;
        }
      }
    } catch (err) {
      const reason = err instanceof Error ? err.message : "응답을 받지 못했습니다.";
      // If we already inserted an assistant bubble with partial content, keep it
      // and append a separate error bubble so streamed content isn't lost.
      if (!assistantInserted) {
        appendErrorMessage(setMessages, reason);
      } else {
        appendErrorMessage(setMessages, reason);
      }
    } finally {
      setIsStreaming(false);
    }
  }, []);

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
      void sendToApi(nextHistory);
    },
    [messages, sendToApi],
  );

  const handleRetry = useCallback(() => {
    // Drop the most recent error bubble + any preceding empty/partial assistant
    // bubble that immediately follows the last user, then re-fetch from there.
    setMessages((prev) => {
      const lastUserIndex = findLastIndex(prev, (m) => m.role === "user");
      if (lastUserIndex === -1) return prev;
      const trimmed = prev.slice(0, lastUserIndex + 1);
      setIsStreaming(true);
      void sendToApi(trimmed);
      return trimmed;
    });
  }, [sendToApi]);

  return (
    <div className="flex h-dvh flex-col bg-brand-canvas text-brand-ink">
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
          <ChatInput onSubmit={handleSubmit} disabled={isStreaming} />
        </div>
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
