"use client";

import { useState, type ReactNode } from "react";
import type { MessageProgress } from "@/lib/chat-data";
import { messageStamp, type GroupMode } from "@/lib/message-store";
import { KindPicker } from "./KindPicker";
import type { MessageView } from "./useMessageView";
import type { DataMessage } from "@/lib/types";

/**
 * 데이터 메시지 단 — 붙여넣은 설비/카프카 메시지의 목록·상세·명시 입력
 * (BE #64 MVP, 시안 C).
 *
 * 목록은 **제목 줄만**이다 — 분석 카드와 달리 메시지가 건마다 카드로 서면 패널이
 * 스택으로 부푼다(사용자 결정). 내용(코멘트 + pretty JSON + 원문)은 확장 모드
 * (#136)의 오른쪽 상세 면({@link MessageDetail})이 맡는다 — 모달이 아니다.
 *
 * 여러 건이 한꺼번에 들어오는 라운드에 맞춰 줄에 **시각 거터**가 붙었다: 같은
 * 초에 여러 건이 오는 데이터라 소수초까지 보여야 서로를 구별하고 순서를 믿을 수
 * 있다. 초까지가 눈의 기준선이고 소수초는 한 톤 죽인다. 묶는 축(시각·설비·날짜)은
 * 사용자가 바꾸고, 설비 거르개는 그 축과 직교한다.
 */

