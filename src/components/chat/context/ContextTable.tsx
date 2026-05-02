"use client";

import type { ContextRow as ContextRowType, ContextValue } from "@/lib/types";
import { ContextRowNested } from "./ContextRowNested";

type Props = {
  rows: ContextRowType[];
  onCellChange: (rowId: string, key: string, value: ContextValue) => void;
  onAdd: () => void;
  onDelete: (rowId: string) => void;
  onReset: () => void;
};

export function ContextTable({
  rows,
  onCellChange,
  onAdd,
  onDelete,
  onReset,
}: Props) {
  return (
    <div className="flex flex-col gap-md">
      <div className="flex flex-col gap-md">
        {rows.map((row) => (
          <ContextRowNested
            key={row.id}
            row={row}
            onChange={(key, value) => onCellChange(row.id, key, value)}
            onDelete={() => onDelete(row.id)}
            canDelete={rows.length > 1}
          />
        ))}
      </div>
      <div className="flex items-center justify-between gap-sm pt-sm border-t border-brand-hairline-soft">
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex items-center gap-xxs text-body-sm text-brand-primary hover:text-brand-primary-active focus:outline-none focus:ring-2 focus:ring-brand-primary/15 rounded-xs px-xxs py-xxs"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
          설비 추가
        </button>
        <button
          type="button"
          onClick={onReset}
          className="text-body-sm text-brand-muted hover:text-brand-ink focus:outline-none focus:ring-2 focus:ring-brand-primary/15 rounded-xs px-xxs py-xxs"
          title="현재 대화의 설비 정보를 모두 비웁니다"
        >
          초기화
        </button>
      </div>
    </div>
  );
}
