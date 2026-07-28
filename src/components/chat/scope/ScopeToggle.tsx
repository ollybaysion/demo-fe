"use client";

import type { ScopeItem } from "@/lib/query-scope";
import { scopeLabel } from "@/lib/query-scope";
import { SCOPE_DRAG_TYPE } from "./ScopeTray";

/**
 * 담기 토글 — 설비 카드와 분석 줄에 같은 모양으로 붙는다.
 *
 * <p>기호가 `+` 가 아닌 이유: 이 패널의 `+` 는 이미 **만들기**를 뜻한다(새 분석,
 * 이 설비에 분석 추가). 담기는 만들기가 아니라 **고르기**라, 같은 기호를 쓰면
 * 누르기 전에는 무슨 일이 일어날지 알 수 없다. 체크는 고른 상태를 그대로 말한다.
 */
export function ScopeToggle({
  item,
  on,
  onToggle,
  size = "md",
}: {
  item: ScopeItem;
  on: boolean;
  onToggle: () => void;
  size?: "sm" | "md";
}) {
  const box = size === "sm" ? "w-[20px] h-[20px]" : "w-[24px] h-[24px]";
  return (
    <button
      type="button"
      onClick={(e) => {
        // 카드 본문·줄 자체에도 클릭 동작이 있다 — 담기가 그걸 깨우지 않게.
        e.stopPropagation();
        onToggle();
      }}
      aria-pressed={on}
      aria-label={`${scopeLabel(item)} ${on ? "대상에서 빼기" : "질의 대상에 담기"}`}
      title={on ? "질의 대상에서 빼기" : "질의 대상에 담기"}
      className={[
        "shrink-0 inline-flex items-center justify-center rounded-md border transition-colors",
        box,
        on
          ? "border-brand-primary bg-brand-primary text-brand-on-primary"
          : "border-brand-hairline bg-brand-canvas text-brand-muted-soft hover:text-brand-primary hover:border-brand-primary/40",
        "focus:outline-none focus:ring-2 focus:ring-brand-primary/15",
      ].join(" ")}
    >
      <CheckIcon size={size === "sm" ? 11 : 13} />
    </button>
  );
}

/**
 * 이 요소를 트레이로 끌 수 있게 하는 props — 카드/줄에 펼쳐 붙인다.
 * 드래그는 가속기다: 같은 일을 {@link ScopeToggle} 이 클릭 한 번으로도 한다.
 */
export function scopeDragProps(item: ScopeItem) {
  return {
    draggable: true,
    onDragStart: (e: React.DragEvent) => {
      e.dataTransfer.setData(SCOPE_DRAG_TYPE, JSON.stringify(item));
      e.dataTransfer.effectAllowed = "copy";
    },
  };
}

function CheckIcon({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
