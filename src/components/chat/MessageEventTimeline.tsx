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
 * - 차트와 동기화 X — 자체 시간축. \`range\` 미지정 시 events 의 min/max 자동
 * - 2단계 계층: process(공정) tracks 가 위, step(STEP) tracks 가 아래
 * - 색은 백엔드 명시 우선 → \`color\` 미지정 시 level 기준 기본
 *   (process: brand-primary, step: brand-accent-teal)
 * - read-only — hover 시 tooltip 으로 라벨 + 시각 노출
 * - 카드 통합 (#45 패턴) — 제목 행 + chevron 토글 + slide
 */
type Props = {
  timeline: MessageEventTimelinePayload;
  defaultExpanded?: boolean;
};

const LEVEL_DEFAULT_COLOR: Record<EventTimelineLevel, string> = {
  process: "#cc785c", // brand-primary
  step: "#5db8a6", // brand-accent-teal
};

const TRACK_LABEL_WIDTH = 96;
const ROW_HEIGHT = 28;
const ROW_GAP = 4;
const TIMELINE_PADDING_X = 12;
const AXIS_HEIGHT = 24;
const TICK_COUNT = 5;

export function MessageEventTimeline({
  timeline,
  defaultExpanded = true,
}: Props) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(640);
  const [hover, setHover] = useState<{
    item: EventTimelineItem;
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

  const { events } = timeline;
  if (events.length === 0) return null;

  // 시간축 범위 — 명시값 우선, 없으면 events 의 min/max 자동.
  const numericEvents = events.map((e) => ({
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

  // 트랙 정렬 — process 먼저(입력 순서), step 다음(입력 순서). 각 그룹
  // 내에서 동일 track 라벨끼리 묶임.
  const orderedTracks = orderTracks(events);
  const trackIndex = new Map(orderedTracks.map((t, i) => [t.key, i] as const));

  const plotWidth = Math.max(0, containerWidth - TRACK_LABEL_WIDTH - TIMELINE_PADDING_X * 2);
  const plotHeight = orderedTracks.length * (ROW_HEIGHT + ROW_GAP) - ROW_GAP;
  const svgHeight = AXIS_HEIGHT + plotHeight + 4;

  const xFor = (v: number) =>
    TRACK_LABEL_WIDTH + TIMELINE_PADDING_X + ((v - rangeStart) / rangeWidth) * plotWidth;

  const ticks = Array.from({ length: TICK_COUNT + 1 }, (_, i) => {
    const t = rangeStart + (rangeWidth * i) / TICK_COUNT;
    return {
      value: t,
      x: xFor(t),
      label: formatTimeLabel(t, timeline.range?.start ?? events[0].start),
    };
  });

  const title = timeline.title ?? "이벤트 타임라인";

  return (
    <div className="w-full max-w-full border border-brand-ink bg-brand-canvas">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="w-full flex items-center justify-between gap-sm px-md py-xs bg-brand-surface-soft hover:bg-brand-ink-translucent-04 focus:outline-none focus:ring-2 focus:ring-brand-primary/15 transition-colors"
      >
        <span className="flex items-baseline gap-sm min-w-0 text-left">
          <span className="font-sans text-body-sm text-brand-ink truncate">
            {title}
          </span>
          <span className="font-sans text-caption text-brand-muted truncate">
            {orderedTracks.length} 트랙 · {events.length} 이벤트
          </span>
        </span>
        <Chevron expanded={expanded} />
      </button>

      <div
        className={[
          "grid transition-[grid-template-rows] duration-200 ease-out",
          expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        ].join(" ")}
      >
        <div className="overflow-hidden">
          <div className="border-t border-brand-ink relative" ref={containerRef}>
            <svg
              role="img"
              aria-label={title}
              width="100%"
              height={svgHeight}
              className="block"
            >
              {/* 시간축 ticks + 라벨 */}
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
                      textAnchor={i === 0 ? "start" : i === TICK_COUNT ? "end" : "middle"}
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

              {/* 트랙 라벨 + row 가이드 */}
              {orderedTracks.map((track, i) => {
                const y = AXIS_HEIGHT + i * (ROW_HEIGHT + ROW_GAP);
                return (
                  <g key={track.key}>
                    {track.level === "step" && (
                      <rect
                        x={0}
                        y={y}
                        width={containerWidth}
                        height={ROW_HEIGHT}
                        fill={i % 2 === 0 ? "transparent" : "rgba(20,20,19,0.02)"}
                      />
                    )}
                    <text
                      x={TIMELINE_PADDING_X}
                      y={y + ROW_HEIGHT / 2 + 4}
                      fontSize={12}
                      fill="#3d3d3a"
                      fontWeight={track.level === "process" ? 600 : 400}
                    >
                      {track.label}
                    </text>
                  </g>
                );
              })}

              {/* 이벤트 막대 */}
              {numericEvents.map((ev, i) => {
                const trackKey = `${ev.level}::${ev.track}`;
                const ti = trackIndex.get(trackKey);
                if (ti === undefined) return null;
                const y = AXIS_HEIGHT + ti * (ROW_HEIGHT + ROW_GAP) + 3;
                const x1 = xFor(ev.startNum);
                const x2 = xFor(ev.endNum);
                const w = Math.max(2, x2 - x1);
                const fill = ev.color ?? LEVEL_DEFAULT_COLOR[ev.level];
                return (
                  <g key={i}>
                    <rect
                      x={x1}
                      y={y}
                      width={w}
                      height={ROW_HEIGHT - 6}
                      fill={fill}
                      rx={2}
                      onMouseEnter={(e) =>
                        setHover({
                          item: ev,
                          x: e.clientX,
                          y: e.clientY,
                        })
                      }
                      onMouseMove={(e) =>
                        setHover({
                          item: ev,
                          x: e.clientX,
                          y: e.clientY,
                        })
                      }
                      onMouseLeave={() => setHover(null)}
                    />
                    {w > 60 && (
                      <text
                        x={x1 + 6}
                        y={y + (ROW_HEIGHT - 6) / 2 + 4}
                        fontSize={11}
                        fill="#faf9f5"
                        pointerEvents="none"
                      >
                        {ev.label}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>

            {/* hover tooltip */}
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
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────

/**
 * 시간 비교 가능 값으로 변환. number 면 그대로, string 이면 ISO/HH:MM[:SS]
 * 같은 시간 형식을 best-effort 로 ms 단위로 변환.
 */
function toComparable(v: string | number): number {
  if (typeof v === "number") return v;
  // HH:MM 또는 HH:MM:SS — 임의 기준일(1970-01-01) 에 붙여 비교
  const timeMatch = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(v);
  if (timeMatch) {
    const h = parseInt(timeMatch[1], 10);
    const m = parseInt(timeMatch[2], 10);
    const s = timeMatch[3] ? parseInt(timeMatch[3], 10) : 0;
    return ((h * 60 + m) * 60 + s) * 1000;
  }
  // ISO 등 Date 가 파싱 가능한 경우
  const t = Date.parse(v);
  if (!Number.isNaN(t)) return t;
  // fallback — 첫 글자 코드 (가능한 한 lexicographic 한 비교 흉내)
  return 0;
}

function formatTimeLabel(v: number, sample: string | number): string {
  // sample 형식에 맞춰 출력. v 는 toComparable 결과.
  if (typeof sample === "number") return String(Math.round(v));
  const sampleStr = String(sample);
  const isHHMM = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.test(sampleStr);
  if (isHHMM) {
    const totalSec = Math.round(v / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    const hasSec = /:\d{2}$/.test(sampleStr.split(":").slice(-1)[0]) && sampleStr.split(":").length >= 3;
    return hasSec
      ? `${pad2(h)}:${pad2(m)}:${pad2(s)}`
      : `${pad2(h)}:${pad2(m)}`;
  }
  // ISO fallback — HH:MM 만 표기
  const d = new Date(v);
  if (!Number.isNaN(d.getTime())) {
    return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  }
  return String(Math.round(v));
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function orderTracks(events: EventTimelineItem[]): {
  key: string;
  label: string;
  level: EventTimelineLevel;
}[] {
  const seen = new Map<
    string,
    { key: string; label: string; level: EventTimelineLevel; orderInLevel: number }
  >();
  let processOrder = 0;
  let stepOrder = 0;
  for (const ev of events) {
    const key = `${ev.level}::${ev.track}`;
    if (seen.has(key)) continue;
    const orderInLevel =
      ev.level === "process" ? processOrder++ : stepOrder++;
    seen.set(key, { key, label: ev.track, level: ev.level, orderInLevel });
  }
  // process 먼저, step 다음. 각 level 내 입력 순서.
  return [...seen.values()].sort((a, b) => {
    if (a.level !== b.level) return a.level === "process" ? -1 : 1;
    return a.orderInLevel - b.orderInLevel;
  });
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
