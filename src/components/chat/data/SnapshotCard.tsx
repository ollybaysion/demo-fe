"use client";

import { useState } from "react";
import type { DataSnapshot } from "@/lib/types";

/**
 * 스냅샷 한 장.
 *
 * 상태 축은 체크박스 하나다 — 체크된 스냅샷은 내용까지 요청에 실리고, 해제하면
 * 아예 실리지 않는다. (NotebookLM 소스 선택과 같은 관례. 동봉/고정 2축은 사용자가
 * 읽지 못해 접었다.)
 *
 * 표를 다 보여주지 않는다 — 좁은 패널에서 수천 행을 그리면 패널이 쓸모없어진다.
 * 접힌 상태에서는 머리말(컬럼 수·행 수·시각)만 보이고, 펼치면 앞 몇 행만 미리보기로
 * 보여준다. "전부 보기"는 이 패널의 일이 아니다.
 */
const PREVIEW_ROWS = 5;

type Props = {
  snapshot: DataSnapshot;
  onToggleIncluded: (id: string) => void;
  onRemove: (id: string) => void;
  /** 라벨 인라인 편집 — 등록은 이름 없이 끝나므로, 식별이 필요해진 시점에 여기서 짓는다. */
  onRename: (id: string, label: string) => void;
};

export function SnapshotCard({
  snapshot,
  onToggleIncluded,
  onRemove,
  onRename,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const preview = snapshot.rows.slice(0, PREVIEW_ROWS);
  const hidden = snapshot.rows.length - preview.length;

  function startEdit() {
    setDraft(snapshot.label);
    setEditing(true);
  }

  function commitEdit() {
    const next = draft.trim();
    if (next.length > 0 && next !== snapshot.label) {
      onRename(snapshot.id, next);
    }
    setEditing(false);
  }

  const meta = `${snapshot.columns.length}열 · ${snapshot.rows.length}행 · ${formatCapturedAt(snapshot.capturedAt)}`;

  return (
    <div className="rounded-md border border-brand-hairline bg-brand-surface-card px-sm py-xs flex flex-col gap-xxs">
      <div className="flex items-start gap-xs">
        <input
          type="checkbox"
          checked={snapshot.included}
          onChange={() => onToggleIncluded(snapshot.id)}
          aria-label={`${snapshot.label} 요청에 포함`}
          title={
            snapshot.included
              ? "요청에서 빼기"
              : "요청에 포함 — 내용까지 함께 나갑니다"
          }
          className="mt-[3px] shrink-0 w-4 h-4 accent-brand-primary cursor-pointer"
        />

        {editing ? (
          <div className="flex-1 min-w-0">
            <input
              autoFocus
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitEdit();
                if (e.key === "Escape") setEditing(false);
              }}
              onBlur={commitEdit}
              aria-label="스냅샷 이름 편집"
              className="w-full min-w-0 bg-brand-canvas text-brand-ink text-body-sm rounded-sm border border-brand-primary px-xs py-[2px] focus:outline-none focus:ring-2 focus:ring-brand-primary/15"
            />
            <span className="block text-caption text-brand-muted">{meta}</span>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            className="flex-1 min-w-0 text-left focus:outline-none focus:ring-2 focus:ring-brand-primary/15 rounded-xs"
          >
            <span
              className={[
                "block text-body-sm truncate",
                snapshot.included ? "text-brand-ink" : "text-brand-muted",
              ].join(" ")}
            >
              {snapshot.label}
            </span>
            <span className="block text-caption text-brand-muted">{meta}</span>
          </button>
        )}

        {!editing && (
          <button
            type="button"
            onClick={startEdit}
            aria-label={`${snapshot.label} 이름 바꾸기`}
            title="이름 바꾸기"
            className="shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-full text-brand-muted hover:text-brand-primary hover:bg-brand-ink-translucent-04 focus:outline-none focus:ring-2 focus:ring-brand-primary/15 transition-colors"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
            </svg>
          </button>
        )}

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

      {snapshot.warnings.includes("ZERO_ROWS") && (
        <span className="text-caption text-brand-muted-soft">행 없음</span>
      )}

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
