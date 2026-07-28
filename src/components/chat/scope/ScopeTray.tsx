"use client";

import { useState } from "react";
import {
  type ScopeItem,
  scopeKey,
  scopeLabel,
} from "@/lib/query-scope";

/** 드래그 페이로드의 MIME — 다른 드래그(파일 등)와 섞이지 않게 전용 타입. */
export const SCOPE_DRAG_TYPE = "application/x-fdc-scope-item";

/**
 * 질의 대상 트레이 — 입력창 **바로 위**.
 *
 * 자리가 곧 의미다: 질문을 쓰는 칸 위에 있는 것이 이 질문의 대상이다. 패널 상단이나
 * 헤더에 두면 "담긴 목록"으로는 읽혀도 "이 질문의 대상"으로는 안 읽힌다.
 *
 * <p>빈 상태의 문구가 곧 드래그 어포던스다 — 끌 수 있다는 건 보이지 않으므로,
 * 놓을 자리가 스스로 말해야 한다. 다만 드래그는 **가속기**일 뿐이라 카드 쪽에
 * 담기 버튼이 따로 있다(패널은 스크롤 컨테이너고 카드마다 클릭 동작이 있어서
 * 드래그만으로는 닿기 어렵다).
 */
export function ScopeTray({
  items,
  onRemove,
  onDropItem,
}: {
  items: ScopeItem[];
  onRemove: (item: ScopeItem) => void;
  /** 트레이에 놓였다 — 흡수 규칙은 호출자(스코프 상태)가 적용한다. */
  onDropItem: (item: ScopeItem) => void;
}) {
  const [over, setOver] = useState(false);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setOver(false);
    const raw = e.dataTransfer.getData(SCOPE_DRAG_TYPE);
    if (!raw) return;
    // 드래그 페이로드는 외부에서 온 문자열이다 — 깨져 있으면 조용히 무시한다
    // (놓는 동작 하나 때문에 화면이 죽을 이유는 없다).
    try {
      onDropItem(JSON.parse(raw) as ScopeItem);
    } catch {
      // 무시
    }
  }

  return (
    <div
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes(SCOPE_DRAG_TYPE)) return;
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={handleDrop}
      aria-label="질의 대상"
      className={[
        "mb-xs flex items-center gap-sm rounded-lg px-sm py-xs min-h-[52px] transition-colors",
        over
          ? "border border-brand-primary bg-brand-primary/5 ring-4 ring-brand-primary/10"
          : items.length > 0
            ? "border border-brand-hairline"
            : "border border-dashed border-brand-hairline",
      ].join(" ")}
    >
      <span className="shrink-0 text-[11px] font-medium tracking-wide text-brand-muted-soft">
        질의 대상
      </span>
      {items.length === 0 ? (
        <span
          className={[
            "text-caption",
            over ? "text-brand-primary" : "text-brand-muted-soft",
          ].join(" ")}
        >
          {over
            ? "여기에 놓기"
            : "설비 카드를 여기로 끌어다 놓으세요 — 담긴 설비에 대해 질의합니다"}
        </span>
      ) : (
        <div className="flex-1 min-w-0 flex flex-wrap items-center gap-xxs">
          {items.map((item) => (
            <ScopeChip
              key={scopeKey(item)}
              item={item}
              onRemove={() => onRemove(item)}
            />
          ))}
          {over && (
            <span className="text-caption text-brand-primary">여기에 놓기</span>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * 담긴 것 하나. 설비든 분석이든 **같은 칩**이다 — 성격이 같고 넓이만 다르므로,
 * 분석은 앞에 설비를 한 단 달아 경로로 보인다.
 */
function ScopeChip({
  item,
  onRemove,
}: {
  item: ScopeItem;
  onRemove: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-xxs rounded-full border border-brand-hairline bg-brand-canvas pl-sm pr-xxs py-[5px] text-caption">
      <span
        className="w-[6px] h-[6px] rounded-full bg-brand-accent-teal shrink-0"
        aria-hidden
      />
      {item.kind === "analysis" && (
        <>
          <span className="text-brand-muted-soft">{item.equipment}</span>
          <span className="text-brand-hairline" aria-hidden>
            ›
          </span>
        </>
      )}
      <span className="text-brand-ink font-medium">
        {item.kind === "equipment" ? item.equipment : item.category}
      </span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`${scopeLabel(item)} 대상에서 빼기`}
        className="ml-xxs px-xxs rounded-full text-brand-muted-soft hover:text-brand-ink focus:outline-none focus:ring-2 focus:ring-brand-primary/15"
      >
        ×
      </button>
    </span>
  );
}
