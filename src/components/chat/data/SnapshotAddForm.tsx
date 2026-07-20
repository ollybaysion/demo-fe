"use client";

import { useState } from "react";
import type { AddSnapshotResult } from "./useDataSnapshots";

/**
 * 스냅샷 등록 폼 — 이름 + 붙여넣기.
 *
 * 파싱 실패는 폼 안에 남긴다. 붙여넣은 텍스트를 지우지 않는 것이 중요한데,
 * 실패하는 입력일수록 사용자가 다시 만들기 번거롭기 때문이다(SQL 재실행).
 */
type Props = {
  onAdd: (input: string, label: string) => AddSnapshotResult;
};

export function SnapshotAddForm({ onAdd }: Props) {
  const [label, setLabel] = useState("");
  const [text, setText] = useState("");
  const [error, setError] = useState<{ code: string; message: string } | null>(
    null,
  );

  function submit() {
    if (text.trim().length === 0) return;
    const result = onAdd(text, label);
    if (!result.ok) {
      setError({ code: result.code, message: result.message });
      return;
    }
    setError(null);
    setLabel("");
    setText("");
  }

  return (
    <div className="flex flex-col gap-sm">
      <label className="block">
        <span className="block text-caption text-brand-muted mb-xxs">이름</span>
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="예: 챔버A 센서 목록"
          className="w-full min-w-0 bg-brand-canvas text-brand-ink font-sans text-body-sm rounded-md border border-brand-hairline px-sm py-[6px] focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/15 transition-colors"
        />
      </label>

      <label className="block">
        <span className="block text-caption text-brand-muted mb-xxs">
          조회 결과 붙여넣기
        </span>
        <textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            if (error) setError(null);
          }}
          rows={5}
          placeholder={"SQL Developer 그리드를 복사해 붙여넣으세요.\nCSV·TSV 도 됩니다."}
          className="w-full min-w-0 bg-brand-canvas text-brand-ink font-mono text-caption rounded-md border border-brand-hairline px-sm py-xs resize-y focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/15 transition-colors"
        />
      </label>

      {error && (
        <p
          role="alert"
          className="text-caption text-brand-error bg-brand-error-soft rounded-sm px-sm py-xs"
        >
          <span className="font-semibold">{error.code}</span> — {error.message}
        </p>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={text.trim().length === 0}
        className="self-end inline-flex items-center gap-xxs h-8 px-md rounded-md bg-brand-primary text-brand-on-primary text-body-sm font-medium hover:bg-brand-primary-active disabled:bg-brand-surface-card disabled:text-brand-muted-soft disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-brand-primary/40 transition-colors"
      >
        등록
      </button>
    </div>
  );
}
