"use client";

import type { ReactNode } from "react";
import type { ContextRow, ContextValue } from "@/lib/types";
import { ContextTable } from "./ContextTable";
import type { TimeRange } from "./useContextRows";

type Props = {
  open: boolean;
  rows: ContextRow[];
  timeRange: TimeRange;
  onStartChange: (next: string) => void;
  onEndChange: (next: string) => void;
  onCellChange: (rowId: string, key: string, value: ContextValue) => void;
  onAdd: () => void;
  onDelete: (rowId: string) => void;
  onReset: () => void;
};

export function ContextPanel({
  open,
  rows,
  timeRange,
  onStartChange,
  onEndChange,
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
        <div className="flex-1 overflow-y-auto">
          <Section title="설비 정보">
            <ContextTable
              rows={rows}
              onCellChange={onCellChange}
              onAdd={onAdd}
              onDelete={onDelete}
              onReset={onReset}
            />
          </Section>
          <Section title="발생 시간">
            <TimeRangeFields
              range={timeRange}
              onStartChange={onStartChange}
              onEndChange={onEndChange}
            />
          </Section>
        </div>
      </div>
    </aside>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="px-lg pt-lg pb-md border-b border-brand-hairline-soft last:border-b-0">
      <h2 className="font-sans text-title-md text-brand-ink mb-md">{title}</h2>
      {children}
    </section>
  );
}

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

const DURATION_PRESETS: Array<{ label: string; ms: number }> = [
  { label: "30분", ms: 30 * MINUTE_MS },
  { label: "1시간", ms: 1 * HOUR_MS },
  { label: "3시간", ms: 3 * HOUR_MS },
  { label: "6시간", ms: 6 * HOUR_MS },
  { label: "12시간", ms: 12 * HOUR_MS },
  { label: "하루", ms: 1 * DAY_MS },
  { label: "1주일", ms: 7 * DAY_MS },
];

function TimeRangeFields({
  range,
  onStartChange,
  onEndChange,
}: {
  range: TimeRange;
  onStartChange: (v: string) => void;
  onEndChange: (v: string) => void;
}) {
  function applyDuration(durationMs: number) {
    // datetime-local strings are interpreted as local time by `new Date()`.
    // If start is empty/invalid, fall back to "now" and fill start as well
    // so the user can see what anchor was used.
    const parsed = parseDatetimeLocal(range.start);
    const startDate = parsed ?? new Date();
    const endDate = new Date(startDate.getTime() + durationMs);

    if (!parsed) {
      onStartChange(formatDatetimeLocal(startDate));
    }
    onEndChange(formatDatetimeLocal(endDate));
  }

  return (
    <div className="flex flex-col gap-sm">
      <TimeField label="시작" value={range.start} onChange={onStartChange} />
      <TimeField label="종료" value={range.end} onChange={onEndChange} />
      <div className="flex flex-wrap gap-xxs">
        {DURATION_PRESETS.map((p) => (
          <DurationChip
            key={p.label}
            label={p.label}
            onClick={() => applyDuration(p.ms)}
          />
        ))}
      </div>
    </div>
  );
}

function DurationChip({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-caption text-brand-ink bg-brand-surface-card hover:bg-brand-primary hover:text-brand-on-primary active:bg-brand-primary-active rounded-pill px-sm py-xxs focus:outline-none focus:ring-2 focus:ring-brand-primary/15 transition-colors"
      title={`종료 시간을 시작 시간 + ${label}로 설정`}
    >
      {label}
    </button>
  );
}

function parseDatetimeLocal(s: string): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatDatetimeLocal(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

function TimeField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="block text-caption text-brand-muted mb-xxs">
        {label}
      </span>
      <div className="flex items-center gap-xs">
        <input
          type="datetime-local"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          // min-w-0 lets the flex item shrink below the browser's
          // intrinsic min-width for datetime-local, keeping the
          // clear (×) button in view inside a 320px-wide panel.
          className="flex-1 min-w-0 bg-brand-canvas text-brand-ink font-sans text-body-sm rounded-md border border-brand-hairline px-sm py-[6px] focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/15 transition-colors"
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            aria-label={`${label} 시간 비우기`}
            title={`${label} 시간 비우기`}
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
  );
}
