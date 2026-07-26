"use client";

import { useState } from "react";
import { formatRange } from "@/lib/format-range";
import type { EquipmentCardModel, EquipmentLine } from "./equipment-cards.mock";

/**
 * 오른쪽 패널 — **설비 카드**.
 *
 * 입력 폼이 아니라 **지금 쥔 데이터의 지도**다. 사용자가 설비를 타이핑하는 게
 * 아니라, 데이터 요청(설비 / 구간 / category)이 카드와 줄을 만든다.
 *
 * <p>카드는 두 동작을 **다른 행**으로 나눠 갖는다 — 위 본문을 누르면 확장
 * 패널(자세히), 아래 `분석 이력 N` 줄을 누르면 접힘/펼침. 같은 행에서 둘이
 * 경쟁하면 어느 쪽도 눌러야 할 곳으로 안 읽힌다.
 *
 * <p>색 규율: **주황(primary)은 "선택"에만** 쓴다 — 대기는 회색 점선과 글자로,
 * 상태는 중립 점으로 말한다. 레이어 규율: 컨테이너는 옅은 바탕(surface-soft),
 * 그 안의 항목은 밝은 바탕(canvas) — 왼쪽 데이터 그룹과 같은 규칙이다.
 */
type Props = {
  open: boolean;
  cards: EquipmentCardModel[];
  /** 줄을 누르면 왼쪽 패널이 그 그룹으로 이동해 잠깐 깜빡인다(지속 선택 아님). */
  onFocusLine: (lineKey: string) => void;
  /** 확장 패널을 연다 — 카드 본문 클릭. */
  onOpenDetail: (cardId: string) => void;
  /** 지금 확장 패널이 열려 있는 카드 — 그 카드가 "열린 상태"로 보여야 한다. */
  detailCardId: string | null;
};

export function EquipmentPanel({
  open,
  cards,
  onFocusLine,
  onOpenDetail,
  detailCardId,
}: Props) {
  // 첫 카드는 펼쳐 둔다 — 빈 목록처럼 보이지 않게.
  const [expanded, setExpanded] = useState<string[]>(() =>
    cards.length > 0 ? [cards[0].id] : [],
  );

  function toggle(id: string) {
    setExpanded((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id],
    );
  }

  return (
    <aside
      aria-label="설비 패널"
      aria-hidden={!open}
      // 폭·테두리는 우측 탭 호스트(ChatContainer)가 소유한다.
      className={open ? "h-full overflow-hidden" : "hidden"}
    >
      <div className="w-full h-full flex flex-col">
        <div className="flex-1 overflow-y-auto scrollbar-none px-lg py-lg flex flex-col gap-sm">
          {/* 이 목록에만 걸리는 필터 줄(자리표시자) — 데이터 패널의 단별 필터와
              같은 어법이다. */}
          <div className="flex items-center gap-xs rounded-md border border-dashed border-brand-hairline px-sm py-[6px]">
            <span className="flex-1 min-w-0 text-caption text-brand-muted-soft truncate">
              설비 필터
            </span>
            <button
              type="button"
              onClick={() =>
                setExpanded((prev) =>
                  prev.length > 0 ? [] : cards.map((c) => c.id),
                )
              }
              className="shrink-0 text-caption text-brand-muted hover:text-brand-ink focus:outline-none focus:ring-2 focus:ring-brand-primary/15 rounded-sm px-xxs"
            >
              {expanded.length > 0 ? "전체 축소" : "전체 펼침"}
            </button>
          </div>
          {cards.length === 0 ? (
            <p className="text-caption text-brand-muted-soft leading-relaxed">
              아직 조회된 설비가 없습니다. 채팅에서 데이터를 요청하면 여기에
              설비 카드가 생깁니다.
            </p>
          ) : (
            cards.map((card) => (
              <EquipmentCard
                key={card.id}
                card={card}
                open={expanded.includes(card.id)}
                onToggle={() => toggle(card.id)}
                onFocusLine={onFocusLine}
                onOpenDetail={() => onOpenDetail(card.id)}
                detailOpen={card.id === detailCardId}
              />
            ))
          )}
        </div>
      </div>
    </aside>
  );
}

