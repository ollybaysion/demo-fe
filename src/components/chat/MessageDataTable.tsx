"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import type { MessageTable } from "@/lib/types";

/**
 * 어시스턴트 메시지의 좌측 gutter 에 paired 되는 데이터 표 (#34).
 *
 * - 칼럼 순서: `table.columns` 가 있으면 그 순서, 없으면 첫 row 의 키 순서
 * - 너비: content-sized + 부모 폭을 max — 칼럼 합계가 부모를 넘으면 가로 스크롤
 * - 높이: 부모(`ChatMessage`)에서 측정한 풍선 높이를 `maxHeight` 로 받아
 *   기본은 풍선 높이로 cap 하고 내부 세로 스크롤. 헤더는 sticky.
 *   사용자는 표 액션의 [펼치기] 로 풀 펼침, [CSV 복사] 로 CSV export.
 *   가로가 부모를 초과하는 경우(#42) [확장] 으로 화면 거의 풀 폭의
 *   fixed overlay 로 펼쳐 볼 수 있음 — `EquipmentDetailPanel` 패턴.
 * - read-only — 정렬 / 필터 / 편집 없음 (spec out-of-scope)
 *
 * 백엔드(/api/fdc/v1/chat) 페이로드의 `table` 필드를 그대로 받음.
 */
type Props = {
  table: MessageTable;
  /** 풍선 높이(px). 표를 풍선 높이로 cap 하기 위함. null/undefined 면 cap 없음. */
  maxHeight?: number | null;
  /** true 면 maxHeight 무시하고 풀 펼침. */
  expanded?: boolean;
  /** 토글 버튼 핸들러. 없으면 토글 버튼 자체를 노출하지 않음. */
  onToggleExpand?: () => void;
  /**
   * 풍선 DOM ref — [확장] overlay 의 위치/높이를 풍선과 정렬하기 위함.
   * 비면 overlay 가 viewport 정중앙에 띄워짐 (fallback).
   */
  bubbleRef?: React.RefObject<HTMLDivElement | null>;
};

