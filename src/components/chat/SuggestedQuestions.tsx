"use client";

import { SUGGESTED_QUESTIONS } from "@/config/suggestedQuestions";

type Props = {
  onSelect: (text: string) => void;
  /**
   * chip 으로 표시할 질문 목록. 비면 `SUGGESTED_QUESTIONS` 사용 (#20 예시
   * 질문 — 빈 시작 화면용 default). #40 의 어시스턴트 추천 후속 질문은
   * 이 prop 으로 전달.
   */
  questions?: readonly string[];
  /** 빈 시작 화면 default 와 추천 후속을 SR 에 구분하기 위한 라벨. */
  ariaLabel?: string;
};

export function SuggestedQuestions({
  onSelect,
  questions = SUGGESTED_QUESTIONS,
  ariaLabel = "예시 질문",
}: Props) {
  if (questions.length === 0) return null;

  return (
    <ul
      aria-label={ariaLabel}
      className="flex flex-wrap gap-xs mb-sm"
    >
      {questions.map((q) => (
        <li key={q}>
          <button
            type="button"
            onClick={() => onSelect(q)}
            className="text-body-sm text-brand-ink bg-brand-surface-card hover:bg-brand-primary hover:text-brand-on-primary active:bg-brand-primary-active rounded-pill px-md py-xs focus:outline-none focus:ring-2 focus:ring-brand-primary/15 transition-colors text-left"
          >
            {q}
          </button>
        </li>
      ))}
    </ul>
  );
}
