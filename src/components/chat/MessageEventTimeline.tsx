"use client";

import { useEffect, useRef, useState } from "react";
import type {
  EventTimelineItem,
  EventTimelineLevel,
  MessageEventTimeline as MessageEventTimelinePayload,
} from "@/lib/types";

/**
 * 어시스턴트 메시지에 paired 되는 이벤트 타임라인 (#49).
 *
 * Gantt 식 — 각 트랙(공정/챔버 등)이 한 row, 이벤트는 시작~종료 구간의
 * 가로 막대로 그려짐. 시간축은 위쪽 ticks, 좌측 트랙 라벨, 우측이 막대 영역.
 *
 * 디자인 결정 (#49):
 * - 차트와 동기화 X — 자체 시간축. `range` 미지정 시 events 의 min/max 자동
 * - 2단계 계층: process(공정) tracks 가 위, step(STEP) tracks 가 아래
 * - 색은 백엔드 명시 우선 → `color` 미지정 시 level 기준 기본
 *   (process: brand-primary, step: brand-accent-teal)
 * - 같은 트랙 내 이벤트 시간이 겹치면 sub-row 로 자동 stacking
 *   (greedy interval scheduling)
 * - 표 [확장] 과 동일하게 fixed overlay 로 [전체 보기] 가능
 * - read-only — hover 시 tooltip 으로 라벨 + 시각 노출
 * - 카드 통합 (#45 패턴) — 제목 행 + chevron 토글 + slide
 */
type Props = {
  timeline: MessageEventTimelinePayload;
  defaultExpanded?: boolean;
  /**
   * 풍선 DOM ref — [전체 보기] overlay 위치 anchor 용. 비면 viewport
   * 기준 fallback.
   */
  bubbleRef?: React.RefObject<HTMLDivElement | null>;
};

// Process tracks 의 기본 색 (단일).
const PROCESS_DEFAULT_COLOR = "#cc785c"; // brand-primary

// Step tracks 의 기본 색 cycle. 트랙별로 다른 색이 배정되도록.
// 백엔드가 `event.color` 명시하면 그쪽이 우선.
const STEP_TRACK_PALETTE = [
  "#5db8a6", // brand-accent-teal
  "#e8a55a", // brand-accent-amber
  "#5db872", // brand-success
  "#c64545", // brand-error
  "#d4a017", // brand-warning
];

function trackDefaultColor(
  level: EventTimelineLevel,
  indexInLevel: number,
): string {
  if (level === "process") return PROCESS_DEFAULT_COLOR;
  return STEP_TRACK_PALETTE[indexInLevel % STEP_TRACK_PALETTE.length];
}

const TRACK_LABEL_WIDTH = 96;
const SUBROW_HEIGHT = 24;
const SUBROW_GAP = 2;
const TRACK_GAP = 4;
const TIMELINE_PADDING_X = 12;
const AXIS_HEIGHT = 24;
const TICK_COUNT = 5;
const BAR_FONT_SIZE = 10;
const BAR_LABEL_THRESHOLD = 40; // bar width < 이 값이면 라벨 생략

type NumericEvent = EventTimelineItem & {
  startNum: number;
  endNum: number;
};

type LaidOutEvent = NumericEvent & {
  trackKey: string;
  subrow: number;
};

type TrackInfo = {
  key: string;
  label: string;
  level: EventTimelineLevel;
  /** 트랙별 기본 색. event.color 미지정 시 사용. */
  defaultColor: string;
  subrowCount: number;
  /** 이 트랙 시작 y (timeline plot 좌표계 기준, axis 제외). */
  yOffset: number;
  /** 이 트랙 전체 height (모든 sub-row + gap 포함). */
  height: number;
};

