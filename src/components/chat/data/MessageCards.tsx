"use client";

import { useState, type ReactNode } from "react";
import { groupMessagesByEquipment } from "@/lib/message-store";
import type { DataMessage } from "@/lib/types";

/**
 * 데이터 메시지 단 — 붙여넣은 설비/카프카 메시지의 목록·상세·명시 입력
 * (BE #64 MVP, 시안 C).
 *
 * 목록은 **제목만**이다 — 분석 카드와 달리 메시지가 건마다 카드로 서면 패널이
 * 스택으로 부푼다(사용자 결정). 설비별로 묶어 제목 줄만 세우고, 내용(코멘트 +
 * pretty JSON + 원문)은 확장 모드(#136)의 오른쪽 상세 면({@link MessageDetail})이
 * 맡는다 — 모달이 아니다. 제목을 누르면 호스트가 패널을 넓혀 그 자리에 띄운다.
 */

type SectionProps = {
  messages: DataMessage[];
  onRemove: (id: string) => void;
  /** 제목 클릭 — 확장 모드 상세 면에 이 메시지를 띄운다(닫혀 있으면 넓히면서). */
  onSelectMessage?: (id: string) => void;
  /** 확장 모드 상세 면이 지금 보여주는 메시지 — 그 줄이 선택으로 보인다. */
  selectedId?: string | null;
  /** 명시 입력 카드 열림 — [데이터 추가] 분류의 [메시지]가 연다. */
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
  onSelectMessage,
  selectedId = null,
  inputOpen,
  onCloseInput,
  onSubmitInput,
}: SectionProps) {
  const groups = groupMessagesByEquipment(messages);

  return (
    <div className="flex flex-col gap-xs">
      {inputOpen && (
        <MessageInputCard onClose={onCloseInput} onSubmit={onSubmitInput} />
      )}
      {messages.length === 0 && !inputOpen ? (
        <p className="text-caption text-brand-muted-soft">
          설비 메시지를 붙여넣거나 [데이터 추가]의 [메시지]로 직접 등록하면
          여기에 쌓입니다.
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
            {/* 제목 줄만 — 세부는 확장 모드 오른쪽 면으로. */}
            {g.messages.map((m) => (
              <div
                key={m.id}
                className={[
                  "group rounded-md mb-[3px] last:mb-0 flex items-center border transition-colors",
                  m.id === selectedId
                    ? "bg-brand-primary/5 border-brand-primary/45"
                    : "bg-brand-canvas border-transparent",
                ].join(" ")}
              >
                <button
                  type="button"
                  onClick={() => onSelectMessage?.(m.id)}
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
    </div>
  );
}

/**
 * 메시지 상세 — 확장 모드(#136)의 오른쪽 면, `SnapshotDetail` 의 형제.
 *
 * 확정 시안 = E4-B(브리핑) × B2(웜그레이 히어로) × P5(터라코타 포인트 3종:
 * 좌측 보더·eqpId 칩·활성 탭). 구성: 히어로(제목·칩·코멘트) → 필 세그먼트
 * (JSON/원문 전환 + 복사) → 본문. 본문은 항상 pretty JSON 이 기본이고(결정 3),
 * 원문 탭이 진실원 안전망이다 — 포맷팅은 LLM 산출물이라 틀릴 수 있다.
 * WARN 행 형광·구절 강조는 고도화(BE #66, warnings 검증과 짝)로 뺐다.
 */
export function MessageDetail({ message }: { message: DataMessage }) {
  const [view, setView] = useState<"json" | "raw">("json");
  const [copied, setCopied] = useState(false);
  const pretty = JSON.stringify(message.json, null, 2) ?? "";

  // 메시지가 바뀌면 탭·복사 상태를 처음으로 — 렌더 중 상태 조정 관례.
  const [prevId, setPrevId] = useState(message.id);
  if (message.id !== prevId) {
    setPrevId(message.id);
    setView("json");
    setCopied(false);
  }

  async function copyShown() {
    try {
      await navigator.clipboard.writeText(view === "json" ? pretty : message.raw);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // 클립보드 권한이 없어도 내용은 화면에 그대로 있다.
      setCopied(false);
    }
  }

  const pill = (target: "json" | "raw", label: string) => (
    <button
      type="button"
      onClick={() => setView(target)}
      aria-pressed={view === target}
      className={[
        "h-7 px-sm rounded-full border text-caption transition-colors focus:outline-none focus:ring-2 focus:ring-brand-primary/15",
        view === target
          ? "bg-brand-primary border-brand-primary text-brand-on-primary font-medium"
          : "border-brand-hairline text-brand-muted hover:text-brand-ink",
      ].join(" ")}
    >
      {label}
    </button>
  );

  return (
    <div className="flex-1 min-w-0 flex flex-col">
      {/* 히어로 — 웜그레이 바탕 + 좌측 터라코타 보더(P5). 코멘트가 본문보다
          먼저 읽힌다: 이 메시지가 무엇인지는 사람 말이 제일 빠르다. */}
      <div className="shrink-0 px-lg pt-md pb-sm bg-brand-surface-soft border-b border-brand-hairline-soft border-l-[3px] border-l-brand-primary">
        <div className="flex items-center gap-xs min-w-0">
          <h3
            className="min-w-0 truncate font-sans text-body-md font-medium text-brand-ink"
            title={message.className ?? message.label}
          >
            {message.label}
          </h3>
          {message.eqpId && (
            <span className="shrink-0 inline-flex items-center rounded-[4px] bg-brand-primary/10 px-[6px] py-[3px] font-mono text-[11px] leading-none font-medium text-brand-primary">
              {message.eqpId}
            </span>
          )}
        </div>
        {/* LLM 한 줄 요약 — 실패했으면 없던 일(빈 줄 금지). */}
        {message.comment && (
          <p className="mt-xs text-body-sm leading-relaxed text-brand-body">
            {message.comment}
          </p>
        )}
      </div>

      {/* 필 세그먼트 — JSON 이 기본, 원문이 안전망. 복사는 보이는 쪽을 담는다. */}
      <div className="shrink-0 flex items-center gap-xxs px-lg pt-sm">
        {pill("json", "JSON")}
        {pill("raw", "원문")}
        <button
          type="button"
          onClick={() => void copyShown()}
          className="ml-auto h-7 px-xs text-caption text-brand-muted hover:text-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/15 transition-colors"
        >
          {copied ? "복사됨" : "복사"}
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-lg py-sm">
        {view === "json" ? (
          <pre className="font-mono text-[12px] leading-[1.75] whitespace-pre overflow-x-auto text-brand-ink">
            {highlightJson(pretty)}
          </pre>
        ) : (
          <pre className="font-mono text-[12px] leading-relaxed whitespace-pre-wrap break-all text-brand-body">
            {message.raw}
          </pre>
        )}
      </div>
    </div>
  );
}

/**
 * pretty JSON 구문 색 — 키·문자열·숫자만. 입력이 **우리가 방금 stringify 한
 * 문자열**이라 정규식 토큰화가 결정론이다(임의 텍스트 파싱이 아니다).
 * WARN 형광 같은 의미 강조는 여기 없다 — 그건 warnings 근거가 생기는
 * 고도화(#66)의 일이다.
 */
function highlightJson(pretty: string): ReactNode[] {
  const out: ReactNode[] = [];
  const token =
    /("(?:[^"\\]|\\.)*")(\s*:)?|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|\b(true|false|null)\b/g;
  let last = 0;
  let key = 0;
  let m: RegExpExecArray | null;
  while ((m = token.exec(pretty)) !== null) {
    if (m.index > last) out.push(pretty.slice(last, m.index));
    if (m[1] !== undefined) {
      if (m[2] !== undefined) {
        // 키 — 뒤에 콜론이 붙는 문자열.
        out.push(
          <span key={key++} className="text-[#7a5c50]">
            {m[1]}
          </span>,
          m[2],
        );
      } else {
        out.push(
          <span key={key++} className="text-[#4a7a5a]">
            {m[1]}
          </span>,
        );
      }
    } else {
      out.push(
        <span key={key++} className="text-[#8a5a3a]">
          {m[3] ?? m[4]}
        </span>,
      );
    }
    last = m.index + m[0].length;
  }
  if (last < pretty.length) out.push(pretty.slice(last));
  return out;
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