type SectionProps = {
  view: MessageView;
  /** 판정이 도는 동안의 진척 — 없으면 도는 중이 아니다. */
  progress?: MessageProgress | null;
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

const MODES: { key: GroupMode; name: string }[] = [
  { key: "time", name: "시각" },
  { key: "eqp", name: "설비" },
  { key: "date", name: "날짜" },
];

export function MessageSection({
  view,
  progress = null,
  onRemove,
  onSelectMessage,
  selectedId = null,
  inputOpen,
  onCloseInput,
  onSubmitInput,
}: SectionProps) {
  // 한 건뿐이면 묶을 것도 거를 것도 없다 — 컨트롤은 쌓였을 때만 나온다.
  const showControls = view.total > 1;

  return (
    <div className="flex flex-col gap-xs">
      {progress && <JudgeProgress progress={progress} />}
      {inputOpen && (
        <MessageInputCard onClose={onCloseInput} onSubmit={onSubmitInput} />
      )}
      {view.total === 0 ? (
        // 판정이 도는 중이면 "아직 없습니다"가 아니다 — 오고 있는 중이다.
        !inputOpen &&
        !progress && (
          <p className="text-caption text-brand-muted-soft">
            설비 메시지를 붙여넣거나 [데이터 추가]의 [메시지]로 직접 등록하면
            여기에 쌓입니다.
          </p>
        )
      ) : (
        <>
          {showControls && (
            <div className="flex flex-wrap items-center gap-xs">
              <div className="inline-flex rounded-md border border-brand-hairline overflow-hidden">
                {MODES.map((m) => (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => view.setMode(m.key)}
                    aria-pressed={view.mode === m.key}
                    className={[
                      "h-6 px-xs text-caption transition-colors focus:outline-none focus:ring-2 focus:ring-brand-primary/15",
                      view.mode === m.key
                        ? "bg-brand-primary text-brand-on-primary font-medium"
                        : "text-brand-muted hover:text-brand-ink",
                    ].join(" ")}
                  >
                    {m.name}
                  </button>
                ))}
              </div>
              {view.equipments.length > 1 &&
                view.equipments.map((eqp) => {
                  const on = view.pickedEquipments.includes(eqp);
                  return (
                    <button
                      key={eqp}
                      type="button"
                      onClick={() => view.toggleEquipment(eqp)}
                      aria-pressed={on}
                      className={[
                        "h-6 px-xs rounded-full border font-mono text-[11px] transition-colors focus:outline-none focus:ring-2 focus:ring-brand-primary/15",
                        on
                          ? "border-brand-primary/45 bg-brand-primary/10 text-brand-primary font-medium"
                          : "border-brand-hairline text-brand-muted hover:text-brand-ink",
                      ].join(" ")}
                    >
                      {eqp}
                    </button>
                  );
                })}
            </div>
          )}
          <div className="rounded-lg border border-brand-hairline bg-brand-surface-soft px-xs py-xxs">
            {view.visible.length === 0 ? (
              <p className="px-xxs py-xs text-caption text-brand-muted-soft">
                고른 설비의 메시지가 없습니다.
              </p>
            ) : (
              view.rows.map((row, i) => {
                if (row.kind === "header") {
                  return (
                    <div
                      key={`h-${i}`}
                      className="px-xxs pt-xs pb-[4px] flex items-center gap-xs first:pt-[2px]"
                    >
                      <span className="flex-1 min-w-0 truncate text-caption font-medium text-brand-muted">
                        {row.label}
                      </span>
                      <span className="shrink-0 text-caption text-brand-muted-soft tabular-nums">
                        {row.count}건
                      </span>
                    </div>
                  );
                }
                if (row.kind === "daybreak") {
                  return (
                    <div
                      key={`d-${i}`}
                      className="my-xxs flex items-center gap-xs px-xxs"
                    >
                      <span className="h-px flex-1 bg-brand-hairline" />
                      <span className="shrink-0 text-caption text-brand-muted">
                        {row.label}
                      </span>
                      <span className="h-px flex-1 bg-brand-hairline" />
                    </div>
                  );
                }
                return (
                  <MessageRowLine
                    key={row.message.id}
                    message={row.message}
                    showEquipment={view.mode !== "eqp"}
                    selected={row.message.id === selectedId}
                    onSelect={() => onSelectMessage?.(row.message.id)}
                    onRemove={() => onRemove(row.message.id)}
                  />
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}

/**
 * 판정 진행 — "지금 돌고 있다"와 "얼마나 왔나".
 *
 * 총량은 자르고 나서야 알 수 있다(자르는 건 BE). 그래서 처음 한 박자는 건수 없이
 * 돌기만 하고, 첫 진행 줄이 오면 그때부터 `n / N` 과 막대가 선다. 몇 건인지 모르는
 * 동안 0/0 같은 숫자를 지어내지 않는다.
 */
function JudgeProgress({ progress }: { progress: MessageProgress }) {
  const { done, total } = progress;
  const ratio = total > 0 ? Math.min(done / total, 1) : 0;
  return (
    <div
      role="status"
      className="rounded-md border border-brand-hairline bg-brand-surface-soft px-xs py-xxs flex flex-col gap-[5px]"
    >
      <div className="flex items-center gap-xs">
        <span className="shrink-0 w-3 h-3 rounded-full border-2 border-brand-primary/30 border-t-brand-primary animate-spin" />
        <span className="flex-1 min-w-0 truncate text-caption text-brand-muted">
          메시지 변환 중…
        </span>
        {total > 0 && (
          <span className="shrink-0 text-caption text-brand-muted-soft tabular-nums">
            {done} / {total}
          </span>
        )}
      </div>
      {total > 0 && (
        <span className="block h-[3px] rounded-full bg-brand-ink-translucent-04 overflow-hidden">
          <span
            className="block h-full bg-brand-primary transition-[width] duration-300"
            style={{ width: `${Math.round(ratio * 100)}%` }}
          />
        </span>
      )}
    </div>
  );
}

/**
 * 목록 한 줄 — 시각 거터 · 설비 칩 · 제목.
 *
 * 거터는 2단이다: 초까지가 위, 소수초가 아래. 발생 시각이 없는 건은 `—` 를 그린다
 * — 등록 시각을 그 자리에 올리면 메시지가 언제 난 것인지 안다고 속이게 된다
 * (정렬에는 등록 시각을 쓰되, 화면에는 없다고 말한다).
 */
function MessageRowLine({
  message,
  showEquipment,
  selected,
  onSelect,
  onRemove,
}: {
  message: DataMessage;
  showEquipment: boolean;
  selected: boolean;
  onSelect: () => void;
  onRemove: () => void;
}) {
  const stamp = messageStamp(message);
  return (
    <div
      className={[
        "group rounded-md mb-[2px] last:mb-0 flex items-center border transition-colors",
        selected
          ? "bg-brand-primary/5 border-brand-primary/45"
          : "bg-brand-canvas border-transparent",
      ].join(" ")}
    >
      <button
        type="button"
        onClick={onSelect}
        title={message.comment ?? message.label}
        className="flex-1 min-w-0 px-xs py-[2px] flex items-center gap-xs text-left focus:outline-none focus:ring-2 focus:ring-brand-primary/15 rounded-md"
      >
        <span className="shrink-0 w-[62px] font-mono text-[11px] leading-[1.1] tabular-nums text-brand-muted">
          {stamp?.exact ? (
            <>
              {stamp.time}
              <span className="block text-[10px] leading-[1.1] text-brand-muted-soft">
                .{stamp.frac || "0"}
              </span>
            </>
          ) : (
            <span className="text-brand-muted-soft" title="메시지에 시각이 없습니다">
              —
            </span>
          )}
        </span>
        {showEquipment && message.eqpId && (
          <span className="shrink-0 inline-flex items-center rounded-[4px] bg-brand-primary/10 px-[5px] py-[2px] font-mono text-[10px] leading-none font-medium text-brand-primary">
            {message.eqpId}
          </span>
        )}
        <span className="flex-1 min-w-0 truncate text-body-sm text-brand-ink group-hover:text-brand-primary">
          {message.label}
        </span>
      </button>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`${message.label} 삭제`}
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
  );
}

/**
 * 메시지 상세 — 확장 모드(#136)의 오른쪽 면, `SnapshotDetail` 의 형제.
 *
 * 확정 시안 = E4-B(브리핑) × B2(웜그레이 히어로) × P5(터라코타 포인트 3종:
 * 좌측 보더·eqpId 칩·활성 탭). 구성: 히어로(제목·칩·순회·시각·코멘트) → 필
 * 세그먼트(JSON/원문 전환 + 복사) → 본문. 본문은 항상 pretty JSON 이 기본이고
 * (결정 3), 원문 탭이 진실원 안전망이다 — 포맷팅은 LLM 산출물이라 틀릴 수 있다.
 * WARN 행 형광·구절 강조는 고도화(BE #66, warnings 검증과 짝)로 뺐다.
 *
 * `‹ n / N ›` 순회는 **왼쪽 목록에 지금 보이는 순서**를 돈다 — 묶기 축을 바꾸면
 * 순회 순서도 같이 바뀐다. 화면과 다른 순서로 넘어가면 사용자가 자기 위치를 잃는다.
 */
export function MessageDetail({
  message,
  order = [],
  onSelect,
  onAsSnapshot,
}: {
  message: DataMessage;
  /** 보이는 순서대로의 메시지 — 순회의 고리. */
  order?: DataMessage[];
  onSelect?: (id: string) => void;
  /**
   * 표로 되돌리기 — 스냅샷 카드의 [메시지로] 와 짝. 원문이 표로 안 읽히면
   * 사유가 돌아오고 메시지는 그대로 남는다.
   */
  onAsSnapshot?: () => { ok: true } | { ok: false; message: string };
}) {
  // 변환에 실패한 건은 JSON 이 없다 — 원문만 보여 준다(빈 탭을 남기지 않는다).
  const converted = message.json !== undefined && message.json !== null;
  const [view, setView] = useState<"json" | "raw">("json");
  const [copied, setCopied] = useState(false);
  const pretty = converted ? (JSON.stringify(message.json, null, 2) ?? "") : "";
  const shown = converted ? view : "raw";
  const stamp = messageStamp(message);
  const index = order.findIndex((m) => m.id === message.id);
  // 표로 못 읽힌 사유 — 진짜 메시지였다는 뜻이라 그대로 보여 준다.
  const [asSnapshotError, setAsSnapshotError] = useState<string | null>(null);

  // 끝에서 한 바퀴 — 목록이 짧아 되돌아오는 편이 막다른 끝보다 낫다.
  const step = (delta: number) => {
    const next = order[(index + delta + order.length) % order.length];
    if (next) onSelect?.(next.id);
  };

  // 메시지가 바뀌면 탭·복사 상태를 처음으로 — 렌더 중 상태 조정 관례.
  const [prevId, setPrevId] = useState(message.id);
  if (message.id !== prevId) {
    setPrevId(message.id);
    setView("json");
    setCopied(false);
    setAsSnapshotError(null);
  }

  async function copyShown() {
    try {
      await navigator.clipboard.writeText(shown === "json" ? pretty : message.raw);
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
      aria-pressed={shown === target}
      className={[
        "h-7 px-sm rounded-full border text-caption transition-colors focus:outline-none focus:ring-2 focus:ring-brand-primary/15",
        shown === target
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
          {index >= 0 && order.length > 1 && (
            <div className="ml-auto shrink-0 flex items-center gap-xxs">
              <button
                type="button"
                onClick={() => step(-1)}
                aria-label="이전 메시지"
                className="w-6 h-6 rounded-full text-brand-muted hover:text-brand-primary hover:bg-brand-ink-translucent-04 focus:outline-none focus:ring-2 focus:ring-brand-primary/15"
              >
                ‹
              </button>
              <span className="text-caption text-brand-muted-soft tabular-nums">
                {index + 1} / {order.length}
              </span>
              <button
                type="button"
                onClick={() => step(1)}
                aria-label="다음 메시지"
                className="w-6 h-6 rounded-full text-brand-muted hover:text-brand-primary hover:bg-brand-ink-translucent-04 focus:outline-none focus:ring-2 focus:ring-brand-primary/15"
              >
                ›
              </button>
            </div>
          )}
        </div>
        {/* 발생 시각 — 소수초까지가 이 한 건의 신원이다(같은 초에 형제가 있다). */}
        {stamp && (
          <p className="mt-xxs font-mono text-[11px] tabular-nums text-brand-muted">
            {stamp.exact ? (
              <>
                {stamp.date} {stamp.time}
                <span className="text-brand-muted-soft">.{stamp.frac || "0"}</span>
              </>
            ) : (
              <span className="text-brand-muted-soft">
                메시지에 시각 없음 · 등록 {stamp.date} {stamp.time}
              </span>
            )}
          </p>
        )}
        {/* LLM 한 줄 요약 — 실패했으면 없던 일(빈 줄 금지). */}
        {message.comment && (
          <p className="mt-xs text-body-sm leading-relaxed text-brand-body">
            {message.comment}
          </p>
        )}
      </div>

      {/* 필 세그먼트 — JSON 이 기본, 원문이 안전망. 복사는 보이는 쪽을 담는다.
          변환 실패 건은 JSON 이 없으니 그 쪽에 사실을 적는다(빈 탭 금지). */}
      <div className="shrink-0 flex items-center gap-xxs px-lg pt-sm">
        {converted ? (
          pill("json", "JSON")
        ) : (
          <span className="h-7 inline-flex items-center text-caption text-brand-muted-soft">
            변환하지 못했습니다 — 원문만 보관합니다
          </span>
        )}
        {converted && pill("raw", "원문")}
        {/* 종류 칩 — 스냅샷 카드와 같은 물건이다. 오판은 양쪽으로 난다. */}
        {onAsSnapshot && (
          <span className="ml-auto">
            <KindPicker
              subject={message.label}
              current="message"
              options={[
                { kind: "message", label: "메시지" },
                { kind: "table", label: "표", note: "원문을 표로" },
                { kind: "image", label: "그림", blocked: "원문이 텍스트" },
              ]}
              onPick={(kind) => {
                if (kind !== "table") return;
                const result = onAsSnapshot();
                setAsSnapshotError(result.ok ? null : result.message);
              }}
            />
          </span>
        )}
        <button
          type="button"
          onClick={() => void copyShown()}
          className={[
            "h-7 px-xs text-caption text-brand-muted hover:text-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/15 transition-colors",
            onAsSnapshot ? "" : "ml-auto",
          ].join(" ")}
        >
          {copied ? "복사됨" : "복사"}
        </button>
      </div>
      {asSnapshotError && (
        <p
          role="alert"
          className="shrink-0 px-lg pt-xs text-caption text-brand-error"
        >
          표로 읽지 못했습니다 — {asSnapshotError}
        </p>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto px-lg py-sm">
        {shown === "json" ? (
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
