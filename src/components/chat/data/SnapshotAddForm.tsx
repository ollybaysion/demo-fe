"use client";

import { useState } from "react";
import type { AddSnapshotResult } from "./useDataSnapshots";

/**
 * 스냅샷 등록 폼 — 붙여넣기가 전부다.
 *
 * 이름을 묻지 않는다. 쿼리 결과를 등록할 때마다 이름을 짓게 하는 건 마찰이라,
 * 라벨은 내용(선두 컬럼·규모)에서 자동으로 만들고 필요하면 카드에서 바꾼다.
 *
 * 파싱 실패는 폼 안에 남긴다. 붙여넣은 텍스트를 지우지 않는 것이 중요한데,
 * 실패하는 입력일수록 사용자가 다시 만들기 번거롭기 때문이다(SQL 재실행).
 */
type Props = {
  onAdd: (input: string) => AddSnapshotResult;
};

export function SnapshotAddForm({ onAdd }: Props) {
  const [text, setText] = useState("");
  const [error, setError] = useState<{ code: string; message: string } | null>(
    null,
  );

  function submit() {
    if (text.trim().length === 0) return;
    const result = onAdd(text);
    if (!result.ok) {
      setError({ code: result.code, message: result.message });
      return;
    }
    setError(null);
    setText("");
  }

  return (
    <div className="flex flex-col gap-sm">
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
