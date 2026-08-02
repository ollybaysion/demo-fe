"use client";

import { useState } from "react";
import {
  type ScopeItem,
  scopeKey,
  scopeLabel,
} from "@/lib/query-scope";
import { SCOPE_DRAG_TYPE } from "./drag";

/**
 * 질의 대상 트레이 — 입력창 **바로 위**.
 *
 * 자리가 곧 의미다: 질문을 쓰는 칸 위에 있는 것이 이 질문의 대상이다. 패널 상단이나
 * 헤더에 두면 "담긴 목록"으로는 읽혀도 "이 질문의 대상"으로는 안 읽힌다.
 *
 * <p>빈 상태의 문구가 곧 드래그 어포던스다 — 끌 수 있다는 건 보이지 않으므로,
 * 놓을 자리가 스스로 말해야 한다. 다만 드래그는 **가속기**일 뿐이다: 담는 기본
 * 동작은 오른쪽 카드/줄을 누르는 것이고, 담긴 것은 그쪽에서 굵은 테두리로 보인다.
 */
export function ScopeTray({
  items,
  onRemove,
  onDropItem,
  hasData,
}: {
  items: ScopeItem[];
  onRemove: (item: ScopeItem) => void;
  /** 트레이에 놓였다 — 흡수 규칙은 호출자(스코프 상태)가 적용한다. */
  onDropItem: (item: ScopeItem) => void;
  /** 이 대상에 붙일 데이터가 실제로 있는가 — 없으면 칩의 점이 빈 원이 된다. */
  hasData: (item: ScopeItem) => boolean;
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
        // 높이는 담겼을 때(칩 한 줄) 기준으로 고정한다 — 비었다고 낮아지면
        // 카드를 누르는 순간 입력창이 아래로 밀린다. 늘 같은 자리여야 한다.
        "mb-xs flex items-center gap-sm rounded-md px-xxs py-xxs min-h-[40px] transition-colors",
        // 상자는 끌어 오는 동안에만 그린다 — 놓을 자리를 그때 보여주면 된다.
        over
          ? "border border-brand-primary bg-brand-primary/5 ring-4 ring-brand-primary/10"
          : "border border-transparent",
      ].join(" ")}
    >
      {/* 면을 걷은 뒤로는 글자가 이 자리의 전부다 — 색까지 옅으면 없는 것처럼
          보인다. muted-soft 는 캔버스 위에서 2.3:1 이라 대비 기준에도 못 미쳤다. */}
      <span className="shrink-0 text-[11px] font-medium tracking-wide text-brand-muted">
        질의 대상
      </span>
      {items.length === 0 ? (
        <span
          className={[
            "text-caption",
            over ? "text-brand-primary" : "text-brand-muted",
          ].join(" ")}
        >
          {/* 비어 있음 = 대상 없음이 아니라 **전체**다 — 담긴 게 없으면 가진
              데이터가 다 실려 나간다(스코프는 좁히는 장치다). */}
          {over ? "여기에 놓기" : "전체 · 카드를 누르면 그 대상으로 좁혀집니다"}
        </span>
      ) : (
        <div className="flex-1 min-w-0 flex flex-wrap items-center gap-xxs">
          {items.map((item) => (
            <ScopeChip
              key={scopeKey(item)}
              item={item}
              filled={hasData(item)}
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
 *
 * <p>앞의 점은 **붙일 데이터가 있는지**를 말한다. 요청만 서 있고 아직 결과를
 * 안 붙여넣은 대상도 담을 수 있는데(조회 키는 이미 정해져 있으니 백엔드가 되묻지
 * 않는다), 그때 점이 채워져 있으면 "데이터가 없다"는 답이 왜 나오는지 알 수 없다.
 */
function ScopeChip({
  item,
  filled,
  onRemove,
}: {
  item: ScopeItem;
  filled: boolean;
  onRemove: () => void;
}) {
  return (
    <span
      className="inline-flex items-center gap-xxs rounded-full border border-brand-hairline bg-brand-canvas pl-sm pr-xxs py-[5px] text-caption"
      title={
        filled
          ? `${scopeLabel(item)} — 붙여넣은 데이터가 있습니다`
          : `${scopeLabel(item)} — 아직 데이터가 없습니다(요청만 서 있음)`
      }
    >
      <span
        className={[
          "w-[6px] h-[6px] rounded-full shrink-0",
          filled
            ? "bg-brand-accent-teal"
            : "border border-brand-muted-soft bg-transparent",
        ].join(" ")}
        aria-hidden
      />
      <span className="sr-only">
        {filled ? "데이터 있음" : "데이터 없음"}
      </span>
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
