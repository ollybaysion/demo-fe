"use client";

import { useEffect, useState } from "react";
import { groupMessagesByEquipment } from "@/lib/message-store";
import type { DataMessage } from "@/lib/types";

/**
 * 데이터 메시지 단 — 붙여넣은 설비/카프카 메시지의 목록·상세·명시 입력
 * (BE #64 MVP, 시안 C).
 *
 * 목록은 **제목만**이다 — 분석 카드와 달리 메시지가 건마다 카드로 서면 패널이
 * 스택으로 부푼다(사용자 결정). 설비별로 묶어 제목 줄만 세우고, 내용(코멘트 +
 * pretty JSON + 원문)은 클릭이 여는 상세 모달이 맡는다.
 *
 * 상세는 시안 C: 코멘트 박스 + pretty JSON + 복사 + **원문 접힘**. 값 전부가
 * LLM 산출물이라(편의성 기능 합의) 원문 접힘이 진실원 안전망이다.
 */

type SectionProps = {
  messages: DataMessage[];
  onRemove: (id: string) => void;
  /** 명시 입력 카드 열림 — 하단 [+ 메시지] 버튼이 연다. */
  inputOpen: boolean;
  onCloseInput: () => void;
  /**
   * 명시 등록 — 판정 없이 무조건 메시지로 보낸다(`pastedForce`). 성공이면
   * true(카드가 닫힌다), 실패면 false(사유를 카드 안에 남긴다).
   */
  onSubmitInput: (text: string) => Promise<boolean>;
};

