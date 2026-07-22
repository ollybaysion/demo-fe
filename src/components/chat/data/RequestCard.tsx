"use client";

import { useState } from "react";
import type { DataRequest } from "@/lib/types";
import type { AddSnapshotResult } from "./useDataSnapshots";

/**
 * 데이터 요청 카드 — "이게 있어야 답할 수 있다"에 사용자가 답하는 자리.
 *
 * DB 에 붙지 못하는 환경에서 모델은 스스로 조회할 수 없다. 없는 데이터를 지어내는
 * 대신 여기서 조달을 요청하고, 사용자가 결과를 붙여넣으면 다시 분석한다.
 *
 * 자리는 **데이터 패널 최상단**이다. 요청은 채팅의 한 마디가 아니라 패널이 안고
 * 있는 할 일이라, 대화를 스크롤해 지나가도 남아 있어야 하고 채워 넣는 폼도
 * 스냅샷 등록과 같은 자리에 있어야 한다.
 *
 * 채운 스냅샷은 **동봉 ON 으로 등록**된다. 이미 "이 데이터가 필요하다"는 요구에
 * 대한 응답이라 꺼진 상태로 시작할 이유가 없다.
 */
type Props = {
  request: DataRequest;
  onFulfill: (
    input: string,
    label: string,
    opts: { include: boolean; queryKey: string },
  ) => AddSnapshotResult;
};

export function RequestCard({ request, onFulfill }: Props) {
  const [text, setText] = useState("");
  const [error, setError] = useState<{ code: string; message: string } | null>(
    null,
  );
  const [copied, setCopied] = useState(false);

  function submit() {
    if (text.trim().length === 0) return;
    const result = onFulfill(text, request.label, {
      include: true,
      queryKey: request.queryKey,
    });
    if (!result.ok) {
      setError({ code: result.code, message: result.message });
      return;
    }
    setError(null);
    setText("");
  }

  async function copySql() {
    if (!request.sql) return;
    try {
      await navigator.clipboard.writeText(request.sql);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // 클립보드 권한이 없어도 SQL 은 화면에 그대로 있다 — 복사만 실패한다.
      setCopied(false);
    }
  }

  return (
    <div className="rounded-md border border-brand-primary bg-brand-surface-card px-sm py-xs flex flex-col gap-xxs">
      <div className="flex items-center gap-xxs">
        <span className="shrink-0 inline-flex items-center h-5 px-xs rounded-full bg-brand-primary/15 text-brand-primary text-caption font-medium">
          요청됨
        </span>
        <span className="flex-1 min-w-0 text-body-sm text-brand-ink truncate">
          {request.label}
        </span>
      </div>

      <p className="text-caption text-brand-muted">
        이 조회를 실행한 결과를 붙여넣어 주세요.
      </p>

      {request.columns && request.columns.length > 0 && (
        <p className="text-caption text-brand-muted-soft font-mono">
          {request.columns.join(", ")}
        </p>
      )}

      {request.sql && (
        <div className="flex flex-col gap-xxs">
          {/* whitespace-pre-wrap: 패널 폭(440px)을 넘는 SQL 줄도 스크롤에
              숨기지 않고 줄바꿈해 전문이 보이게 — 폭은 안전망일 뿐이다. */}
          <pre className="text-caption font-mono text-brand-ink bg-brand-canvas rounded-sm px-sm py-xs whitespace-pre-wrap">
            {request.sql}
          </pre>
          <button
            type="button"
            onClick={copySql}
            className="self-start text-caption text-brand-primary hover:text-brand-primary-active focus:outline-none focus:ring-2 focus:ring-brand-primary/15 rounded-xs px-xxs"
          >
            {copied ? "복사됨" : "SQL 복사"}
          </button>
        </div>
      )}

      <textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          if (error) setError(null);
        }}
        rows={4}
        aria-label={`${request.label} 결과 붙여넣기`}
        placeholder="실행한 결과를 붙여넣으세요."
        className="w-full min-w-0 bg-brand-canvas text-brand-ink font-mono text-caption rounded-md border border-brand-hairline px-sm py-xs resize-y focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/15 transition-colors"
      />
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
        className="self-end inline-flex items-center h-8 px-md rounded-md bg-brand-primary text-brand-on-primary text-body-sm font-medium hover:bg-brand-primary-active disabled:bg-brand-canvas disabled:text-brand-muted-soft disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-brand-primary/40 transition-colors"
      >
        등록
      </button>
    </div>
  );
}
