"use client";

import { CONTEXT_COLUMNS, type ContextColumn } from "@/config/contextColumns";
import type { ContextRow as ContextRowType, ContextValue } from "@/lib/types";

type Props = {
  row: ContextRowType;
  onChange: (key: string, value: ContextValue) => void;
  onDelete: () => void;
  canDelete: boolean;
};

export function ContextRowNested({
  row,
  onChange,
  onDelete,
  canDelete,
}: Props) {
  const equipmentCol = CONTEXT_COLUMNS.find(
    (c) => !c.multi && c.required,
  );
  const childCols = CONTEXT_COLUMNS.filter((c) => c.multi);

  const equipmentValue =
    equipmentCol && typeof row.values[equipmentCol.key] === "string"
      ? (row.values[equipmentCol.key] as string)
      : "";

  return (
    <div className="rounded-md border border-brand-hairline bg-brand-canvas">
      {/* Equipment header */}
      <div className="flex items-center gap-sm p-md border-b border-brand-hairline-soft">
        <span className="text-caption text-brand-muted shrink-0">
          {equipmentCol?.label}
          {equipmentCol?.required && (
            <span className="text-brand-error ml-xxs">*</span>
          )}
        </span>
        <input
          type="text"
          value={equipmentValue}
          placeholder={equipmentCol?.placeholder}
          onChange={(e) =>
            equipmentCol && onChange(equipmentCol.key, e.target.value)
          }
          className="flex-1 bg-transparent text-brand-ink placeholder:text-brand-muted-soft font-sans text-body-sm border-b border-transparent focus:border-brand-primary focus:outline-none transition-colors"
        />
        <button
          type="button"
          onClick={onDelete}
          disabled={!canDelete}
          aria-label="이 설비 행 삭제"
          title={canDelete ? "이 설비 행 삭제" : "마지막 행은 삭제할 수 없습니다"}
          className="shrink-0 text-caption text-brand-muted hover:text-brand-error disabled:text-brand-muted-soft disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-brand-primary/15 rounded-xs px-xxs py-xxs transition-colors"
        >
          삭제
        </button>
      </div>

      {/* Child columns (multi) */}
      <div className="p-md flex flex-col gap-md">
        {childCols.map((col) => (
          <ChildList
            key={col.key}
            col={col}
            items={
              Array.isArray(row.values[col.key])
                ? (row.values[col.key] as string[])
                : []
            }
            onChange={(next) => onChange(col.key, next)}
          />
        ))}
      </div>
    </div>
  );
}

function ChildList({
  col,
  items,
  onChange,
}: {
  col: ContextColumn;
  items: string[];
  onChange: (next: string[]) => void;
}) {
  function update(i: number, v: string) {
    const next = items.slice();
    next[i] = v;
    onChange(next);
  }
  function remove(i: number) {
    onChange(items.filter((_, j) => j !== i));
  }
  function add() {
    onChange([...items, ""]);
  }

  return (
    <div>
      <p className="text-caption text-brand-muted mb-xxs">{col.label}</p>
      <ul className="flex flex-col gap-xxs">
        {items.length === 0 && (
          <li className="text-body-sm text-brand-muted-soft pl-md">
            (없음)
          </li>
        )}
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-xs pl-md">
            <span
              aria-hidden
              className="w-1 h-1 rounded-full bg-brand-muted-soft shrink-0"
            />
            <input
              type="text"
              value={item}
              placeholder={col.placeholder}
              onChange={(e) => update(i, e.target.value)}
              className="flex-1 bg-transparent text-brand-ink placeholder:text-brand-muted-soft font-sans text-body-sm border-b border-transparent focus:border-brand-primary focus:outline-none transition-colors"
            />
            <button
              type="button"
              onClick={() => remove(i)}
              aria-label={`${col.label} 항목 삭제`}
              className="shrink-0 inline-flex items-center justify-center w-5 h-5 rounded-full text-brand-muted hover:text-brand-error focus:outline-none focus:ring-1 focus:ring-brand-primary/30"
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
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={add}
        className="mt-xxs ml-md inline-flex items-center gap-xxs text-caption text-brand-primary hover:text-brand-primary-active focus:outline-none focus:ring-2 focus:ring-brand-primary/15 rounded-xs px-xxs py-xxs"
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
        {col.label} 추가
      </button>
    </div>
  );
}
