"use client";

import { CONTEXT_COLUMNS } from "@/config/contextColumns";
import type { ContextRow as ContextRowType } from "@/lib/types";

type Props = {
  row: ContextRowType;
  onChange: (key: string, value: string) => void;
  onDelete: () => void;
  canDelete: boolean;
};

export function ContextRow({ row, onChange, onDelete, canDelete }: Props) {
  return (
    <div className="grid grid-cols-[1fr_auto] items-start gap-xs">
      <div className="flex flex-col gap-xxs">
        {CONTEXT_COLUMNS.map((col) => {
          const value = row.values[col.key] ?? "";
          const showMissingBadge = col.required && value.trim().length === 0;
          return (
            <label key={col.key} className="block">
              <span className="block text-caption text-brand-muted mb-xxs">
                {col.label}
                {col.required && (
                  <span className="text-brand-error ml-xxs">*</span>
                )}
              </span>
              <div className="relative">
                <input
                  type="text"
                  value={value}
                  placeholder={col.placeholder}
                  onChange={(e) => onChange(col.key, e.target.value)}
                  className="w-full bg-brand-canvas text-brand-ink placeholder:text-brand-muted-soft font-sans text-body-sm rounded-md border border-brand-hairline px-sm py-[6px] focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/15 transition-colors"
                />
                {showMissingBadge && (
                  <span className="absolute right-sm top-1/2 -translate-y-1/2 text-caption text-brand-muted-soft pointer-events-none select-none">
                    값 없음
                  </span>
                )}
              </div>
            </label>
          );
        })}
      </div>
      <button
        type="button"
        onClick={onDelete}
        disabled={!canDelete}
        aria-label="행 삭제"
        title={canDelete ? "행 삭제" : "마지막 행은 삭제할 수 없습니다"}
        className="shrink-0 inline-flex items-center justify-center w-8 h-8 mt-[22px] rounded-full text-brand-muted hover:bg-brand-ink-translucent-04 hover:text-brand-error active:bg-brand-ink-translucent-04 disabled:text-brand-muted-soft disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-brand-muted-soft transition-colors"
      >
        <TrashIcon />
      </button>
    </div>
  );
}

function TrashIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
    </svg>
  );
}
