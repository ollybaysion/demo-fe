"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import type { MessageTable } from "@/lib/types";

/**
 * 어시스턴트 메시지의 paired 데이터 표.
 *
 * - 표 자체에 통합된 제목 행: 테두리 안 맨 위, 헤더 위, 칼럼 전체 폭으로
 *   제목 + 우측 토글 (▼/▲). 디폴트는 `defaultExpanded` prop 으로 결정
 *   (좌·우 컬럼 첫 항목만 펼친 상태)
 * - 펼친 상태에서:
 *   - 행 cap: ~280px (≈10행) 내부 세로 스크롤 + 헤더 sticky
 *   - 액션: [펼치기] (cap 해제) / [확장] (overlay, 가로 overflow 시) /
 *     [CSV 복사]
 * - 너비: `w-fit max-w-full` — 칼럼 합계만큼 + 부모 폭 cap. 초과 시 가로
 *   스크롤
 *
 * 백엔드(/api/fdc/v1/chat) 페이로드의 `table` 필드를 그대로 받음.
 */
type Props = {
  table: MessageTable;
  /** 디폴트 펼침 여부. 미지정 시 true. */
  defaultExpanded?: boolean;
  /**
   * 풍선 DOM ref — [확장] overlay 의 위치/높이를 풍선과 정렬하기 위함.
   * 비면 overlay 가 viewport 정중앙에 띄워짐 (fallback).
   */
  bubbleRef?: React.RefObject<HTMLDivElement | null>;
  /**
   * 메시지 단위 일괄 fold/unfold 명령. tick 증가 시 collapseExpanded
   * 를 !folded 로 sync. 첫 렌더(tick=0) 무시 — defaultExpanded 보존.
   */
  foldCmd?: { folded: boolean; tick: number };
};

const TABLE_BODY_CAP_PX = 280; // ≈ 10 rows

export function MessageDataTable({
  table,
  defaultExpanded = true,
  bubbleRef,
  foldCmd,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [overflowsY, setOverflowsY] = useState(false);
  const [overflowsX, setOverflowsX] = useState(false);
  const [justCopied, setJustCopied] = useState(false);
  // collapse: 표 전체 본문 보이기/감추기 (제목 바 토글)
  const [collapseExpanded, setCollapseExpanded] = useState(defaultExpanded);
  // height-cap-removal: [펼치기] 액션 — 280px cap 해제
  const [heightExpanded, setHeightExpanded] = useState(false);
  // [확장] overlay — 가로 폭이 부모를 초과할 때 풍선과 같은 높이로 폭만
  // 풀로 펼쳐 표를 보는 모드. 메시지마다 독립 상태.
  const [maximized, setMaximized] = useState(false);
  // overlay 의 viewport top 좌표만 트래킹 — 높이는 33.33vh 고정 (CSS).
  const [overlayTop, setOverlayTop] = useState<number | null>(null);

  // 메시지 단위 fold/unfold 명령 sync. tick=0 (초기) 은 무시.
  // 렌더 중 prev-state 비교 — useEffect cascade 회피 (React 19 권장).
  const [prevFoldTick, setPrevFoldTick] = useState(foldCmd?.tick ?? 0);
  if (foldCmd && foldCmd.tick !== prevFoldTick) {
    setPrevFoldTick(foldCmd.tick);
    if (foldCmd.tick > 0) setCollapseExpanded(!foldCmd.folded);
  }

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
  }, [heightExpanded, collapseExpanded, table]);

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

  const title = table.title ?? "표";
  const effectiveMaxHeight = heightExpanded ? undefined : TABLE_BODY_CAP_PX;
  // [펼치기]: cap 이 적용된 상태에서 콘텐츠가 잘릴 때만, 또는 이미 펼쳐진
  // 상태에서 다시 접을 수 있도록 노출.
  const showHeightToggle = overflowsY || heightExpanded;
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

  const toggleCollapse = () => setCollapseExpanded((v) => !v);

  return (
    <>
      <div className="w-fit max-w-full border border-brand-ink bg-brand-canvas">
        {/* 제목 행 — 표 테두리 안 맨 위, 헤더 위. 컬럼 전체 폭.
            구성: [제목 클릭 영역] [액션 버튼들 (펼친 상태에서만)] [chevron]
            제목 / chevron 영역은 collapse 토글, 액션 버튼은 자기 동작. */}
        <div className="w-full flex items-center bg-brand-surface-soft">
          <button
            type="button"
            onClick={toggleCollapse}
            aria-expanded={collapseExpanded}
            className="flex-1 min-w-0 flex items-baseline gap-sm text-left px-md py-xs hover:bg-brand-ink-translucent-04 focus:outline-none focus:ring-2 focus:ring-brand-primary/15 transition-colors"
          >
            <span className="font-sans text-body-sm text-brand-ink truncate">
              {title}
            </span>
            <span className="font-sans text-caption text-brand-muted truncate">
              {table.rows.length}행 × {columns.length}칼럼
            </span>
          </button>
          {collapseExpanded && (
            <div className="flex gap-xxs px-xs shrink-0">
              {showHeightToggle && (
                <TableActionButton
                  onClick={() => setHeightExpanded((v) => !v)}
                  aria-label={heightExpanded ? "표 접기" : "표 풀 펼침"}
                  aria-expanded={heightExpanded}
                >
                  {heightExpanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
                  <span>{heightExpanded ? "접기" : "펼치기"}</span>
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
          )}
          <button
            type="button"
            onClick={toggleCollapse}
            aria-label={collapseExpanded ? "표 접기" : "표 펼치기"}
            aria-expanded={collapseExpanded}
            className="shrink-0 px-md py-xs hover:bg-brand-ink-translucent-04 focus:outline-none focus:ring-2 focus:ring-brand-primary/15 transition-colors"
          >
            <Chevron expanded={collapseExpanded} />
          </button>
        </div>

        {/* 본문 — 표 영역만. 액션은 제목 행으로 이동됐으므로 여기엔 표만. */}
        <div
          className={[
            "grid transition-[grid-template-rows] duration-200 ease-out",
            collapseExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
          ].join(" ")}
        >
          <div className="overflow-hidden">
            <div className="border-t border-brand-ink">
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

// ────────────────────────────────────────────────────────────────────
// Expanded overlay — fixed full-width 패널. 앱의 겹침 패널 톤
// (z-30, 얇은 테두리, 그림자) 을 따른다.
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
    <table className="text-body-sm font-mono border-collapse w-full">
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
