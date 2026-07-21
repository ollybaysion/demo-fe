"use client";

import { Fragment, useEffect, useRef } from "react";
import type { Message } from "@/lib/types";
import { ChatMessage } from "./ChatMessage";
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
  /**
   * 데이터 요청 카드 렌더러. 요청은 **마지막 어시스턴트 메시지에만** 붙는다 —
   * 지난 턴의 요청은 이미 채워졌거나 사용자가 지나간 것이라, 그대로 남겨 두면
   * 대화가 낡은 요구로 뒤덮인다.
   */
  renderDataRequests?: (message: Message) => React.ReactNode;
};

export function MessageList({
  messages,
  isStreaming,
  onRegenerate,
  renderDataRequests,
}: Props) {
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
        // ChatMessage 가 <li> 를 루트로 그리므로 감싸지 않고 형제로 잇는다.
        <Fragment key={m.id}>
          <ChatMessage
            message={m}
            streaming={
              isStreaming && i === messages.length - 1 && m.role === "assistant"
            }
            onRegenerate={i === regenerateIndex ? onRegenerate : undefined}
          />
          {i === lastAssistantIndex &&
            m.dataRequests &&
            m.dataRequests.length > 0 && (
              <li className="flex justify-start">
                <div className="max-w-[80%] flex flex-col gap-xs">
                  {renderDataRequests?.(m)}
                </div>
              </li>
            )}
        </Fragment>
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