export function MessageEventTimeline({
  timeline,
  defaultExpanded = true,
  bubbleRef,
}: Props) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [maximized, setMaximized] = useState(false);
  const [overlayTop, setOverlayTop] = useState<number | null>(null);

  // ESC 키로 overlay 닫기.
  useEffect(() => {
    if (!maximized) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMaximized(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [maximized]);

  // overlay 켜져 있을 때 풍선 위치 기준으로 top 계산. 표 overlay 와 동일 패턴.
  useEffect(() => {
    if (!maximized || !bubbleRef) return;
    const update = () => {
      const el = bubbleRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const overlayHeight = vh / 3;
      const desiredTop = Math.max(rect.top, 16);
      const adjustedTop = Math.min(desiredTop, vh - overlayHeight - 16);
      setOverlayTop(adjustedTop);
    };
    update();
    window.addEventListener("scroll", update, {
      capture: true,
      passive: true,
    });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, { capture: true });
      window.removeEventListener("resize", update);
    };
  }, [maximized, bubbleRef]);

  const { events } = timeline;
  if (events.length === 0) return null;

  // 시간축 범위
  const numericEvents: NumericEvent[] = events.map((e) => ({
    ...e,
    startNum: toComparable(e.start),
    endNum: toComparable(e.end),
  }));
  const rangeStart = timeline.range?.start
    ? toComparable(timeline.range.start)
    : Math.min(...numericEvents.map((e) => e.startNum));
  const rangeEnd = timeline.range?.end
    ? toComparable(timeline.range.end)
    : Math.max(...numericEvents.map((e) => e.endNum));
  const rangeWidth = Math.max(1, rangeEnd - rangeStart);

  const layout = computeLayout(numericEvents);
  const sample = timeline.range?.start ?? events[0].start;
  const title = timeline.title ?? "이벤트 타임라인";

  return (
    <>
      <div className="w-full max-w-full border border-brand-ink bg-brand-canvas">
        {/* 제목 행 — 좌측 클릭 영역 / 우측 [전체 보기] / chevron */}
        <div className="w-full flex items-center bg-brand-surface-soft">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            className="flex-1 min-w-0 flex items-baseline gap-sm text-left px-md py-xs hover:bg-brand-ink-translucent-04 focus:outline-none focus:ring-2 focus:ring-brand-primary/15 transition-colors"
          >
            <span className="font-sans text-body-sm text-brand-ink truncate">
              {title}
            </span>
            <span className="font-sans text-caption text-brand-muted truncate">
              {layout.tracks.length} 트랙 · {events.length} 이벤트
            </span>
          </button>
          {expanded && (
            <div className="flex gap-xxs px-xs shrink-0">
              <ActionButton
                onClick={() => setMaximized((v) => !v)}
                aria-label={maximized ? "전체 보기 닫기" : "전체 보기"}
                aria-expanded={maximized}
              >
                {maximized ? <MinimizeIcon /> : <MaximizeIcon />}
                <span>{maximized ? "축소" : "확장"}</span>
              </ActionButton>
            </div>
          )}
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-label={expanded ? "타임라인 접기" : "타임라인 펼치기"}
            aria-expanded={expanded}
            className="shrink-0 px-md py-xs hover:bg-brand-ink-translucent-04 focus:outline-none focus:ring-2 focus:ring-brand-primary/15 transition-colors"
          >
            <Chevron expanded={expanded} />
          </button>
        </div>

        {/* 본문 — slide */}
        <div
          className={[
            "grid transition-[grid-template-rows] duration-200 ease-out",
            expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
          ].join(" ")}
        >
          <div className="overflow-hidden">
            <div className="border-t border-brand-ink">
              <TimelineSvg
                tracks={layout.tracks}
                events={layout.events}
                rangeStart={rangeStart}
                rangeWidth={rangeWidth}
                sampleTimeFormat={sample}
              />
            </div>
          </div>
        </div>
      </div>

      {maximized && (
        <ExpandedTimelineOverlay
          title={title}
          tracks={layout.tracks}
          events={layout.events}
          rangeStart={rangeStart}
          rangeWidth={rangeWidth}
          sampleTimeFormat={sample}
          top={overlayTop}
          onClose={() => setMaximized(false)}
        />
      )}
    </>
  );
}

// ────────────────────────────────────────────────────────────────────
// SVG 본문 (gutter 카드 / overlay 공통)
// ────────────────────────────────────────────────────────────────────

