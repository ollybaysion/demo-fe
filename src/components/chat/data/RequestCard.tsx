"use client";

import { useEffect, useRef, useState } from "react";
import { formatRange } from "@/lib/format-range";
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
 *
 * **답이 "없음"일 수도 있다.** 돌려 봤더니 0행인 것은 못 채운 게 아니라 채운
 * 것이다 — "그 조건으로는 데이터가 없다"는 답의 근거이고, 그 조회 절차는 거기서
 * 끝난다. 붙여넣을 것이 없다고 카드가 영영 남으면 사용자는 답할 방법이 없으므로,
 * 텍스트 없이 그 사실만 등록하는 길을 나란히 둔다.
 */
type Props = {
  request: DataRequest;
  /** 밖에서 접고 펴려면 넘긴다. 없으면 카드가 스스로 쥔다. */
  open?: boolean;
  onToggle?: () => void;
  /** 오른쪽 대기 줄이 이 카드를 가리켰다 — 화면 안으로 들어와 잠깐 깜빡인다. */
  focused?: boolean;
  focusNonce?: number;
  onFulfill: (
    input: string,
    label: string,
    opts: { include: boolean; queryKey: string; sourceSql?: string },
  ) => AddSnapshotResult;
  /** 조회했는데 0행이었다 — 붙여넣을 텍스트 없이 그 사실만 등록한다. */
  onRegisterEmpty: (
    label: string,
    opts: { queryKey: string; columns?: string[]; sourceSql?: string },
  ) => AddSnapshotResult;
};

/**
 * [예시 결과 채우기]는 데모 장치다 — 실배포에서 가짜 데이터를 등록하는 경로가
 * 되지 않게 dev 밖에서는 명시적 플래그(`NEXT_PUBLIC_DEMO_SAMPLES=1`)가 있어야
 * 보인다. 데모 배포는 플래그를 켜고, 사내 실배포는 그냥 두면 사라진다.
 */
const SHOW_SAMPLES =
  process.env.NODE_ENV === "development" ||
  process.env.NEXT_PUBLIC_DEMO_SAMPLES === "1";

export function RequestCard({
  request,
  open: openProp,
  onToggle,
  focused = false,
  focusNonce = 0,
  onFulfill,
  onRegisterEmpty,
}: Props) {
  const [text, setText] = useState("");
  const [error, setError] = useState<{ code: string; message: string } | null>(
    null,
  );
  const [copied, setCopied] = useState(false);
  // 요청 카드는 SQL·붙여넣기 칸까지 안고 있어 세로로 길다 — 여러 건이 쌓이면
  // 목록을 삼키므로 접을 수 있어야 한다(제목 줄만 남는다).
  const [openSelf, setOpenSelf] = useState(true);
  const open = openProp ?? openSelf;
  const cardRef = useRef<HTMLDivElement | null>(null);
  // 깜빡임은 렌더 상태가 아니라 클래스로 — 끝나면 흔적이 남지 않아야 한다.
  useEffect(() => {
    if (!focused || focusNonce === 0) return;
    const el = cardRef.current;
    if (!el) return;
    el.scrollIntoView({ block: "nearest", behavior: "smooth" });
    el.classList.add("ring-2", "ring-brand-primary/40");
    const timer = window.setTimeout(() => {
      el.classList.remove("ring-2", "ring-brand-primary/40");
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [focused, focusNonce]);
  // DB 없이 왕복을 걸어볼 수 있게 하는 예시 — 있는 queryKey 에만 버튼이 뜬다.
  const sample = SHOW_SAMPLES ? sampleResultFor(request.queryKey) : null;

  function submit() {
    if (text.trim().length === 0) return;
    const result = onFulfill(text, request.label, {
      include: true,
      queryKey: request.queryKey,
      // 요청이 쥔 SQL 이 이 데이터의 출처다 — 스냅샷 카드의 테이블 칩·쿼리
      // 복사가 여기서 이어진다.
      ...(request.sql ? { sourceSql: request.sql } : {}),
    });
    if (!result.ok) {
      setError({ code: result.code, message: result.message });
      return;
    }
    setError(null);
    setText("");
  }

  function submitEmpty() {
    const result = onRegisterEmpty(request.label, {
      queryKey: request.queryKey,
      ...(request.columns ? { columns: request.columns } : {}),
      ...(request.sql ? { sourceSql: request.sql } : {}),
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
    <div
      ref={cardRef}
      className="rounded-md border border-brand-primary bg-brand-surface-card flex flex-col overflow-hidden transition-[box-shadow] duration-500"
    >
      <button
        type="button"
        onClick={() => (onToggle ? onToggle() : setOpenSelf((v) => !v))}
        aria-expanded={open}
        className="w-full px-sm py-xs flex items-start gap-xxs text-left hover:bg-brand-ink-translucent-04 focus:outline-none focus:ring-2 focus:ring-brand-primary/15 transition-colors"
      >
        <span className="shrink-0 inline-flex items-center h-5 px-xs rounded-full bg-brand-primary/15 text-brand-primary text-caption font-medium">
          요청됨
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-body-sm text-brand-ink truncate">
            {request.label}
          </span>
          {/* 구간은 제목에 이어 붙이면 잘린다 — 한 줄 아래에 따로 적는다.
              구간이 없는 요청(코드표·마스터 등)도 있으니 있을 때만. */}
          {request.timeRange && (
            <span className="block text-caption text-brand-muted-soft tabular-nums">
              {formatRange(request.timeRange.start, request.timeRange.end)}
            </span>
          )}
        </span>
        <ChevronIcon open={open} />
      </button>

      {open && (
        <div className="px-sm pb-xs flex flex-col gap-xxs">

      <p className="text-caption text-brand-muted">
        이 조회를 실행한 결과를 붙여넣어 주세요.
      </p>

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
        <div className="shrink-0 flex items-center gap-xs">
          {/* 붙여넣을 것이 없는 답 — 0행도 등록되어야 이 요청이 끝난다.
              붙여넣기를 시작한 뒤에는 감춘다: 채우던 중에 "없음"을 누르면
              쓰던 것을 버리게 되고, 그건 실수로만 일어난다. */}
          {text.trim().length === 0 && (
            <button
              type="button"
              onClick={submitEmpty}
              title="이 조회를 실행했으나 결과가 0행이었다면 — 그 사실을 등록합니다."
              className="inline-flex items-center h-8 px-sm rounded-md border border-brand-hairline text-brand-muted text-body-sm hover:text-brand-ink hover:border-brand-primary/40 focus:outline-none focus:ring-2 focus:ring-brand-primary/15 transition-colors"
            >
              결과 없음
            </button>
          )}
          <button
            type="button"
            onClick={submit}
            disabled={text.trim().length === 0}
            className="inline-flex items-center h-8 px-md rounded-md bg-brand-primary text-brand-on-primary text-body-sm font-medium hover:bg-brand-primary-active disabled:bg-brand-canvas disabled:text-brand-muted-soft disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-brand-primary/40 transition-colors"
          >
            등록
          </button>
        </div>
      </div>
        </div>
      )}
    </div>
  );
}

// 복사 아이콘 한 쌍 — `ChatMessage` 의 메시지 액션과 같은 14px 인라인 SVG 관례.
/** 접힘/펼침 표시 — 펼쳐지면 아래를 가리킨다. */
function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={[
        "shrink-0 self-start mt-[3px] text-brand-muted transition-transform",
        open ? "rotate-180" : "",
      ].join(" ")}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

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
