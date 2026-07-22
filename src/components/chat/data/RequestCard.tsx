"use client";

import { useState } from "react";
import type { DataRequest } from "@/lib/types";
import { sampleResultFor } from "./request-samples";
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
 * 채운 스냅샷은 **📌 고정(내용 푸시)으로 등록**된다. "이 데이터가 필요하다"는
 * 요구에 대한 응답이라, 표가 있다는 알림(카탈로그)만으로는 부족하고 값이 실려야
 * 한다. 등록 뒤에는 별도 버튼 없이 — 사용자가 채팅에 "등록 완료"라고 말하면
 * 보통의 발화로 이어서 분석한다(히스토리 보존).
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
  // DB 없이 왕복을 걸어볼 수 있게 하는 예시 — 있는 queryKey 에만 버튼이 뜬다.
  const sample = sampleResultFor(request.queryKey);

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
        <div className="relative">
          {/* whitespace-pre-wrap: 패널 폭(440px)을 넘는 SQL 줄도 스크롤에
              숨기지 않고 줄바꿈해 전문이 보이게 — 폭은 안전망일 뿐이다.
              pr-xl 은 우상단 복사 아이콘 밑으로 첫 줄이 깔리지 않게. */}
          <pre className="text-caption font-mono text-brand-ink bg-brand-canvas rounded-sm px-sm py-xs pr-xl whitespace-pre-wrap">
            {request.sql}
          </pre>
          <button
            type="button"
            onClick={copySql}
            aria-label={copied ? "복사됨" : "SQL 복사"}
            title={copied ? "복사됨" : "SQL 복사"}
            className="absolute top-xxs right-xxs p-xxs rounded-sm text-brand-muted hover:text-brand-primary hover:bg-brand-primary/10 focus:outline-none focus:ring-2 focus:ring-brand-primary/15 transition-colors"
          >
            {copied ? <CheckIcon /> : <CopyIcon />}
          </button>
        </div>
      )}

      {sample !== null && (
        <button
          type="button"
          onClick={() => {
            setText(sample);
            if (error) setError(null);
          }}
          className="self-end text-caption text-brand-primary hover:underline focus:outline-none focus:ring-2 focus:ring-brand-primary/15 rounded-sm transition-colors"
        >
          예시 결과 채우기
        </button>
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
      <div className="flex items-center justify-between gap-xs">
        <p className="text-caption text-brand-muted-soft min-w-0">
          등록 후 채팅에 “등록 완료”라고 입력하면 이어서 분석합니다.
        </p>
        <button
          type="button"
          onClick={submit}
          disabled={text.trim().length === 0}
          className="shrink-0 inline-flex items-center h-8 px-md rounded-md bg-brand-primary text-brand-on-primary text-body-sm font-medium hover:bg-brand-primary-active disabled:bg-brand-canvas disabled:text-brand-muted-soft disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-brand-primary/40 transition-colors"
        >
          등록
        </button>
      </div>
    </div>
  );
}

// 복사 아이콘 한 쌍 — `ChatMessage` 의 메시지 액션과 같은 14px 인라인 SVG 관례.
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
