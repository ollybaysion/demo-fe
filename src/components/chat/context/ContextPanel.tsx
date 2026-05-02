"use client";

import type { ContextRow } from "@/lib/types";
import { ContextTable } from "./ContextTable";

type Props = {
  open: boolean;
  rows: ContextRow[];
  onCellChange: (rowId: string, key: string, value: string) => void;
  onAdd: () => void;
  onDelete: (rowId: string) => void;
  onReset: () => void;
};

export function ContextPanel({
  open,
  rows,
  onCellChange,
  onAdd,
  onDelete,
  onReset,
}: Props) {
  return (
    <aside
      aria-label="도메인 컨텍스트 입력 패널"
      aria-hidden={!open}
      className={[
        // Push layout: panel takes its own column in the parent flex row.
        // Width is animated 0 <-> 320px so chat area gets pushed.
        "shrink-0 overflow-hidden",
        "transition-[width] duration-200 ease-out",
        open ? "w-[320px]" : "w-0",
        "border-l border-brand-hairline bg-brand-canvas",
      ].join(" ")}
    >
      <div className="w-[320px] h-full flex flex-col">
        <header className="px-lg pt-lg pb-md border-b border-brand-hairline-soft">
          <h2 className="font-sans text-title-md text-brand-ink">
            도메인 컨텍스트
          </h2>
          <p className="mt-xxs text-body-sm text-brand-muted">
            모든 메시지에 자동으로 함께 전송됩니다.
          </p>
        </header>
        <div className="flex-1 overflow-y-auto px-lg py-md">
          <ContextTable
            rows={rows}
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