export function MessageDataTable({
  table,
  maxHeight,
  expanded: externalExpanded,
  onToggleExpand: externalOnToggle,
  bubbleRef,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [overflowsY, setOverflowsY] = useState(false);
  const [overflowsX, setOverflowsX] = useState(false);
  const [justCopied, setJustCopied] = useState(false);
  // 외부 제어가 없으면 내부 state 로 [펼치기] 토글 자체 관리.
  // (PairedItemCard 안에서 사용될 때처럼 부모가 신경 안 쓰는 케이스)
  const [internalExpanded, setInternalExpanded] = useState(false);
  const expanded = externalExpanded ?? internalExpanded;
  const onToggleExpand =
    externalOnToggle ?? (() => setInternalExpanded((v) => !v));
  // [확장] overlay — 가로 폭이 부모를 초과할 때 풍선과 같은 높이로 폭만
  // 풀로 펼쳐 표를 보는 모드 (#42). 메시지마다 독립 상태.
  const [maximized, setMaximized] = useState(false);
  // overlay 의 viewport top 좌표만 트래킹 — 높이는 33.33vh 고정 (CSS).
  // 풍선 위치를 따라 anchor 하되 viewport 안에 들어가도록 clamp.
  const [overlayTop, setOverlayTop] = useState<number | null>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const check = () => {
      // 1px 정도의 오차는 무시 (서브픽셀 round 으로 깜빡임 방지).
      setOverflowsY(el.scrollHeight - el.clientHeight > 1);
      setOverflowsX(el.scrollWidth - el.clientWidth > 1);
    };
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [maxHeight, expanded, table]);

  // ESC 키로 overlay 닫기.
  useEffect(() => {
    if (!maximized) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMaximized(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [maximized]);

  // overlay 가 켜져 있을 때 풍선 위치 기준으로 overlay top 좌표를 계산.
  // 높이는 1/3 화면 고정. scroll / resize 시 capture 단계로 갱신해 내부
  // 스크롤 컨테이너의 이벤트도 잡음.
  useEffect(() => {
    if (!maximized || !bubbleRef) return;
    const update = () => {
      const el = bubbleRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const overlayHeight = vh / 3; // 33.33vh
      // 풍선 top 부터 시작, viewport 위쪽 16px 미만이면 16으로 끌어올림.
      const desiredTop = Math.max(rect.top, 16);
      // viewport 아래로 넘치면 위로 밀어넣음.
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

  const columns =
    table.columns ??
    (table.rows.length > 0 ? Object.keys(table.rows[0]) : []);

  if (table.rows.length === 0 || columns.length === 0) return null;

  const effectiveMaxHeight =
    !expanded && maxHeight != null ? maxHeight : undefined;
  const showExpandToggle =
    !!onToggleExpand && (overflowsY || !!expanded);
  const showMaximizeToggle = overflowsX || maximized;

  const handleCopyCsv = async () => {
    try {
      await navigator.clipboard.writeText(toCsv(columns, table.rows));
      setJustCopied(true);
      setTimeout(() => setJustCopied(false), 1500);
    } catch {
      // 권한 거부 / insecure context — v1 별도 처리 없음.
    }
  };

  return (
    <>
      <div className="flex flex-col items-end min-w-0">
        {/* 표 액션 — 표 상단에 둠. 메시지 액션과 달리 항상 100% opacity. */}
        <div className="flex gap-xxs mb-xxs">
          {showExpandToggle && (
            <TableActionButton
              onClick={onToggleExpand}
              aria-label={expanded ? "표 접기" : "표 펼치기"}
              aria-expanded={!!expanded}
            >
              {expanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
              <span>{expanded ? "접기" : "펼치기"}</span>
            </TableActionButton>
          )}
          {showMaximizeToggle && (
            <TableActionButton
              onClick={() => setMaximized((v) => !v)}
              aria-label={maximized ? "표 확장 닫기" : "표 확장"}
              aria-expanded={maximized}
            >
              {maximized ? <MinimizeIcon /> : <MaximizeIcon />}
              <span>{maximized ? "축소" : "확장"}</span>
            </TableActionButton>
          )}
          <TableActionButton
            onClick={handleCopyCsv}
            aria-label={justCopied ? "복사됨" : "CSV 형식으로 복사"}
          >
            {justCopied ? <CheckIcon /> : <CopyIcon />}
            <span>{justCopied ? "복사됨" : "CSV 복사"}</span>
          </TableActionButton>
        </div>
        {/* 디자인: 각진 사각형 + 얇은 검정 테두리. 헤더는 약간 회색 음영. */}
        <div className="w-fit max-w-full border border-brand-ink bg-brand-canvas">
          <div
            ref={scrollRef}
            className="overflow-auto"
            style={
              effectiveMaxHeight != null
                ? { maxHeight: effectiveMaxHeight }
                : undefined
            }
          >
            <TableMarkup columns={columns} rows={table.rows} />
          </div>
        </div>
      </div>

      {maximized && (
        <ExpandedTableOverlay
          columns={columns}
          rows={table.rows}
          onClose={() => setMaximized(false)}
          top={overlayTop}
        />
      )}
    </>
  );
}

// ────────────────────────────────────────────────────────────────────
// Expanded overlay (#42) — fixed full-width 패널. EquipmentDetailPanel
// 과 같은 톤(z-30, 얇은 테두리, 그림자) 으로.
// ────────────────────────────────────────────────────────────────────

function ExpandedTableOverlay({
  columns,
  rows,
  onClose,
  top,
}: {
  columns: string[];
  rows: Record<string, unknown>[];
  onClose: () => void;
  /** overlay 의 viewport top 좌표. 비면 fallback. */
  top: number | null;
}) {
  // 디자인: 맨 바깥 윤곽선만 옅은 회색 (brand-hairline). 너비 70%
  // (좌우 15% 마진), 높이 1/3 화면 고정.
  const overlayStyle: React.CSSProperties = {
    top: top ?? "33vh",
    height: "33.333vh",
  };

  return (
    <div
      role="dialog"
      aria-label="표 확장 보기"
      aria-modal="false"
      className="fixed left-[15%] right-[15%] z-30 bg-brand-canvas border border-brand-hairline shadow-md flex flex-col"
      style={overlayStyle}
    >
      <header className="px-md py-xs flex items-center justify-between gap-sm shrink-0">
        <span className="font-sans text-caption text-brand-muted">
          표 확장 보기 ({rows.length} 행 × {columns.length} 칼럼)
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="확장 닫기"
          title="닫기 (Esc)"
          className="shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-sm text-brand-muted hover:bg-brand-ink-translucent-04 hover:text-brand-ink focus:outline-none focus:ring-2 focus:ring-brand-primary/15 transition-colors"
        >
          <XIcon />
        </button>
      </header>
      <div className="flex-1 overflow-auto min-h-0">
        <TableMarkup columns={columns} rows={rows} />
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// Shared table markup
// ────────────────────────────────────────────────────────────────────

function TableMarkup({
  columns,
  rows,
}: {
  columns: string[];
  rows: Record<string, unknown>[];
}) {
  return (
    <table className="text-body-sm font-mono border-collapse">
      {/* sticky 헤더 — 세로 스크롤 시 thead 가 상단에 고정. */}
      <thead>
        <tr>
          {columns.map((c) => (
            <th
              key={c}
              scope="col"
              className="sticky top-0 z-10 bg-brand-surface-soft border-b border-brand-ink text-left text-caption text-brand-muted px-sm py-xxs whitespace-nowrap"
            >
              {c}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr
            key={i}
            className="border-b border-brand-ink last:border-b-0"
          >
            {columns.map((c) => (
              <td
                key={c}
                className="px-sm py-xxs text-brand-ink whitespace-nowrap align-top"
              >
                {formatCell(row[c])}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────

function TableActionButton({
  children,
  onClick,
  ...rest
}: {
  children: ReactNode;
  onClick: (() => void) | undefined;
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

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  // 중첩 객체 자동 펼치기는 spec out-of-scope — 임시로 JSON 문자열로.
  return JSON.stringify(value);
}

function escapeCsvField(v: string): string {
  // 콤마 / 따옴표 / 개행이 들어 있으면 따옴표로 감싸고 내부 따옴표는 escape.
  if (/[",\r\n]/.test(v)) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}

function toCsv(
  columns: string[],
  rows: Record<string, unknown>[],
): string {
  const lines = [columns.map(escapeCsvField).join(",")];
  for (const row of rows) {
    lines.push(
      columns.map((c) => escapeCsvField(formatCell(row[c]))).join(","),
    );
  }
  return lines.join("\r\n");
}

// ────────────────────────────────────────────────────────────────────
// Icons (메시지 액션 버튼과 동일 톤)
// ────────────────────────────────────────────────────────────────────

function ChevronDownIcon() {
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
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function ChevronUpIcon() {
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
      <polyline points="18 15 12 9 6 15" />
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

function CopyIcon() {
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
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckIcon() {
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
      <polyline points="20 6 9 17 4 12" />
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
