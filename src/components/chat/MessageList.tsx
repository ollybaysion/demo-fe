"use client";

import { useEffect, useRef } from "react";
import type { Message } from "@/lib/types";
import { ChatMessage } from "./ChatMessage";
import { TypingDots } from "./TypingDots";

type Props = {
  messages: Message[];
  isStreaming: boolean;
  onRetry?: () => void;
};

export function MessageList({ messages, isStreaming, onRetry }: Props) {
  const endRef = useRef<HTMLDivElement>(null);

  // Scroll on message-count or streaming-state changes (not on every token append).
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, isStreaming]);

  const last = messages.at(-1);
  const showLoadingBubble = isStreaming && (!last || last.role === "user");
  const lastErrorIndex = findLastIndex(messages, (m) => m.role === "error");

  return (
    <ol role="log" aria-live="polite" className="space-y-md">
      {messages.map((m, i) => (
        <ChatMessage
          key={m.id}
          message={m}
          streaming={
            isStreaming && i === messages.length - 1 && m.role === "assistant"
          }
          onRetry={i === lastErrorIndex ? onRetry : undefined}
        />
      ))}
      {showLoadingBubble && (
        <li className="flex justify-start">
          <div
            aria-busy
            className="rounded-lg px-md py-sm bg-brand-surface-card"
          >
            <TypingDots />
          </div>
        </li>
      )}
      <div ref={endRef} />
    </ol>
  );
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
