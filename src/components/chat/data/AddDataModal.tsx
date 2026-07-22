"use client";

import { useEffect, useState } from "react";
import type { AddSnapshotResult } from "./useDataSnapshots";

/**
 * 데이터 추가 모달 — 패널 헤더의 [+ 추가] 가 연다.
 *
 * 붙여넣기가 전부다. 이름을 묻지 않고(라벨은 내용에서 자동 생성, 카드에서 개명),
 * 등록되면 체크된 채로 목록에 들어간다.
 *
 * 파싱 실패는 모달 안에 남긴다 — 붙여넣은 텍스트를 지우지 않는 것이 중요한데,
 * 실패하는 입력일수록 사용자가 다시 만들기 번거롭기 때문이다(SQL 재실행).
 */
type Props = {
  open: boolean;
  onClose: () => void;
  onAdd: (input: string) => AddSnapshotResult;
  /**
   * 붙여넣기 즉시 등록이 실패했을 때 — 그 텍스트와 실패 사유를 그대로 안고
   * 열린다. 사용자가 붙여넣은 것을 잃지 않고 원인을 보게 하기 위한 것.
   */
  seed?: { text: string; error: { code: string; message: string } } | null;
};

export function AddDataModal({ open, onClose, onAdd, seed }: Props) {
  const [text, setText] = useState("");
  const [error, setError] = useState<{ code: string; message: string } | null>(
    null,
  );

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // seed 가 바뀌면 그걸로 채운다 — 없으면 이전 내용 유지(실패한 입력은 다시
  // 만들기 번거로우니 지우지 않는다). effect 대신 렌더 중 상태 조정 패턴.
  const [appliedSeed, setAppliedSeed] = useState<typeof seed>(null);
  if (seed !== appliedSeed) {
    setAppliedSeed(seed);
    if (seed) {
      setText(seed.text);
      setError(seed.error);
    }
  }

  if (!open) return null;

  function submit() {
    if (text.trim().length === 0) return;
    const result = onAdd(text);
    if (!result.ok) {
      setError({ code: result.code, message: result.message });
      return;
    }
    setError(null);
    setText("");
    onClose();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="데이터 추가"
      className="fixed inset-0 z-50 flex items-center justify-center p-md"
    >
      <div
        className="absolute inset-0 bg-brand-ink/40"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative w-full max-w-[32rem] bg-brand-canvas rounded-lg shadow-xl flex flex-col">
        <div className="flex items-center justify-between px-md py-sm border-b border-brand-hairline">
          <h2 className="font-sans text-body-md text-brand-ink">데이터 추가</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="inline-flex items-center justify-center w-8 h-8 rounded-sm text-brand-muted hover:bg-brand-ink-translucent-04 hover:text-brand-ink focus:outline-none focus:ring-2 focus:ring-brand-primary/15 transition-colors"
          >
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
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="px-md py-sm flex flex-col gap-sm">
          <label className="block">
            <span className="block text-caption text-brand-muted mb-xxs">
              조회 결과 붙여넣기
            </span>
            <textarea
              autoFocus
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                if (error) setError(null);
              }}
              rows={10}
              placeholder={
                "SQL Developer 그리드를 복사해 붙여넣으세요.\nCSV·TSV 도 됩니다."
              }
              className="w-full min-w-0 bg-brand-canvas text-brand-ink font-mono text-caption rounded-md border border-brand-hairline px-sm py-xs resize-y focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/15 transition-colors"
            />
          </label>

          {error && (
            <p
              role="alert"
              className="text-caption text-brand-error bg-brand-error-soft rounded-sm px-sm py-xs"
            >
              <span className="font-semibold">{error.code}</span> —{" "}
              {error.message}
            </p>
          )}

          <div className="flex items-center justify-between gap-xs">
            <p className="text-caption text-brand-muted-soft min-w-0">
              이름은 내용에서 자동으로 만들어집니다 — 카드에서 바꿀 수 있어요.
            </p>
            <button
              type="button"
              onClick={submit}
              disabled={text.trim().length === 0}
              className="shrink-0 inline-flex items-center h-8 px-md rounded-md bg-brand-primary text-brand-on-primary text-body-sm font-medium hover:bg-brand-primary-active disabled:bg-brand-surface-card disabled:text-brand-muted-soft disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-brand-primary/40 transition-colors"
            >
              등록
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
