"use client";

import { Fragment, useEffect, useRef } from "react";
import type { Message } from "@/lib/types";
import { ChatMessage } from "./ChatMessage";
import { TypingDots } from "./TypingDots";

type Props = {
  messages: Message[];
  isStreaming: boolean;
  /**
   * 판정(`/chat/data`)이 진행 중 — 결과 등록 직후 종결 서술이 올 수 있는 구간.
   * 서술 메시지는 첫 token 에서야 생기므로(#163 — 빈 풍선 금지), 그때까지의
   * 공백을 이 플래그가 생각 중 표시로 메운다.
   */
  judging?: boolean;
  /**
   * 재생성 / 에러 재시도 트리거. 최근 user 메시지까지 잘라낸 뒤
   * 다시 API 호출. 마지막 assistant 와 마지막 error 중 더 최근 것에만
   * 부착되어 노출됨.
   */
  onRegenerate?: () => void;
};

export function MessageList({
  messages,
  isStreaming,
  judging = false,
  onRegenerate,
}: Props) {
  const endRef = useRef<HTMLDivElement>(null);

  // Scroll on message-count or streaming-state changes (not on every token append).
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, isStreaming, judging]);

  const last = messages.at(-1);
  // 판정 대기 — 서술 메시지(judge_)가 아직 안 생겼으면 생각 중 표시.
  // 첫 token 이 메시지를 만들면 그 풍선이 자리를 이어받는다.
  const judgeWaiting = judging && !last?.id.startsWith("judge_");
  const showLoadingBubble =
    (isStreaming && (!last || last.role === "user")) || judgeWaiting;
  // 재생성 버튼은 마지막 assistant 또는 마지막 error 중 더 최근 인덱스에만.
  // 스트리밍 중에는 표시하지 않음.
  const lastAssistantIndex = findLastIndex(
    messages,
    (m) => m.role === "assistant",
  );
  const lastErrorIndex = findLastIndex(messages, (m) => m.role === "error");
  let regenerateIndex = isStreaming || judging
    ? -1
    : Math.max(lastAssistantIndex, lastErrorIndex);
  // 판정 서술(`judge_`)은 user 발화 없이 생긴 답이다 — 재생성으로 되돌릴 질문이
  // 없으므로 버튼을 주지 않는다(#163).
  if (regenerateIndex >= 0 && messages[regenerateIndex].id.startsWith("judge_")) {
    regenerateIndex = -1;
  }

  return (
    <ol role="log" aria-live="polite" className="space-y-md">
      {messages.map((m, i) => (
        // ChatMessage 가 <li> 를 루트로 그리므로 감싸지 않고 형제로 잇는다.
        <Fragment key={m.id}>
          <ChatMessage
            message={m}
            streaming={
              i === messages.length - 1 &&
              ((isStreaming && m.role === "assistant") ||
                (judging && m.id.startsWith("judge_")))
            }
            onRegenerate={i === regenerateIndex ? onRegenerate : undefined}
          />
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
