"use client";

import type { ScopeItem } from "@/lib/query-scope";

/** 드래그 페이로드의 MIME — 다른 드래그(파일 등)와 섞이지 않게 전용 타입. */
export const SCOPE_DRAG_TYPE = "application/x-fdc-scope-item";

/**
 * 이 요소를 질의 대상 트레이로 끌 수 있게 하는 props — 카드·줄에 펼쳐 붙인다.
 *
 * <p>드래그는 **가속기**다. 같은 일을 카드/줄을 누르는 것으로도 하며, 그쪽이
 * 기본이다 — 우측 패널은 스크롤 컨테이너이고 트레이까지는 화면을 대각선으로
 * 가로질러야 해서, 드래그만 두면 닿기 어렵다.
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
