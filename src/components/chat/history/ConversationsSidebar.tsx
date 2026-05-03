"use client";

import { useEffect, useState } from "react";
import type { ContextRow } from "@/lib/types";
import type { TimeRange } from "../context/useContextRows";
import type { Conversation } from "./useConversations";

/**
 * 좌측 320px 사이드바. 대화 이력 목록.
 *
 * 우측 ContextPanel 과 같은 push-layout(`w-0 ↔ w-[320px]`) 패턴을 미러.
 */
type Props = {
  open: boolean;
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
};

export function ConversationsSidebar({
  open,
  conversations,
  activeId,
  onSelect,
}: Props) {
  // 상대 시간 라벨용 "지금" 스냅샷. 마운트 시 한 번 + 1분마다 갱신해
  // "3시간 전" 라벨이 너무 벗어나지 않게. Date.now() 를 render 중 직접
  // 호출하지 않기 위함.
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  return (
    <aside
      aria-label="이전 대화 사이드바"
      aria-hidden={!open}
      className={[
        "shrink-0 overflow-hidden",
        "transition-[width] duration-200 ease-out",
        open ? "w-[320px]" : "w-0",
        "border-r border-brand-hairline bg-brand-canvas",
      ].join(" ")}
    >
      <div className="w-[320px] h-full flex flex-col">
        <div className="px-lg pt-lg pb-md border-b border-brand-hairline-soft">
          <h2 className="font-sans text-title-md text-brand-ink">
            이전 대화
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <Empty>아직 저장된 대화가 없습니다.</Empty>
          ) : (
            <ul className="flex flex-col">
              {conversations.map((c) => (
                <ConversationItem
                  key={c.id}
                  conversation={c}
                  active={c.id === activeId}
                  now={now}
                  onClick={() => onSelect(c.id)}
                />
              ))}
            </ul>
          )}
        </div>
      </div>
    </aside>
  );
}

// ────────────────────────────────────────────────────────────────────
// List item
// ────────────────────────────────────────────────────────────────────

function ConversationItem({
  conversation,
  active,
  now,
  onClick,
}: {
  conversation: Conversation;
  active: boolean;
  now: number | null;
  onClick: () => void;
}) {
  const contextLine = formatContextSummary(
    conversation.context.rows,
    conversation.context.timeRange,
  );
  // now 가 아직 set 되지 않은 첫 렌더에서는 절대 날짜로 fallback.
  const timeLine =
    now === null
      ? formatDate(new Date(conversation.updatedAt))
      : formatRelativeTime(conversation.updatedAt, now);

  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        aria-current={active ? "true" : undefined}
        className={[
          "w-full text-left px-lg py-md border-b border-brand-hairline-soft last:border-b-0",
          "focus:outline-none focus:bg-brand-ink-translucent-04",
          active
            ? "bg-brand-primary/10 hover:bg-brand-primary/15"
            : "hover:bg-brand-ink-translucent-04",
          "transition-colors",
        ].join(" ")}
      >
        <div
          className={[
            "font-sans text-body-sm leading-tight truncate",
            active ? "text-brand-ink font-medium" : "text-brand-ink",
          ].join(" ")}
        >
          {conversation.title}
        </div>
        {contextLine && (
          <div className="mt-xxs text-caption text-brand-muted truncate font-mono">
            {contextLine}
          </div>
        )}
        <div className="mt-xxs text-caption text-brand-muted-soft">
          {timeLine}
        </div>
      </button>
    </li>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-lg py-lg text-body-sm text-brand-muted-soft">
      {children}
    </p>
  );
}

// ────────────────────────────────────────────────────────────────────
// Formatters
// ────────────────────────────────────────────────────────────────────

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const WEEK_MS = 7 * DAY_MS;

/** "방금" / "12분 전" / "3시간 전" / "2일 전" / "2026-04-12". */
function formatRelativeTime(ts: number, now: number): string {
  const diff = Math.max(0, now - ts);
  if (diff < MINUTE_MS) return "방금";
  if (diff < HOUR_MS) return `${Math.floor(diff / MINUTE_MS)}분 전`;
  if (diff < DAY_MS) return `${Math.floor(diff / HOUR_MS)}시간 전`;
  if (diff < WEEK_MS) return `${Math.floor(diff / DAY_MS)}일 전`;
  return formatDate(new Date(ts));
}

function formatDate(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatTime(d: Date): string {
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mi}`;
}

/**
 * 행/발생 시간을 한 줄 컨텍스트로 요약.
 * - 설비 1개 + 발생 시간: `ETCH-01 · 2026-05-02 13:00~14:00` (같은 날),
 *   `ETCH-01 · 2026-05-01 13:00 ~ 2026-05-02 14:00` (다른 날)
 * - 한쪽만 채워진 발생 시간: `2026-05-02 13:00`
 * - 여러 설비: `ETCH-01 외 2 · 2026-05-02 13:00~14:00`
 * - 발생 시간 비면 시간 부분 생략, 설비도 시간도 비면 빈 문자열
 */
function formatContextSummary(
  rows: ContextRow[],
  range: TimeRange,
): string {
  const equipNames = rows
    .map((r) => r.equipment.trim())
    .filter((n) => n.length > 0);

  let equipPart = "";
  if (equipNames.length === 1) {
    equipPart = equipNames[0];
  } else if (equipNames.length > 1) {
    equipPart = `${equipNames[0]} 외 ${equipNames.length - 1}`;
  }

  const start = range.start ? new Date(range.start) : null;
  const end = range.end ? new Date(range.end) : null;
  const startValid = start && !Number.isNaN(start.getTime());
  const endValid = end && !Number.isNaN(end.getTime());

  let timePart = "";
  if (startValid && endValid) {
    const sameDay = formatDate(start) === formatDate(end);
    timePart = sameDay
      ? `${formatDate(start)} ${formatTime(start)}~${formatTime(end)}`
      : `${formatDate(start)} ${formatTime(start)} ~ ${formatDate(end)} ${formatTime(end)}`;
  } else if (startValid) {
    timePart = `${formatDate(start)} ${formatTime(start)}`;
  } else if (endValid) {
    timePart = `${formatDate(end)} ${formatTime(end)}`;
  }

  if (equipPart && timePart) return `${equipPart} · ${timePart}`;
  return equipPart || timePart;
}
