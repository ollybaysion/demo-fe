"use client";

import { useEffect, useRef, useState } from "react";
import { formatRange } from "@/lib/format-range";
import type { ScopeItem } from "@/lib/query-scope";
import type { Skill } from "@/lib/skills";
import { scopeDragProps } from "@/components/chat/scope/drag";
import { AddEquipment } from "./AddEquipment";
import type { EquipmentCardModel, EquipmentLine } from "./equipment-cards.mock";

/** 강조 깜빡임 지속(ms) — 요청 도착 안내가 눈에 들되 흔적은 안 남게. */
const FLASH_MS = 1400;

/**
 * 오른쪽 패널 — **설비 카드**.
 *
 * 입력 폼이 아니라 **지금 쥔 데이터의 지도**다. 사용자가 설비를 타이핑하는 게
 * 아니라, 데이터 요청(설비 / 구간 / category)이 카드와 줄을 만든다.
 *
 * <p>카드는 두 동작을 **다른 행**으로 나눠 갖는다 — 위 본문을 누르면 확장
 * 패널(자세히), 아래 `분석 카드 N` 줄을 누르면 접힘/펼침. 같은 행에서 둘이
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
  /** 요청 도착 안내 대상 카드 — 펼치고 잠깐 깜빡인다. 일회성 신호(nonce). */
  focusCardId?: string | null;
  focusNonce?: number;
  /**
   * "설비 추가" 등록 — 설비명 + 스킬 + 진입에서 받아 둔 인자 값. 안 넘기면 진입
   * 버튼을 아예 안 그린다(파생만으로 카드가 서는 화면).
   */
  onAddEquipment?: (
    equipment: string,
    line: string | null,
    skill: Skill | null,
    values: Record<string, string>,
  ) => void;
  /**
   * 질의 대상 담기 — 안 넘기면 담기 버튼을 아예 안 그린다(스코프를 안 쓰는 화면).
   * 담김 판정은 `inScope` 가 한다: 설비가 통째로 담기면 그 아래 줄도 담긴 것이다.
   */
  onToggleScope?: (item: ScopeItem) => void;
  inScope?: (item: ScopeItem) => boolean;
  /**
   * 분석 카드 삭제(선언 철회) — 줄의 휴지통 버튼. 요청 카드는 함께 사라지고
   * 표 본문(IDB)은 남아 미분류로 흘러간다. 안 넘기면 버튼을 안 그린다.
   */
  onRemoveLine?: (lineKey: string) => void;
};