export function MessageSection({
  messages,
  onRemove,
  inputOpen,
  onCloseInput,
  onSubmitInput,
}: SectionProps) {
  const [detailId, setDetailId] = useState<string | null>(null);
  const detail = messages.find((m) => m.id === detailId) ?? null;
  const groups = groupMessagesByEquipment(messages);

  return (
    <div className="flex flex-col gap-xs">
      {inputOpen && (
        <MessageInputCard onClose={onCloseInput} onSubmit={onSubmitInput} />
      )}
      {messages.length === 0 && !inputOpen ? (
        <p className="text-caption text-brand-muted-soft">
          설비 메시지를 붙여넣거나 [+ 메시지]로 직접 등록하면 여기에 쌓입니다.
        </p>
      ) : (
        groups.map((g) => (
          <div
            key={g.equipment || "미분류"}
            className="rounded-lg border border-brand-hairline bg-brand-surface-soft px-xs py-xxs"
          >
            <div className="px-xxs py-[4px] flex items-center gap-xs">
              <span className="flex-1 min-w-0 truncate text-caption font-medium text-brand-muted">
                {g.equipment || "미분류"}
              </span>
              <span className="shrink-0 text-caption text-brand-muted-soft tabular-nums">
                {g.messages.length}건
              </span>
            </div>
            {/* 제목 줄만 — 세부는 모달로. */}
            {g.messages.map((m) => (
              <div
                key={m.id}
                className="group rounded-md bg-brand-canvas mb-[3px] last:mb-0 flex items-center"
              >
                <button
                  type="button"
                  onClick={() => setDetailId(m.id)}
                  title={m.comment ?? m.label}
                  className="flex-1 min-w-0 px-xs py-[6px] text-left text-body-sm text-brand-ink truncate hover:text-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/15 rounded-md"
                >
                  {m.label}
                </button>
                <button
                  type="button"
                  onClick={() => onRemove(m.id)}
                  aria-label={`${m.label} 삭제`}
                  title="삭제"
                  className="shrink-0 mr-xxs inline-flex items-center justify-center w-6 h-6 rounded-full text-brand-muted opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:text-brand-error hover:bg-brand-ink-translucent-04 focus:outline-none focus:ring-2 focus:ring-brand-primary/15 transition-opacity"
                >
                  <svg
                    width="11"
                    height="11"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    aria-hidden
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        ))
      )}
      {detail && (
        <MessageDetailModal message={detail} onClose={() => setDetailId(null)} />
      )}
    </div>
  );
}

/** 상세 모달 — 시안 C: 코멘트 박스 + pretty JSON + 복사 + 원문 접힘. */
function MessageDetailModal({
  message,
  onClose,
}: {
  message: DataMessage;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const pretty = JSON.stringify(message.json, null, 2) ?? "";

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function copyJson() {
    void navigator.clipboard?.writeText(pretty).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`메시지 ${message.label}`}
      className="fixed inset-0 z-50 flex items-center justify-center p-md"
    >
      <div
        className="absolute inset-0 bg-brand-ink/40"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative w-full max-w-[36rem] max-h-[80vh] bg-brand-canvas rounded-lg shadow-xl flex flex-col overflow-hidden">
        <div className="flex items-center gap-xs px-md py-sm border-b border-brand-hairline">
          <h2 className="flex-1 min-w-0 truncate font-sans text-body-md text-brand-ink">
            {message.label}
          </h2>
          {message.eqpId && (
            <span className="shrink-0 inline-flex items-center rounded-[4px] bg-brand-ink-translucent-04 px-[6px] py-[2px] text-[11px] text-brand-muted">
              {message.eqpId}
            </span>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-full text-brand-muted hover:bg-brand-ink-translucent-04 focus:outline-none focus:ring-2 focus:ring-brand-primary/15"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              aria-hidden
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto px-md py-sm flex flex-col gap-sm">
          {/* 코멘트 박스 — LLM 한 줄 요약. 실패했으면 없던 일(빈 박스 금지). */}
          {message.comment && (
            <p className="rounded-md bg-brand-surface-soft border border-brand-hairline px-sm py-xs text-body-sm text-brand-ink">
              {message.comment}
            </p>
          )}
          <div className="relative">
            <button
              type="button"
              onClick={copyJson}
              className="absolute right-xs top-xs z-10 h-6 px-xs rounded-sm border border-brand-hairline bg-brand-canvas text-caption text-brand-muted hover:text-brand-primary hover:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/15 transition-colors"
            >
              {copied ? "복사됨" : "복사"}
            </button>
            <pre className="rounded-md border border-brand-hairline bg-brand-surface-soft px-sm py-xs overflow-x-auto text-[12px] leading-relaxed text-brand-ink whitespace-pre">
              {pretty}
            </pre>
          </div>
          {/* 원문 접힘 — 진실원. 포맷팅은 LLM 산출물이라 틀릴 수 있고, 그때
              확인할 곳이 항상 카드 안에 있어야 한다. */}
          <details className="rounded-md border border-brand-hairline">
            <summary className="px-sm py-xs text-caption text-brand-muted cursor-pointer select-none hover:text-brand-primary">
              원문
            </summary>
            <pre className="px-sm pb-xs overflow-x-auto text-[12px] leading-relaxed text-brand-muted whitespace-pre-wrap break-all">
              {message.raw}
            </pre>
          </details>
        </div>
      </div>
    </div>
  );
}

/**
 * 명시 입력 카드 — "버튼 누르면 스냅샷 카드처럼 나오고 빈칸에 입력". 판별을
 * 거치지 않고 무조건 메시지로 보낸다(`pastedForce`) — 스니프가 오판할 여지를
 * 사용자가 직접 없애는 경로다.
 */
function MessageInputCard({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (text: string) => Promise<boolean>;
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (busy || text.trim().length === 0) return;
    setBusy(true);
    setError(null);
    const ok = await onSubmit(text);
    setBusy(false);
    if (ok) {
      setText("");
      onClose();
    } else {
      // 입력을 지우지 않는다 — 실패한 텍스트일수록 다시 만들기 번거롭다.
      setError("메시지로 변환하지 못했습니다. 서버(LLM) 상태를 확인하고 다시 시도해 주세요.");
    }
  }

  return (
    <div className="rounded-lg border border-brand-primary/45 bg-brand-canvas px-sm py-xs flex flex-col gap-xxs">
      <span className="text-caption font-medium text-brand-muted">
        메시지 직접 등록
      </span>
      <textarea
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="설비/카프카 메시지 원문을 붙여넣으세요 — 판별 없이 메시지로 등록됩니다."
        rows={4}
        disabled={busy}
        className="w-full resize-y rounded-md border border-brand-hairline bg-brand-canvas px-xs py-xxs font-mono text-[12px] leading-relaxed text-brand-ink placeholder:text-brand-muted-soft focus:outline-none focus:ring-2 focus:ring-brand-primary/15"
      />
      {error && (
        <p role="alert" className="text-caption text-brand-error">
          {error}
        </p>
      )}
      <div className="flex items-center justify-end gap-xs">
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          className="h-7 px-xs rounded-sm text-caption text-brand-muted hover:text-brand-ink focus:outline-none focus:ring-2 focus:ring-brand-primary/15"
        >
          취소
        </button>
        <button
          type="button"
          onClick={() => void submit()}
          disabled={busy || text.trim().length === 0}
          className="h-7 px-sm rounded-sm bg-brand-primary text-brand-on-primary text-caption disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-brand-primary/25"
        >
          {busy ? "변환 중…" : "메시지로 등록"}
        </button>
      </div>
    </div>
  );
}
