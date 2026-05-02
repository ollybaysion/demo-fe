"use client";

import { useCallback, useState } from "react";
import type { Message } from "@/lib/types";
import { ChatEmptyState } from "./ChatEmptyState";
import { ChatHeader } from "./ChatHeader";
import { ChatInput } from "./ChatInput";
import { MessageList } from "./MessageList";

// Hardcoded placeholder while #6 (mock SSE) is not yet merged.
const HARDCODED_RESPONSE =
  "안녕하세요. 아직 백엔드가 연결되지 않아 임시 mock 응답을 드립니다. 다음 PR(#6)에서 SSE 스트리밍 라우트가 들어가면 실시간 응답으로 교체됩니다.";

const TOKEN_INTERVAL_MS = 35;
const TYPING_DOTS_DELAY_MS = 600;

function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function ChatContainer() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);

  const handleSubmit = useCallback((text: string) => {
    const userMessage: Message = {
      id: newId(),
      role: "user",
      content: text,
      createdAt: Date.now(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsStreaming(true);

    const assistantId = newId();
    const characters = [...HARDCODED_RESPONSE];
    let index = 0;
    let buffer = "";

    // Phase 1: typing dots delay before first token
    const startDelayId = window.setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: assistantId,
          role: "assistant",
          content: "",
          createdAt: Date.now(),
        },
      ]);

      // Phase 2: stream characters
      const intervalId = window.setInterval(() => {
        if (index >= characters.length) {
          window.clearInterval(intervalId);
          setIsStreaming(false);
          return;
        }
        buffer += characters[index++];
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: buffer } : m,
          ),
        );
      }, TOKEN_INTERVAL_MS);
    }, TYPING_DOTS_DELAY_MS);

    return () => {
      window.clearTimeout(startDelayId);
    };
  }, []);

  return (
    <div className="flex h-dvh flex-col bg-brand-canvas text-brand-ink">
      <ChatHeader />

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-chat-narrow px-lg py-xl">
          {messages.length === 0 ? (
            <ChatEmptyState />
          ) : (
            <MessageList messages={messages} isStreaming={isStreaming} />
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
