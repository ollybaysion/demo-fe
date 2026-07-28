"use client";

import { type ReactNode, useState } from "react";

/**
 * 대화 요약 패널 — 운영자 인계용 사이드 패널.
 *
 * Phase 1: 백엔드 미연결 상태. 요약은 placeholder 텍스트.
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
  /**
   * 채팅에 인입된 비교 결과의 마크다운 본문 (Phase 3). 있으면
   * "비교 결과" Section + 클립보드 복사 본문에 자동 동봉. 없으면 미노출.
   */
  compareDigest?: string;
};

export function SummaryPanel({ open, compareDigest }: Props) {
  const summaryText = PHASE1_PLACEHOLDER;
  const [copyStatus, setCopyStatus] = useState<"idle" | "success" | "error">(
    "idle",
  );

  async function handleCopy() {
    const text = formatPanelText(summaryText, compareDigest);
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
      // 폭·테두리는 우측 탭 호스트(ChatContainer)가 소유한다.
      className={open ? "h-full overflow-hidden" : "hidden"}
    >
      <div className="w-full h-full flex flex-col">
        <header className="px-lg pt-lg pb-md border-b border-brand-hairline-soft">
          <h2 className="font-sans text-title-md text-brand-ink">대화 요약</h2>
          <p className="mt-xxs text-body-sm text-brand-muted">
            운영 담당자에게 인계할 정보를 한눈에.
          </p>
        </header>

        <div className="flex-1 overflow-y-auto scrollbar-none">
          <div className="px-lg py-lg flex flex-col gap-lg">
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

// ────────────────────────────────────────────────────────────────────
// Clipboard formatter — markdown-ish for ops chat / email
// ────────────────────────────────────────────────────────────────────

function formatPanelText(summary: string, compareDigest?: string): string {
  const lines: string[] = [];
  lines.push("# 대화 요약");

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
