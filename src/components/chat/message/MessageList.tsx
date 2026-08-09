"use client";

import { Fragment, useEffect, useRef } from "react";
import type { Message } from "@/lib/types";
import { ChatMessage } from "./ChatMessage";
import { ChoiceCard } from "./ChoiceCard";
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
  /** 선택 카드 확정 — (그 카드를 낸 메시지 id, question, 고른 label 들). */
  onChoiceSubmit?: (messageId: string, question: string, values: string[]) => void;
  /** 선택 카드 "답변 없이 넘어가기" — (그 카드를 낸 메시지 id, question). */
  onChoiceSkip?: (messageId: string, question: string) => void;
};

export function MessageList({
  messages,
  isStreaming,
  judging = false,
  onRegenerate,
  onChoiceSubmit,
  onChoiceSkip,
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
      {messages.map((m, i) => {
        // 선택 카드 동결 — 회신 기록이 있거나, 이 메시지 뒤에 다른 user 발화가
        // 있으면(카드에 답하지 않고 지나갔거나, 카드 자신의 회신으로 뒤에 붙은
        // user 메시지) 전부 비활성화한다. 카드 자신의 회신도 뒤에 user 메시지를
        // 남기므로 이 한 조건이 두 경우를 함께 잡는다.
        const hasLaterUser = m.choiceRequests?.length
          ? messages.slice(i + 1).some((mm) => mm.role === "user")
          : false;
        return (
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
            {m.choiceRequests?.map((req) => (
              <li key={`${m.id}:${req.question}`} className="flex justify-start">
                <ChoiceCard
                  request={req}
                  reply={m.choiceReplies?.[req.question]}
                  frozen={hasLaterUser || !!m.choiceReplies?.[req.question]}
                  onSubmit={(question, values) =>
                    onChoiceSubmit?.(m.id, question, values)
                  }
                  onSkip={(question) => onChoiceSkip?.(m.id, question)}
                />
              </li>
            ))}
          </Fragment>
        );
      })}
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