export function EquipmentPanel({
  open,
  cards,
  onFocusLine,
  onOpenDetail,
  detailCardId,
  focusCardId = null,
  focusNonce = 0,
  onAddEquipment,
  onToggleScope,
  inScope,
  onRemoveLine,
}: Props) {
  // 첫 카드는 펼쳐 둔다 — 빈 목록처럼 보이지 않게.
  const [expanded, setExpanded] = useState<string[]>(() =>
    cards.length > 0 ? [cards[0].id] : [],
  );
  // 카드의 [+]가 하단 진입 폼에 "이 설비로 스킬부터" 라고 알리는 신호.
  const [skillFor, setSkillFor] = useState<{
    equipment: string;
    nonce: number;
  } | null>(null);

  // 요청이 도착하면 그 설비 카드를 펼쳐 둔다 — 강조가 접힌 카드 뒤에 숨지 않게.
  useEffect(() => {
    if (focusNonce === 0 || !focusCardId) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setExpanded((prev) =>
      prev.includes(focusCardId) ? prev : [...prev, focusCardId],
    );
  }, [focusNonce, focusCardId]);

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
          {/* 접고 펴기는 목록이 있을 때만 — 빈 목록 위에 걸린 컨트롤은 누를 것이
              없으면서 자리만 차지한다. */}
          {cards.length > 0 && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() =>
                  setExpanded((prev) =>
                    prev.length > 0 ? [] : cards.map((c) => c.id),
                  )
                }
                className="text-caption text-brand-muted-soft hover:text-brand-ink focus:outline-none focus:ring-2 focus:ring-brand-primary/15 rounded-sm px-xxs"
              >
                {expanded.length > 0 ? "전체 축소" : "전체 펼침"}
              </button>
            </div>
          )}
          {cards.length === 0 ? (
            <p className="text-caption text-brand-muted-soft leading-relaxed">
              {onAddEquipment
                ? "아직 설비가 없습니다 — 아래 [+]로 분석을 시작하거나, 채팅에서 데이터를 요청하면 여기에 설비 카드가 생깁니다."
                : "아직 조회된 설비가 없습니다. 채팅에서 데이터를 요청하면 여기에 설비 카드가 생깁니다."}
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
                focused={card.id === focusCardId}
                focusNonce={focusNonce}
                onAddSkill={
                  onAddEquipment
                    ? () =>
                        setSkillFor((prev) => ({
                          equipment: card.equipment,
                          nonce: (prev?.nonce ?? 0) + 1,
                        }))
                    : undefined
                }
                onToggleScope={onToggleScope}
                inScope={inScope}
                onRemoveLine={onRemoveLine}
              />
            ))
          )}
        </div>

        {/* 하단 진입 — 접혀 있을 땐 동그란 [+] 하나가 가운데. 목록이 얼마나 길든
            진입은 늘 여기 있고, 펼치면 같은 자리에서 폼이 위로 자란다. */}
        {onAddEquipment && (
          <div className="shrink-0 px-lg py-md flex justify-center">
            <AddEquipment
              onAdd={onAddEquipment}
              existing={cards.map((c) => c.equipment)}
              openFor={skillFor}
            />
          </div>
        )}
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
  focused = false,
  focusNonce = 0,
  onAddSkill,
  onToggleScope,
  inScope,
  onRemoveLine,
}: {
  card: EquipmentCardModel;
  open: boolean;
  onToggle: () => void;
  onFocusLine: (lineKey: string) => void;
  onOpenDetail: () => void;
  detailOpen: boolean;
  focused?: boolean;
  focusNonce?: number;
  /** 이 설비에 분석을 더한다 — 하단 폼이 스킬 단계로 열린다. */
  onAddSkill?: () => void;
  onToggleScope?: (item: ScopeItem) => void;
  inScope?: (item: ScopeItem) => boolean;
  onRemoveLine?: (lineKey: string) => void;
}) {
  const known = card.descriptors.length > 0;
  const ref = useRef<HTMLDivElement | null>(null);
  const scopeItem: ScopeItem = { kind: "equipment", equipment: card.equipment };
  const picked = inScope ? inScope(scopeItem) : false;

  // 요청 도착 안내 — 화면 안으로 끌어오고 잠깐 깜빡인다. 지속 상태가 아니라
  // 클래스로 처리해 끝나면 흔적이 남지 않게 한다(왼쪽 그룹 안내와 같은 규칙).
  useEffect(() => {
    if (!focused || focusNonce === 0) return;
    const el = ref.current;
    if (!el) return;
    el.scrollIntoView({ block: "nearest", behavior: "smooth" });
    el.classList.add("border-brand-primary", "ring-2", "ring-brand-primary/40");
    const timer = window.setTimeout(() => {
      el.classList.remove(
        "border-brand-primary",
        "ring-2",
        "ring-brand-primary/40",
      );
    }, FLASH_MS);
    return () => window.clearTimeout(timer);
  }, [focused, focusNonce]);

  return (
    <div
      ref={ref}
      {...(onToggleScope ? scopeDragProps(scopeItem) : {})}
      className={[
        "rounded-lg border bg-brand-surface-soft overflow-hidden transition-[box-shadow,border-color] duration-500",
        // 담김은 **굵은 테두리**로만 말한다. 별도 컨트롤(체크 등)을 붙이면 카드가
        // 이미 가진 동작들과 섞여 뜻이 안 읽히고, 상위가 담겼을 때 그 아래 줄까지
        // 같은 표시가 붙어 담긴 개수와 트레이의 칩 수가 어긋난다. 테두리는
        // 중첩되므로 흡수가 저절로 드러난다 — 굵은 테두리 안에 있으면 포함된 것이다.
        picked
          ? "border-brand-primary ring-1 ring-inset ring-brand-primary"
          : detailOpen
            ? "border-brand-primary/50"
            : "border-brand-hairline",
      ].join(" ")}
    >
      {/* 카드에서 가장 넓은 면이 가장 흔한 동작을 갖는다 — 이 패널의 정체가
          "질의 대상 고르는 곳"이므로 그 동작은 **담기**다. 자세히는 왼쪽 `‹` 로
          내려간다(원래도 그 자리에서 "왼쪽에 열린다"를 가리키고 있었다).

          음영은 **머리 줄 전체가 한 면으로** 받는다. 안쪽 버튼들이 각자 칠하면
          `‹` 칼럼만 빠진 채 본문만 물들고, 마우스를 옮길 때마다 조각난 영역이
          번갈아 켜져 카드가 흔들리는 것처럼 보인다. 안쪽은 글자색만 바꾼다. */}
      <div className="flex items-start transition-colors hover:bg-brand-ink-translucent-04">
      {onOpenDetail && (
        <button
          type="button"
          onClick={onOpenDetail}
          aria-label={`${card.equipment} 자세히 보기`}
          aria-expanded={detailOpen}
          title={
            detailOpen ? "상세 닫기" : "자세히 — 왼쪽에 상세 화면이 열립니다"
          }
          className="group shrink-0 pl-sm pr-xxs py-sm hover:text-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/15"
        >
          <BackChevron open={detailOpen} />
        </button>
      )}
      <button
        type="button"
        onClick={onToggleScope ? () => onToggleScope(scopeItem) : undefined}
        aria-pressed={onToggleScope ? picked : undefined}
        aria-label={
          onToggleScope
            ? `${card.equipment} ${picked ? "질의 대상에서 빼기" : "질의 대상에 담기"}`
            : card.equipment
        }
        title={
          onToggleScope
            ? picked
              ? "질의 대상에서 빼기"
              : "질의 대상에 담기 — 이 설비에 대해 질의합니다"
            : undefined
        }
        className="group flex-1 min-w-0 pr-sm pl-xxs py-sm text-left focus:outline-none focus:ring-2 focus:ring-brand-primary/15"
      >
        <span className="flex items-center gap-xs">
          <span className="flex-1 min-w-0 text-body-md font-medium text-brand-ink break-words">
            {card.equipment}
          </span>
          {/* 라인은 아는 경우에만 말한다 — 모르면서 숫자를 붙이면 그 숫자가
              어디선가 온 값처럼 읽힌다. */}
          {card.line && (
            <span className="shrink-0 inline-flex items-center rounded-[4px] bg-brand-ink-translucent-04 px-[6px] py-[2px] text-[11px] leading-[1.5] text-brand-muted">
              {card.line}
            </span>
          )}
        </span>
        <span className="mt-xs flex items-center gap-xs">
          {/* 설명 값은 각각 테두리 있는 칩으로 — 어디까지가 한 값인지 경계가
              보인다. 무게는 낮게 유지한다(11px·테두리만·채움 없음). */}
          <span className="flex-1 min-w-0 flex flex-wrap items-center gap-[4px]">
            {known ? (
              card.descriptors.map((d) => (
                <span
                  key={d}
                  className="inline-flex max-w-full items-center rounded-[4px] border border-brand-hairline px-[6px] py-[3px] text-[11px] leading-[1.5] text-brand-muted"
                  title={d}
                >
                  <span className="truncate">{d}</span>
                </span>
              ))
            ) : (
              <span className="inline-flex items-center rounded-[4px] border border-dashed border-brand-hairline px-[6px] py-[3px] text-[11px] leading-[1.5] text-brand-muted-soft">
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
      </div>

      {/* 펼침 = 라벨이 붙은 disclosure. 무엇이 열리는지 글자로 말한다.
          그 오른쪽의 [+]는 **이 설비에** 분석을 더한다 — 이미 이 카드를 보고 있는
          사람에게 설비명을 다시 치게 하지 않는 자리다.
          머리 줄과 같은 규칙: 음영은 줄 하나가 통째로 받고 [+]는 글자색만 바꾼다. */}
      <div className="w-full flex items-center border-t border-brand-hairline-soft transition-colors hover:bg-brand-ink-translucent-04">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          className="flex-1 min-w-0 px-sm py-xs flex items-center gap-xs text-left focus:outline-none focus:ring-2 focus:ring-brand-primary/15"
        >
          <span className="flex-1 text-caption text-brand-muted">
            분석 카드 {card.lines.length}
          </span>
          <Chevron open={open} />
        </button>
        {onAddSkill && (
          <button
            type="button"
            onClick={onAddSkill}
            aria-label={`${card.equipment}에 분석 추가`}
            title="분석 추가"
            className="shrink-0 px-sm py-xs text-brand-muted-soft hover:text-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/15 transition-colors"
          >
            <PlusMini />
          </button>
        )}
      </div>

      {open && (
        <div className="px-sm pb-sm pt-xs flex flex-col gap-xxs">
          {card.lines.map((line) => (
            <LineRow
              key={line.key}
              line={line}
              equipment={card.equipment}
              onSelect={() => onFocusLine(line.key)}
              onToggleScope={onToggleScope}
              inScope={inScope}
              {...(onRemoveLine
                ? { onRemove: () => onRemoveLine(line.key) }
                : {})}
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
  equipment,
  onSelect,
  onToggleScope,
  inScope,
  onRemove,
}: {
  line: EquipmentLine;
  equipment: string;
  onSelect: () => void;
  onToggleScope?: (item: ScopeItem) => void;
  inScope?: (item: ScopeItem) => boolean;
  /** 분석 카드 삭제 — hover 에만 드러나는 휴지통. */
  onRemove?: () => void;
}) {
  const waiting = line.status === "pending";
  const scopeItem: ScopeItem = {
    kind: "analysis",
    equipment,
    lineKey: line.key,
    category: line.category,
  };
  const picked = inScope ? inScope(scopeItem) : false;

  // 줄에서도 넓은 면은 담기다 — 카드와 같은 규칙. 왼쪽에서 보기는 끝의 `←` 로
  // 내려간다(원래도 그 자리에서 방향을 가리키고 있었다).
  const row = (
    <button
      type="button"
      onClick={onToggleScope ? () => onToggleScope(scopeItem) : onSelect}
      aria-pressed={onToggleScope ? picked : undefined}
      aria-label={
        onToggleScope
          ? `${equipment} › ${line.category} ${picked ? "질의 대상에서 빼기" : "질의 대상에 담기"}`
          : undefined
      }
      title={
        onToggleScope
          ? picked
            ? "질의 대상에서 빼기"
            : "질의 대상에 담기 — 이 분석만 놓고 질의합니다"
          : "왼쪽에서 이 데이터 보기"
      }
      className={[
        "group/line flex-1 min-w-0 flex flex-col gap-[2px] rounded-md px-xs py-xs text-left",
        "focus:outline-none focus:ring-2 focus:ring-brand-primary/15",
        picked
          ? "border border-brand-primary ring-1 ring-inset ring-brand-primary bg-brand-canvas"
          : waiting
            ? "border border-brand-hairline bg-brand-canvas/60 hover:border-brand-muted-soft"
            : "border border-brand-hairline bg-brand-canvas hover:border-brand-muted-soft",
      ].join(" ")}
    >
      {/* 무엇을 봤는지(category)가 먼저, 언제인지(구간)가 그 아래.
          표 수는 싣지 않는다 — 누르면 왼쪽에 그 카드들이 그대로 보이고,
          채워짐/대기 구분은 글자 색(잉크/뮤트)으로만 말한다.

          **자르지 않는다.** 인자와 구간은 어느 분석인지를 가르는 값이라
          (`start=2026-07-01, end=2026-07-31`), 끝이 잘리면 카드가 서로
          구별되지 않아 줄 자체가 무의미해진다. 좁은 칸에서는 줄을 늘린다. */}
      <span className="flex items-baseline gap-xs">
        <span
          className={[
            "flex-1 min-w-0 text-caption break-words",
            waiting ? "text-brand-muted" : "text-brand-ink",
          ].join(" ")}
        >
          {line.category}
        </span>
      </span>
      {line.sub && (
        <span className="text-caption text-brand-muted-soft break-words">
          {line.sub}
        </span>
      )}
      {line.start && line.end && (
        <span className="text-caption text-brand-muted-soft tabular-nums break-words">
          {formatRange(line.start, line.end)}
        </span>
      )}
    </button>
  );

  if (!onToggleScope) return row;

  return (
    <div
      {...scopeDragProps(scopeItem)}
      className="group/row flex items-stretch gap-xxs"
    >
      {row}
      {/* 대기 줄도 누를 수 있다 — 볼 데이터 대신 **그 데이터를 부른 요청 카드**로
          데려간다(요청이 왼쪽에 실제로 있으니 갈 곳이 있다). */}
      <button
        type="button"
        onClick={onSelect}
        aria-label={`${line.category} 왼쪽에서 보기`}
        title={
          waiting
            ? "아직 데이터가 없습니다 — 왼쪽 요청 카드로 이동합니다"
            : "왼쪽에서 이 데이터 보기"
        }
        className="shrink-0 px-xxs rounded-md text-brand-muted-soft hover:text-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/15 transition-colors"
      >
        <ArrowLeft />
      </button>
      {onRemove && (
        // 삭제 = 선언 철회. 요청 카드는 함께 사라지고, 표 본문(IDB)은 남아
        // 미분류로 흘러간다 — 데이터를 지우는 버튼이 아니다.
        <button
          type="button"
          onClick={onRemove}
          aria-label={`${line.category} 분석 카드 삭제`}
          title="분석 카드 삭제 — 등록한 데이터 본문은 미분류로 남습니다"
          className="shrink-0 px-xxs rounded-md text-brand-muted-soft opacity-0 group-hover/row:opacity-100 focus:opacity-100 hover:text-brand-error focus:outline-none focus:ring-2 focus:ring-brand-primary/15 transition-all"
        >
          <TrashMini />
        </button>
      )}
    </div>
  );
}

/** 줄의 삭제 버튼 아이콘 — 14px 인라인 SVG 관례. */
function TrashMini() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
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

function PlusMini() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
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