function TimelineSvg({
  tracks,
  events,
  rangeStart,
  rangeWidth,
  sampleTimeFormat,
}: {
  tracks: TrackInfo[];
  events: LaidOutEvent[];
  rangeStart: number;
  rangeWidth: number;
  sampleTimeFormat: string | number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(640);
  const [hover, setHover] = useState<{
    item: NumericEvent;
    x: number;
    y: number;
  } | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const e = entries[0];
      if (e) setContainerWidth(e.contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const plotWidth = Math.max(
    0,
    containerWidth - TRACK_LABEL_WIDTH - TIMELINE_PADDING_X * 2,
  );
  const plotHeight =
    tracks.reduce((sum, t) => sum + t.height, 0) + (tracks.length - 1) * TRACK_GAP;
  const svgHeight = AXIS_HEIGHT + plotHeight + 4;

  const xFor = (v: number) =>
    TRACK_LABEL_WIDTH +
    TIMELINE_PADDING_X +
    ((v - rangeStart) / rangeWidth) * plotWidth;

  const ticks = Array.from({ length: TICK_COUNT + 1 }, (_, i) => {
    const t = rangeStart + (rangeWidth * i) / TICK_COUNT;
    return {
      value: t,
      x: xFor(t),
      label: formatTimeLabel(t, sampleTimeFormat),
    };
  });

  return (
    <div className="relative h-full" ref={containerRef}>
      <svg
        role="img"
        width="100%"
        height={svgHeight}
        className="block"
      >
        {/* 시간축 ticks */}
        <g>
          {ticks.map((t, i) => (
            <g key={i}>
              <line
                x1={t.x}
                x2={t.x}
                y1={AXIS_HEIGHT - 4}
                y2={AXIS_HEIGHT}
                stroke="#6c6a64"
                strokeWidth={1}
              />
              <text
                x={t.x}
                y={AXIS_HEIGHT - 8}
                fontSize={11}
                fill="#6c6a64"
                textAnchor={
                  i === 0 ? "start" : i === TICK_COUNT ? "end" : "middle"
                }
              >
                {t.label}
              </text>
            </g>
          ))}
          <line
            x1={TRACK_LABEL_WIDTH + TIMELINE_PADDING_X}
            x2={containerWidth - TIMELINE_PADDING_X}
            y1={AXIS_HEIGHT}
            y2={AXIS_HEIGHT}
            stroke="#e6dfd8"
            strokeWidth={1}
          />
        </g>

        {/* 트랙 라벨 */}
        {tracks.map((track) => {
          const y = AXIS_HEIGHT + track.yOffset;
          return (
            <text
              key={track.key}
              x={TIMELINE_PADDING_X}
              y={y + track.height / 2 + 4}
              fontSize={12}
              fill="#3d3d3a"
              fontWeight={track.level === "process" ? 600 : 400}
            >
              {track.label}
            </text>
          );
        })}

        {/* 트랙 사이 구분선 (옅은 회색). 마지막 트랙 뒤엔 안 그림. */}
        {tracks.slice(0, -1).map((t, i) => {
          const y = AXIS_HEIGHT + t.yOffset + t.height + TRACK_GAP / 2;
          return (
            <line
              key={`divider-${i}`}
              x1={0}
              x2={containerWidth}
              y1={y}
              y2={y}
              stroke="#e6dfd8"
              strokeWidth={1}
            />
          );
        })}

        {/* 이벤트 막대 */}
        {events.map((ev, i) => {
          const track = tracks.find((t) => t.key === ev.trackKey);
          if (!track) return null;
          const subrowY =
            AXIS_HEIGHT +
            track.yOffset +
            ev.subrow * (SUBROW_HEIGHT + SUBROW_GAP);
          const x1 = xFor(ev.startNum);
          const x2 = xFor(ev.endNum);
          const w = Math.max(2, x2 - x1);
          const fill = ev.color ?? track.defaultColor;
          return (
            <g key={i}>
              <rect
                x={x1}
                y={subrowY}
                width={w}
                height={SUBROW_HEIGHT}
                fill={fill}
                rx={2}
                onMouseEnter={(e) =>
                  setHover({ item: ev, x: e.clientX, y: e.clientY })
                }
                onMouseMove={(e) =>
                  setHover({ item: ev, x: e.clientX, y: e.clientY })
                }
                onMouseLeave={() => setHover(null)}
              />
              {w > BAR_LABEL_THRESHOLD && (
                <text
                  x={x1 + 6}
                  y={subrowY + SUBROW_HEIGHT / 2 + 4}
                  fontSize={BAR_FONT_SIZE}
                  fill="#faf9f5"
                  pointerEvents="none"
                  clipPath={`inset(0 0 0 0)`}
                >
                  {ev.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {hover && (
        <div
          role="tooltip"
          className="pointer-events-none fixed z-40 bg-brand-canvas border border-brand-ink px-sm py-xxs text-caption text-brand-ink shadow-md whitespace-nowrap"
          style={{
            left: hover.x + 12,
            top: hover.y + 12,
          }}
        >
          <div className="font-sans font-medium">{hover.item.label}</div>
          <div className="font-mono text-brand-muted">
            {String(hover.item.start)} ~ {String(hover.item.end)}
          </div>
          <div className="text-brand-muted">
            {hover.item.track} · {hover.item.level}
          </div>
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// 전체 보기 overlay (#42 와 같은 패턴 — 풍선 anchor + 1/3 vh + 70% 너비)
// ────────────────────────────────────────────────────────────────────

function ExpandedTimelineOverlay({
  title,
  tracks,
  events,
  rangeStart,
  rangeWidth,
  sampleTimeFormat,
  top,
  onClose,
}: {
  title: string;
  tracks: TrackInfo[];
  events: LaidOutEvent[];
  rangeStart: number;
  rangeWidth: number;
  sampleTimeFormat: string | number;
  top: number | null;
  onClose: () => void;
}) {
  const overlayStyle: React.CSSProperties = {
    top: top ?? "33vh",
    height: "33.333vh",
  };
  return (
    <div
      role="dialog"
      aria-label={`${title} 전체 보기`}
      aria-modal="false"
      className="fixed left-[15%] right-[15%] z-30 bg-brand-canvas border border-brand-hairline shadow-md flex flex-col"
      style={overlayStyle}
    >
      <header className="px-md py-xs flex items-center justify-between gap-sm shrink-0">
        <span className="font-sans text-caption text-brand-muted">
          {title} 전체 보기 ({tracks.length} 트랙 · {events.length} 이벤트)
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="전체 보기 닫기"
          title="닫기 (Esc)"
          className="shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-sm text-brand-muted hover:bg-brand-ink-translucent-04 hover:text-brand-ink focus:outline-none focus:ring-2 focus:ring-brand-primary/15 transition-colors"
        >
          <XIcon />
        </button>
      </header>
      <div className="flex-1 overflow-auto min-h-0">
        <TimelineSvg
          tracks={tracks}
          events={events}
          rangeStart={rangeStart}
          rangeWidth={rangeWidth}
          sampleTimeFormat={sampleTimeFormat}
        />
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// Layout — 트랙별 sub-row 자동 stacking (greedy interval scheduling)
// ────────────────────────────────────────────────────────────────────

function computeLayout(events: NumericEvent[]): {
  tracks: TrackInfo[];
  events: LaidOutEvent[];
} {
  // 1. 트랙 발견 순서 정리 (process 먼저, step 나중. 같은 level 내 입력 순서)
  // indexInLevel 도 같이 잡아 트랙별 default 색 매핑에 사용.
  const trackOrder: Array<{
    key: string;
    label: string;
    level: EventTimelineLevel;
    indexInLevel: number;
  }> = [];
  const seen = new Map<string, number>(); // key -> orderIndex (in-level)
  let processOrder = 0;
  let stepOrder = 0;
  for (const ev of events) {
    const key = `${ev.level}::${ev.track}`;
    if (seen.has(key)) continue;
    const indexInLevel = ev.level === "process" ? processOrder++ : stepOrder++;
    seen.set(key, indexInLevel);
    trackOrder.push({ key, label: ev.track, level: ev.level, indexInLevel });
  }
  trackOrder.sort((a, b) => {
    if (a.level !== b.level) return a.level === "process" ? -1 : 1;
    return a.indexInLevel - b.indexInLevel;
  });

  // 2. 트랙별 sub-row 할당. 같은 트랙에서 시간 겹치면 다음 sub-row 로.
  const eventsByTrack = new Map<string, NumericEvent[]>();
  for (const ev of events) {
    const key = `${ev.level}::${ev.track}`;
    if (!eventsByTrack.has(key)) eventsByTrack.set(key, []);
    eventsByTrack.get(key)!.push(ev);
  }
  const laidOut: LaidOutEvent[] = [];
  const trackSubrowCount = new Map<string, number>();
  for (const [key, trackEvents] of eventsByTrack) {
    const sorted = [...trackEvents].sort((a, b) => a.startNum - b.startNum);
    const subrowEnds: number[] = []; // 마지막 end 시간
    for (const ev of sorted) {
      let placed = -1;
      for (let i = 0; i < subrowEnds.length; i++) {
        if (subrowEnds[i] <= ev.startNum) {
          placed = i;
          subrowEnds[i] = ev.endNum;
          break;
        }
      }
      if (placed === -1) {
        placed = subrowEnds.length;
        subrowEnds.push(ev.endNum);
      }
      laidOut.push({ ...ev, trackKey: key, subrow: placed });
    }
    trackSubrowCount.set(key, Math.max(1, subrowEnds.length));
  }

  // 3. 트랙 정보 — yOffset / height 계산
  const tracks: TrackInfo[] = [];
  let yCursor = 0;
  for (const t of trackOrder) {
    const subrowCount = trackSubrowCount.get(t.key) ?? 1;
    const height =
      subrowCount * SUBROW_HEIGHT + (subrowCount - 1) * SUBROW_GAP;
    tracks.push({
      key: t.key,
      label: t.label,
      level: t.level,
      defaultColor: trackDefaultColor(t.level, t.indexInLevel),
      subrowCount,
      yOffset: yCursor,
      height,
    });
    yCursor += height + TRACK_GAP;
  }

  return { tracks, events: laidOut };
}

// ────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────

function toComparable(v: string | number): number {
  if (typeof v === "number") return v;
  const timeMatch = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(v);
  if (timeMatch) {
    const h = parseInt(timeMatch[1], 10);
    const m = parseInt(timeMatch[2], 10);
    const s = timeMatch[3] ? parseInt(timeMatch[3], 10) : 0;
    return ((h * 60 + m) * 60 + s) * 1000;
  }
  const t = Date.parse(v);
  if (!Number.isNaN(t)) return t;
  return 0;
}

function formatTimeLabel(v: number, sample: string | number): string {
  if (typeof sample === "number") return String(Math.round(v));
  const sampleStr = String(sample);
  const isHHMM = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.test(sampleStr);
  if (isHHMM) {
    const totalSec = Math.round(v / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    // sample 이 HH:MM:SS 면 초까지, HH:MM 이면 분까지.
    const hasSec = sampleStr.split(":").length === 3;
    return hasSec
      ? `${pad2(h)}:${pad2(m)}:${pad2(s)}`
      : `${pad2(h)}:${pad2(m)}`;
  }
  const d = new Date(v);
  if (!Number.isNaN(d.getTime())) {
    return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
  }
  return String(Math.round(v));
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function ActionButton({
  children,
  onClick,
  ...rest
}: {
  children: React.ReactNode;
  onClick: () => void;
  "aria-label"?: string;
  "aria-expanded"?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-xxs px-xs py-xxs rounded-sm text-caption text-brand-muted hover:bg-brand-ink-translucent-04 hover:text-brand-ink focus:outline-none focus:ring-2 focus:ring-brand-primary/15 transition-colors"
      {...rest}
    >
      {children}
    </button>
  );
}

function Chevron({ expanded }: { expanded: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={[
        "shrink-0 text-brand-muted transition-transform duration-200",
        expanded ? "rotate-180" : "rotate-0",
      ].join(" ")}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function MaximizeIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <polyline points="15 3 21 3 21 9" />
      <polyline points="9 21 3 21 3 15" />
      <line x1="21" y1="3" x2="14" y2="10" />
      <line x1="3" y1="21" x2="10" y2="14" />
    </svg>
  );
}

function MinimizeIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <polyline points="4 14 10 14 10 20" />
      <polyline points="20 10 14 10 14 4" />
      <line x1="14" y1="10" x2="21" y2="3" />
      <line x1="3" y1="21" x2="10" y2="14" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
