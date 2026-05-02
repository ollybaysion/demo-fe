"use client";

import type { ContextRow, ContextValue } from "@/lib/types";
import { ContextTable } from "./ContextTable";

type Props = {
  open: boolean;
  rows: ContextRow[];
  occurredAt: string;
  onOccurredAtChange: (next: string) => void;
  onCellChange: (rowId: string, key: string, value: ContextValue) => void;
  onAdd: () => void;
  onDelete: (rowId: string) => void;
  onReset: () => void;
};

export function ContextPanel({
  open,
  rows,
  occurredAt,
  onOccurredAtChange,
  onCellChange,
  onAdd,
  onDelete,
  onReset,
}: Props) {
  return (
    <aside
      aria-label="설비 정보 입력 패널"
      aria-hidden={!open}
      className={[
        "shrink-0 overflow-hidden",
        "transition-[width] duration-200 ease-out",
        open ? "w-[320px]" : "w-0",
        "border-l border-brand-hairline bg-brand-canvas",
      ].join(" ")}
    >
      <div className="w-[320px] h-full flex flex-col">
        <header className="px-lg pt-lg pb-md border-b border-brand-hairline-soft">
          <h2 className="font-sans text-title-md text-brand-ink">설비 정보</h2>
        </header>
        <div className="flex-1 overflow-y-auto">
          <div className="px-lg py-md">
            <ContextTable
              rows={rows}
              onCellChange={onCellChange}
              onAdd={onAdd}
              onDelete={onDelete}
              onReset={onReset}
            />
          </div>
          <OccurredAtSection
            value={occurredAt}
            onChange={onOccurredAtChange}
          />
        </div>
      </div>
    </aside>
  );
}

function OccurredAtSection({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <div className="px-lg py-md border-t border-brand-hairline-soft">
      <label className="block">
        <span className="block text-caption text-brand-muted mb-xxs">
          발생 시간
        </span>
        <div className="flex items-center gap-xs">
          <input
            type="datetime-local"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="flex-1 bg-brand-canvas text-brand-ink font-sans text-body-sm rounded-md border border-brand-hairline px-sm py-[6px] focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/15 transition-colors"
          />
          {value && (
            <button
              type="button"
              onClick={() => onChange("")}
              aria-label="발생 시간 비우기"
              title="발생 시간 비우기"
              className="shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-full text-brand-muted hover:text-brand-ink hover:bg-brand-ink-translucent-04 focus:outline-none focus:ring-2 focus:ring-brand-primary/15 transition-colors"
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
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>
      </label>
    </div>
  );
}
