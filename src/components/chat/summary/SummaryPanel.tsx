"use client";

import { type ReactNode, useState } from "react";
import { CONTEXT_LABELS } from "@/config/contextColumns";
import type { ContextRow } from "@/lib/types";
import type { TimeRange } from "../context/useContextRows";

/**
 * 대화 요약 패널 — 운영자 인계용 사이드 패널.
 *
 * Phase 1: 백엔드 미연결 상태. 상단은 컨텍스트 패널의 설비 정보를
 *          key:value 로 보여주고, 하단 요약은 placeholder 텍스트.
 *          [복사]: 패널 전체 내용을 markdown 형태로 클립보드에 복사.
 *          [다시 요약]: 백엔드 없으니 disabled.
 *          [닫기]: 패널만 닫음 (메모리에는 유지).
 *
 * Phase 2 (추후): props 로 summary text + onResummarize 받아 실제
 *               백엔드 응답 표시 + 재요청 가능.
 */

const PHASE1_PLACEHOLDER = "백엔드 아직 없음 — 요약 기능은 연결 후 활성됩니다.";

type Props = {
  open: boolean;
  rows: ContextRow[];
  timeRange: TimeRange;
  /**
   * 채팅에 인입된 비교 결과의 마크다운 본문 (Phase 3). 있으면
   * "비교 결과" Section + 클립보드 복사 본문에 자동 동봉. 없으면 미노출.
   */
  compareDigest?: string;
};

export function SummaryPanel({ open, rows, timeRange, compareDigest }: Props) {
  const summaryText = PHASE1_PLACEHOLDER;
  const [copyStatus, setCopyStatus] = useState<"idle" | "success" | "error">(
    "idle",
  );

  async function handleCopy() {
    const text = formatPanelText(rows, timeRange, summaryText, compareDigest);
    try {
      await navigator.clipboard.writeText(text);
      setCopyStatus("success");
    } catch {
      setCopyStatus("error");
    }
    window.setTimeout(() => setCopyStatus("idle"), 1500);
  }

  return (
    <aside
      aria-label="대화 요약 패널"
      aria-hidden={!open}
      className={[
        "shrink-0 overflow-hidden",
        "transition-[width] duration-200 ease-out",
        open ? "w-[320px]" : "w-0",
        "border-l border-brand-hairline bg-brand-canvas",
      ].join(" ")}
    >
      <div className="w-[320px] h-full flex flex-col">
        <header className="px-lg pt-lg pb-md border-b border-brand-hairline-soft">
          <h2 className="font-sans text-title-md text-brand-ink">대화 요약</h2>
          <p className="mt-xxs text-body-sm text-brand-muted">
            운영 담당자에게 인계할 정보를 한눈에.
          </p>
        </header>

        <div className="flex-1 overflow-y-auto">
          <div className="px-lg py-lg flex flex-col gap-lg">
            <Section title="설비 정보">
              <EquipmentList rows={rows} />
            </Section>
            <Section title="발생 시간">
              <TimeRangeReadout range={timeRange} />
            </Section>
            {compareDigest && (
              <Section title="비교 결과">
                <pre className="text-caption text-brand-ink whitespace-pre-wrap font-mono leading-relaxed">
                  {compareDigest}
                </pre>
              </Section>
            )}
            <Section title="요약">
              <p className="text-body-sm text-brand-muted">{summaryText}</p>
              <div className="mt-md flex items-center gap-xs">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="h-8 px-md rounded-md text-button bg-brand-primary text-brand-on-primary hover:bg-brand-primary-active focus:outline-none focus:ring-2 focus:ring-brand-primary/30 transition-colors"
                >
                  복사
                </button>
                <button
                  type="button"
                  disabled
                  title="백엔드 연결 후 활성됩니다"
                  className="h-8 px-md rounded-md text-button bg-brand-primary-disabled text-brand-muted cursor-not-allowed"
                >
                  다시 요약
                </button>
              </div>
              {copyStatus === "success" && (
                <p
                  role="status"
                  className="mt-xs text-caption text-brand-success"
                >
                  클립보드에 복사되었습니다.
                </p>
              )}
              {copyStatus === "error" && (
                <p
                  role="status"
                  className="mt-xs text-caption text-brand-error"
                >
                  복사에 실패했습니다. 브라우저 권한을 확인해주세요.
                </p>
              )}
            </Section>
          </div>
        </div>
      </div>
    </aside>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h3 className="font-sans text-title-sm text-brand-muted mb-xs">
        {title}
      </h3>
      {children}
    </section>
  );
}

