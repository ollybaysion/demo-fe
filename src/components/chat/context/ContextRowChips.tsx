"use client";

import { type KeyboardEvent, useState } from "react";
import { CONTEXT_COLUMNS } from "@/config/contextColumns";
import type { ContextRow as ContextRowType, ContextValue } from "@/lib/types";

type Props = {
  row: ContextRowType;
  onChange: (key: string, value: ContextValue) => void;
  onDelete: () => void;
  canDelete: boolean;
};

export function ContextRowChips({
  row,
  onChange,
  onDelete,
  canDelete,
}: Props) {
  return (
    <div className="rounded-md border border-brand-hairline p-md flex flex-col gap-sm bg-brand-canvas">
      {CONTEXT_COLUMNS.map((col) => {
        const v = row.values[col.key];
        if (col.multi) {
          const chips = Array.isArray(v) ? v : [];
          return (
            <ChipCell
              key={col.key}
              label={col.label}
              chips={chips}
              placeholder={col.placeholder}
              onChange={(next) => onChange(col.key, next)}
            />
          );
        }
        const text = typeof v === "string" ? v : "";
        return (
          <SingleCell
            key={col.key}
            label={col.label}
            required={col.required}
            value={text}
            placeholder={col.placeholder}
            onChange={(next) => onChange(col.key, next)}
          />
        );
      })}
      <div className="flex justify-end pt-xxs">
        <button
          type="button"
          onClick={onDelete}
          disabled={!canDelete}
          aria-label="이 설비 행 삭제"
          title={canDelete ? "이 설비 행 삭제" : "마지막 행은 삭제할 수 없습니다"}
          className="text-caption text-brand-muted hover:text-brand-error disabled:text-brand-muted-soft disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-brand-primary/15 rounded-xs px-xxs py-xxs transition-colors"
        >
          삭제
        </button>
      </div>
    </div>
  );
}

function SingleCell({
  label,
  required,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  required?: boolean;
  value: string;
  placeholder?: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="block text-caption text-brand-muted mb-xxs">
        {label}
        {required && <span className="text-brand-error ml-xxs">*</span>}
      </span>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-brand-canvas text-brand-ink placeholder:text-brand-muted-soft font-sans text-body-sm rounded-md border border-brand-hairline px-sm py-[6px] focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/15 transition-colors"
      />
    </label>
  );
}

function ChipCell({
  label,
  chips,
  placeholder,
  onChange,
}: {
  label: string;
  chips: string[];
  placeholder?: string;
  onChange: (next: string[]) => void;
}) {
  const [draft, setDraft] = useState("");

  function commit() {
    const trimmed = draft.trim();
    if (!trimmed) return;
    if (!chips.includes(trimmed)) {
      onChange([...chips, trimmed]);
    }
    setDraft("");
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.nativeEvent.isComposing) return;
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commit();
    } else if (
      e.key === "Backspace" &&
      draft.length === 0 &&
      chips.length > 0
    ) {
      onChange(chips.slice(0, -1));
    }
  }

  function removeChip(i: number) {
    onChange(chips.filter((_, j) => j !== i));
  }

  return (
    <label className="block">
      <span className="block text-caption text-brand-muted mb-xxs">
        {label}
      </span>
      <div className="flex flex-wrap gap-xxs items-center rounded-md border border-brand-hairline bg-brand-canvas px-xs py-xxs focus-within:border-brand-primary focus-within:ring-2 focus-within:ring-brand-primary/15 transition-colors min-h-[36px]">
        {chips.map((chip, i) => (
          <span
            key={`${chip}-${i}`}
            className="inline-flex items-center gap-xxs bg-brand-surface-card text-brand-ink text-caption rounded-pill pl-sm pr-xxs py-xxs"
          >
            {chip}
            <button
              type="button"
              onClick={() => removeChip(i)}
              aria-label={`${chip} 삭제`}
              className="inline-flex items-center justify-center w-4 h-4 rounded-full text-brand-muted hover:text-brand-error focus:outline-none focus:ring-1 focus:ring-brand-primary/30"
            >
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </span>
        ))}
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={commit}
          placeholder={chips.length === 0 ? placeholder : ""}
          className="flex-1 min-w-[80px] bg-transparent text-brand-ink placeholder:text-brand-muted-soft font-sans text-body-sm py-[2px] focus:outline-none"
        />
      </div>
      {chips.length > 0 && (
        <span
          className="block text-brand-muted-soft mt-xxs"
          style={{ fontSize: "11px" }}
        >
          Enter / 쉼표로 추가, Backspace로 마지막 항목 삭제
        </span>
      )}
    </label>
  );
}