function EquipmentCard({
  card,
  open,
  onToggle,
  onFocusLine,
  onOpenDetail,
  detailOpen,
}: {
  card: EquipmentCardModel;
  open: boolean;
  onToggle: () => void;
  onFocusLine: (lineKey: string) => void;
  onOpenDetail: () => void;
  detailOpen: boolean;
}) {
  const known = card.descriptors.length > 0;

  return (
    <div
      className={[
        "rounded-lg border bg-brand-surface-soft overflow-hidden transition-colors",
        detailOpen
          ? "border-brand-primary ring-1 ring-brand-primary/30"
          : "border-brand-hairline",
      ].join(" ")}
    >
      {/* 본문 = 자세히. 카드에서 가장 넓은 면이 가장 흔한 동작을 갖는다. */}
      <button
        type="button"
        onClick={onOpenDetail}
        aria-label={`${card.equipment} 자세히 보기`}
        aria-expanded={detailOpen}
        title={
          detailOpen ? "상세 닫기" : "자세히 — 왼쪽에 상세 화면이 열립니다"
        }
        className="group w-full px-sm pt-sm pb-xs text-left hover:bg-brand-surface-cream-strong focus:outline-none focus:ring-2 focus:ring-brand-primary/15"
      >
        <span className="flex items-baseline gap-xs">
          {/* ‹ 가 왼쪽을 가리켜 "결과가 왼쪽에 열린다"를 미리 말한다.
              열려 있으면 방향이 뒤집혀 "닫으면 오른쪽으로 접힌다"가 된다. */}
          <BackChevron open={detailOpen} />
          <span className="flex-1 min-w-0 text-body-md font-medium text-brand-ink truncate">
            {card.equipment}
          </span>
          <span className="shrink-0 text-caption text-brand-muted-soft">
            라인 {card.line}
          </span>
        </span>
        <span className="mt-xxs flex items-center gap-xs">
          {/* 설명 값은 각각 테두리 있는 칩으로 — 어디까지가 한 값인지 경계가
              보인다. 무게는 낮게 유지한다(11px·테두리만·채움 없음). */}
          <span className="flex-1 min-w-0 flex flex-wrap items-center gap-[4px]">
            {known ? (
              card.descriptors.map((d) => (
                <span
                  key={d}
                  className="inline-flex max-w-[150px] items-center rounded-[4px] border border-brand-hairline px-[6px] py-[2px] text-[11px] leading-[1.5] text-brand-muted"
                  title={d}
                >
                  <span className="truncate">{d}</span>
                </span>
              ))
            ) : (
              <span className="inline-flex items-center rounded-[4px] border border-dashed border-brand-hairline px-[6px] py-[2px] text-[11px] leading-[1.5] text-brand-muted-soft">
                설비 정보 미조회
              </span>
            )}
          </span>
          {card.status && (
            <span className="shrink-0 inline-flex items-center gap-[4px] text-caption text-brand-muted">
              <span
                className="w-[6px] h-[6px] rounded-full bg-brand-accent-teal"
                aria-hidden
              />
              {card.status}
            </span>
          )}
        </span>
      </button>

      {/* 펼침 = 라벨이 붙은 disclosure. 무엇이 열리는지 글자로 말한다. */}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="w-full px-sm py-xs flex items-center gap-xs border-t border-brand-hairline-soft text-left hover:bg-brand-surface-cream-strong focus:outline-none focus:ring-2 focus:ring-brand-primary/15"
      >
        <span className="flex-1 text-caption text-brand-muted">
          분석 이력 {card.lines.length}
        </span>
        <Chevron open={open} />
      </button>

      {open && (
        <div className="px-xs pb-xs pt-xxs flex flex-col gap-xxs">
          {card.lines.map((line) => (
            <LineRow
              key={line.key}
              line={line}
              onSelect={() => onFocusLine(line.key)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * 한 줄 = **두 행**: 위에 구간(잘리지 않게 통째로), 아래에 `category … 표 수`.
 * 320px 패널에서 시각·category·수를 한 행에 욱여넣으면 정작 중요한 구간이
 * 잘린다 — 잘린 시각은 아무 정보도 주지 못하므로 행을 나눈다.
 */
function LineRow({
  line,
  onSelect,
}: {
  line: EquipmentLine;
  onSelect: () => void;
}) {
  const waiting = line.status === "pending";

  return (
    <button
      type="button"
      onClick={onSelect}
      // 대기 줄도 누를 수 있다 — 볼 데이터 대신 **그 데이터를 부른 요청 카드**로
      // 데려간다(요청이 왼쪽에 실제로 있으니 갈 곳이 있다).
      title={
        waiting
          ? "아직 데이터가 없습니다 — 왼쪽 요청 카드로 이동합니다"
          : "왼쪽에서 이 데이터 보기"
      }
      className={[
        "group/line w-full flex flex-col gap-[2px] rounded-md px-xs py-xs text-left",
        "focus:outline-none focus:ring-2 focus:ring-brand-primary/15",
        "active:border-brand-primary active:bg-brand-primary/10",
        waiting
          ? "border border-dashed border-brand-hairline bg-brand-canvas/60 hover:border-brand-muted-soft"
          : "border border-brand-hairline bg-brand-canvas hover:border-brand-muted-soft",
      ].join(" ")}
    >
      {/* 무엇을 봤는지(category)가 먼저, 언제인지(구간)가 그 아래.
          표 수는 싣지 않는다 — 누르면 왼쪽에 그 카드들이 그대로 보이고,
          정작 필요한 구분(채워짐/대기)은 `대기` 표시가 이미 한다. */}
      <span className="flex items-baseline gap-xs">
        <span
          className={[
            "flex-1 min-w-0 text-caption truncate",
            waiting ? "text-brand-muted" : "text-brand-ink",
          ].join(" ")}
        >
          {line.category}
        </span>
        {/* 오른쪽 자리는 하나뿐이다 — 대기면 상태, 아니면 hover 힌트.
            시각 행에 두면 힌트가 뜰 때 시각을 밀어내 잘랐다. */}
        {waiting ? (
          <span className="shrink-0 inline-flex items-center gap-[3px] text-[11px] leading-none text-brand-muted-soft">
            <ArrowLeft />
            요청됨
          </span>
        ) : (
          <span className="shrink-0 inline-flex items-center gap-[3px] text-[11px] leading-none text-brand-muted-soft/0 transition-colors group-hover/line:text-brand-muted-soft">
            <ArrowLeft />
            왼쪽에서 보기
          </span>
        )}
      </span>
      <span className="text-caption text-brand-muted-soft tabular-nums whitespace-nowrap">
        {formatRange(line.start, line.end)}
      </span>
    </button>
  );
}

/** 왼쪽을 가리키는 작은 화살표 — 결과가 나타날 방향. */
function ArrowLeft() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="11 18 5 12 11 6" />
    </svg>
  );
}

/**
 * 상세 열림 방향 표시 — 닫혀 있으면 `‹`(왼쪽에 열린다), 열려 있으면 `›`(오른쪽으로
 * 접힌다). 방향을 미리 알려주면 "왜 저쪽이 바뀌지?"가 사라진다.
 */
function BackChevron({ open }: { open: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={[
        "shrink-0 self-center transition-transform",
        open
          ? "rotate-180 text-brand-primary"
          : "text-brand-muted-soft group-hover:text-brand-primary",
      ].join(" ")}
    >
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={[
        "shrink-0 text-brand-muted transition-transform",
        open ? "rotate-180" : "",
      ].join(" ")}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}
