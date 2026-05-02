"use client";

import { SUGGESTED_QUESTIONS } from "@/config/suggestedQuestions";

type Props = {
  onSelect: (text: string) => void;
};

export function SuggestedQuestions({ onSelect }: Props) {
  if (SUGGESTED_QUESTIONS.length === 0) return null;

  return (
    <ul
      aria-label="예시 질문"
      className="flex flex-wrap gap-xs mb-sm"
    >
      {SUGGESTED_QUESTIONS.map((q) => (
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