function EquipmentList({ rows }: { rows: ContextRow[] }) {
  // Filter rows that have any actual input.
  const cleaned = rows
    .map((r) => ({
      ...r,
      chambers: r.chambers
        .map((c) => ({
          ...c,
          sensors: c.sensors.filter((s) => s.name.trim().length > 0),
        }))
        .filter(
          (c) => c.name.trim().length > 0 || c.sensors.length > 0,
        ),
    }))
    .filter(
      (r) => r.equipment.trim().length > 0 || r.chambers.length > 0,
    );

  if (cleaned.length === 0) {
    return (
      <p className="text-body-sm text-brand-muted-soft">(입력된 설비 없음)</p>
    );
  }

  return (
    <ul className="flex flex-col gap-md">
      {cleaned.map((row) => (
        <li key={row.id} className="flex flex-col gap-xxs">
          <KeyValue
            k={CONTEXT_LABELS.equipment.label}
            v={row.equipment.trim() || "(미입력)"}
          />
          {row.chambers.map((chamber) => (
            <div key={chamber.id} className="ml-md flex flex-col gap-xxs">
              <KeyValue
                k={CONTEXT_LABELS.chamber.label}
                v={chamber.name.trim() || "(미입력)"}
              />
              {chamber.sensors.length > 0 && (
                <div className="ml-md">
                  <KeyValue
                    k={CONTEXT_LABELS.sensor.label}
                    v={chamber.sensors.map((s) => s.name).join(", ")}
                  />
                </div>
              )}
            </div>
          ))}
        </li>
      ))}
    </ul>
  );
}

function TimeRangeReadout({ range }: { range: TimeRange }) {
  if (!range.start && !range.end) {
    return (
      <p className="text-body-sm text-brand-muted-soft">(미지정)</p>
    );
  }
  return (
    <p className="text-body-sm text-brand-ink font-mono">
      {range.start || "(미지정)"} ~ {range.end || "(미지정)"}
    </p>
  );
}

function KeyValue({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex gap-xs">
      <span className="text-caption text-brand-muted shrink-0">{k}:</span>
      <span className="text-body-sm text-brand-ink">{v}</span>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// Clipboard formatter — markdown-ish for ops chat / email
// ────────────────────────────────────────────────────────────────────

function formatPanelText(
  rows: ContextRow[],
  timeRange: TimeRange,
  summary: string,
  compareDigest?: string,
): string {
  const lines: string[] = [];
  lines.push("# 대화 요약");

  const cleaned = rows
    .map((r) => ({
      ...r,
      chambers: r.chambers
        .map((c) => ({
          ...c,
          sensors: c.sensors.filter((s) => s.name.trim().length > 0),
        }))
        .filter((c) => c.name.trim().length > 0 || c.sensors.length > 0),
    }))
    .filter((r) => r.equipment.trim().length > 0 || r.chambers.length > 0);

  if (cleaned.length > 0) {
    lines.push("");
    lines.push("## 설비 정보");
    for (const row of cleaned) {
      lines.push(
        `- ${CONTEXT_LABELS.equipment.label}: ${row.equipment.trim() || "(미입력)"}`,
      );
      for (const chamber of row.chambers) {
        lines.push(
          `  - ${CONTEXT_LABELS.chamber.label}: ${chamber.name.trim() || "(미입력)"}`,
        );
        if (chamber.sensors.length > 0) {
          lines.push(
            `    - ${CONTEXT_LABELS.sensor.label}: ${chamber.sensors.map((s) => s.name).join(", ")}`,
          );
        }
      }
    }
  }

  if (timeRange.start || timeRange.end) {
    lines.push("");
    lines.push("## 발생 시간");
    lines.push(
      `- ${timeRange.start || "(미지정)"} ~ ${timeRange.end || "(미지정)"}`,
    );
  }

  lines.push("");
  lines.push("## 요약");
  lines.push(summary);

  if (compareDigest) {
    lines.push("");
    lines.push("## 비교 결과");
    lines.push(compareDigest);
  }

  return lines.join("\n");
}
