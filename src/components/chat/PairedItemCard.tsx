"use client";

import { useState } from "react";
import type {
  MessageChart,
  MessageChartEntry,
  MessageTable,
  MessageTableEntry,
} from "@/lib/types";
import { MessageChart as MessageChartView } from "./MessageChart";
import { MessageDataTable } from "./MessageDataTable";

/**
 * 다중 paired 항목(#45) 을 표시하는 collapsible 카드.
 *
 * - 제목 바는 항상 표시 (제목 + 메타 — 행/칼럼 수 또는 차트 타입)
 * - 본문은 토글로 펼침/접힘. 슬라이드 다운 transition.
 * - 디폴트는 호출 측에서 결정 (`defaultExpanded` prop) — 좌·우 컬럼 첫
 *   항목만 펼쳐진 상태로 시작
 * - 펼친 상태에서:
 *   - 표: ~280px (≈ 10행) 으로 cap. 내부 [펼치기]/[확장]/[CSV 복사]
 *     액션 그대로 사용 가능
 *   - 차트: 240px 그대로 (MessageChart 내장)
 */
type Props = {
  kind: "table" | "chart";
  payload: MessageTableEntry | MessageChartEntry;
  defaultExpanded?: boolean;
  bubbleRef?: React.RefObject<HTMLDivElement | null>;
};

const TABLE_CARD_MAX_HEIGHT = 280; // ≈ 10 rows

export function PairedItemCard({
  kind,
  payload,
  defaultExpanded = false,
  bubbleRef,
}: Props) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const { title, meta } =
    kind === "table"
      ? deriveTableLabel(payload as MessageTable)
      : deriveChartLabel(payload as MessageChart);

  return (
    <div className="border border-brand-hairline bg-brand-canvas">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="w-full flex items-center justify-between gap-sm px-md py-xs text-left hover:bg-brand-ink-translucent-04 focus:outline-none focus:ring-2 focus:ring-brand-primary/15 transition-colors"
      >
        <span className="flex items-baseline gap-sm min-w-0">
          <span className="font-sans text-body-sm text-brand-ink truncate">
            {title}
          </span>
          {meta && (
            <span className="font-sans text-caption text-brand-muted truncate">
              {meta}
            </span>
          )}
        </span>
        <Chevron expanded={expanded} />
      </button>
      {/* 슬라이드 다운/업 — grid-template-rows transition. content 는
          overflow-hidden 이라 접힌 상태에서 잘려 안 보임. */}
      <div
        className={[
          "grid transition-[grid-template-rows] duration-200 ease-out",
          expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        ].join(" ")}
      >
        <div className="overflow-hidden">
          <div className="border-t border-brand-hairline">
            {kind === "table" ? (
              <MessageDataTable
                table={payload as MessageTable}
                maxHeight={TABLE_CARD_MAX_HEIGHT}
                bubbleRef={bubbleRef}
              />
            ) : (
              <MessageChartView chart={payload as MessageChart} />
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

function deriveTableLabel(t: MessageTable): { title: string; meta: string } {
  const title = t.title ?? "표";
  const cols = t.columns?.length ?? Object.keys(t.rows[0] ?? {}).length;
  const meta = `${t.rows.length}행 × ${cols}칼럼`;
  return { title, meta };
}

function deriveChartLabel(c: MessageChart): { title: string; meta: string } {
  const title = c.options?.title ?? "차트";
  const meta = `${c.type} chart`;
  return { title, meta };
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
