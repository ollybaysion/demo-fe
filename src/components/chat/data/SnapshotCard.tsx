"use client";

import { useState } from "react";
import type { DataSnapshot } from "@/lib/types";

/**
 * 스냅샷 한 장.
 *
 * 표를 다 보여주지 않는다 — 320px 패널에서 수천 행을 그리면 패널이 쓸모없어진다.
 * 접힌 상태에서는 머리말(컬럼 수·행 수·시각)만 보이고, 펼치면 앞 몇 행만 미리보기로
 * 보여준다. "전부 보기"는 이 패널의 일이 아니다.
 */
const PREVIEW_ROWS = 5;

type Props = {
  snapshot: DataSnapshot;
  onToggleIncluded: (id: string) => void;
  onTogglePinned: (id: string) => void;
  onRemove: (id: string) => void;
};

export function SnapshotCard({
  snapshot,
  onToggleIncluded,
  onTogglePinned,
  onRemove,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const preview = snapshot.rows.slice(0, PREVIEW_ROWS);
  const hidden = snapshot.rows.length - preview.length;

  return (
    <div className="rounded-md border border-brand-hairline bg-brand-surface-card px-sm py-xs flex flex-col gap-xxs">
      <div className="flex items-start gap-xxs">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="flex-1 min-w-0 text-left focus:outline-none focus:ring-2 focus:ring-brand-primary/15 rounded-xs"
        >
          <span className="block text-body-sm text-brand-ink truncate">
            {snapshot.label}
          </span>
          <span className="block text-caption text-brand-muted">
            {snapshot.columns.length}열 · {snapshot.rows.length}행 ·{" "}
            {formatCapturedAt(snapshot.capturedAt)}
          </span>
        </button>

        <button
          type="button"
          onClick={() => onRemove(snapshot.id)}
          aria-label={`${snapshot.label} 삭제`}
          title="삭제"
          className="shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-full text-brand-muted hover:text-brand-error hover:bg-brand-ink-translucent-04 focus:outline-none focus:ring-2 focus:ring-brand-primary/15 transition-colors"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div className="flex items-center gap-xxs flex-wrap">
        <Chip
          active={snapshot.included}
          onClick={() => onToggleIncluded(snapshot.id)}
          title={
            snapshot.included
              ? "요청에서 빼기"
              : "요청에 동봉 — 모델이 이 표를 가져갈 수 있게"
          }
        >
          동봉
        </Chip>
        <Chip
          active={snapshot.pinned}
          onClick={() => onTogglePinned(snapshot.id)}
          title={
            snapshot.pinned
              ? "고정 해제 — 내용은 필요할 때만 전달"
              : "고정 — 표 전문을 요청에 실어 반드시 보게 한다"
          }
        >
          📌 고정
        </Chip>
        {snapshot.warnings.includes("ZERO_ROWS") && (
          <span className="text-caption text-brand-muted-soft">행 없음</span>
        )}
      </div>

      {expanded && (
        <div className="overflow-x-auto border-t border-brand-hairline-soft pt-xxs">
          <table className="text-caption font-mono">
            <thead>
              <tr>
                {snapshot.columns.map((c) => (
                  <th
                    key={c}
                    className="text-left text-brand-muted font-normal px-xxs whitespace-nowrap"
                  >
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {preview.map((row, i) => (
                <tr key={i}>
                  {row.map((cell, j) => (
                    <td
                      key={j}
                      className="text-brand-ink px-xxs whitespace-nowrap"
                    >
                      {/* NULL 과 빈 문자열은 다른 것이다 — 엔진이 구별해 담았으니
                          화면에서도 접지 않는다. */}
                      {cell === null ? (
                        <span className="text-brand-muted-soft italic">
                          NULL
                        </span>
                      ) : (
                        cell
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {hidden > 0 && (
            <p className="text-caption text-brand-muted-soft px-xxs pt-xxs">
              … 외 {hidden}행
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function Chip({
  active,
  onClick,
  title,
  children,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      title={title}
      className={[
        "text-caption rounded-pill px-sm py-xxs transition-colors",
        "focus:outline-none focus:ring-2 focus:ring-brand-primary/15",
        active
          ? "bg-brand-primary text-brand-on-primary"
          : "bg-brand-canvas text-brand-muted hover:text-brand-ink",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

/** 등록 시각을 짧게. 오늘이면 시:분만, 아니면 월/일. */
function formatCapturedAt(iso: string): string {
  if (!iso) return "시각 미상";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "시각 미상";
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  if (sameDay) return `${hh}:${mi}`;
  return `${d.getMonth() + 1}/${d.getDate()} ${hh}:${mi}`;
}
