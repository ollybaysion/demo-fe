"use client";

import { useEffect, useRef } from "react";
import type { Message } from "@/lib/types";
import { ChatMessage } from "./message/ChatMessage";
import { TypingDots } from "./TypingDots";

type Props = {
  messages: Message[];
  isStreaming: boolean;
  /**
   * 재생성 / 에러 재시도 트리거. 최근 user 메시지까지 잘라낸 뒤
   * 다시 API 호출. 마지막 assistant 와 마지막 error 중 더 최근 것에만
   * 부착되어 노출됨.
   */
  onRegenerate?: () => void;
};

export function MessageList({ messages, isStreaming, onRegenerate }: Props) {
  const endRef = useRef<HTMLDivElement>(null);

  // Scroll on message-count or streaming-state changes (not on every token append).
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, isStreaming]);

  const last = messages.at(-1);
  const showLoadingBubble = isStreaming && (!last || last.role === "user");
  // 재생성 버튼은 마지막 assistant 또는 마지막 error 중 더 최근 인덱스에만.
  // 스트리밍 중에는 표시하지 않음.
  const lastAssistantIndex = findLastIndex(
    messages,
    (m) => m.role === "assistant",
  );
  const lastErrorIndex = findLastIndex(messages, (m) => m.role === "error");
  const regenerateIndex = isStreaming
    ? -1
    : Math.max(lastAssistantIndex, lastErrorIndex);

  return (
    <ol role="log" aria-live="polite" className="space-y-md">
      {messages.map((m, i) => (
        <ChatMessage
          key={m.id}
          message={m}
          streaming={
            isStreaming && i === messages.length - 1 && m.role === "assistant"
          }
          onRegenerate={i === regenerateIndex ? onRegenerate : undefined}
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
