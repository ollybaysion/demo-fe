"use client";

import type { ContextRow, ContextValue } from "@/lib/types";
import { ContextTable } from "./ContextTable";
import type { ContextView } from "./useContextRows";

type Props = {
  open: boolean;
  rows: ContextRow[];
  view: ContextView;
  onViewChange: (view: ContextView) => void;
  onCellChange: (rowId: string, key: string, value: ContextValue) => void;
  onAdd: () => void;
  onDelete: (rowId: string) => void;
  onReset: () => void;
};

export function ContextPanel({
  open,
  rows,
  view,
  onViewChange,
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
        <header className="px-lg pt-lg pb-md border-b border-brand-hairline-soft flex items-center justify-between gap-sm">
          <h2 className="font-sans text-title-md text-brand-ink">
            설비 정보
          </h2>
          <ViewSwitcher view={view} onChange={onViewChange} />
        </header>
        <div className="flex-1 overflow-y-auto px-lg py-md">
          <ContextTable
            rows={rows}
            view={view}
            onCellChange={onCellChange}
            onAdd={onAdd}
            onDelete={onDelete}
            onReset={onReset}
          />
        </div>
      </div>
    </aside>
  );
}

function ViewSwitcher({
  view,
  onChange,
}: {
  view: ContextView;
  onChange: (v: ContextView) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="표시 방식"
      className="inline-flex items-center bg-brand-surface-card rounded-md p-[2px]"
    >
      <ViewOption
        label="칩"
        selected={view === "chips"}
        onClick={() => onChange("chips")}
      />
      <ViewOption
        label="목록"
        selected={view === "nested"}
        onClick={() => onChange("nested")}
      />
    </div>
  );
}

function ViewOption({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onClick}
      className={[
        "px-sm py-xxs rounded-sm text-caption transition-colors",
        selected
          ? "bg-brand-canvas text-brand-ink shadow-sm"
          : "text-brand-muted hover:text-brand-ink",
      ].join(" ")}
    >
      {label}
    </button>
  );
}
