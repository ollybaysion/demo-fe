"use client";

import { useEffect, useRef } from "react";
import type { Message } from "@/lib/types";
import { ChatMessage } from "./ChatMessage";
import { TypingDots } from "./TypingDots";

type Props = {
  messages: Message[];
  isStreaming: boolean;
};

export function MessageList({ messages, isStreaming }: Props) {
  const endRef = useRef<HTMLDivElement>(null);

  // Scroll on message-count or streaming-state changes (not on every token append).
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, isStreaming]);

  const last = messages.at(-1);
  const showLoadingBubble = isStreaming && (!last || last.role === "user");

  return (
    <ol role="log" aria-live="polite" className="space-y-md">
      {messages.map((m, i) => (
        <ChatMessage
          key={m.id}
          message={m}
          streaming={
            isStreaming && i === messages.length - 1 && m.role === "assistant"
          }
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
