"use client";

import { type ReactNode, useMemo, useRef, useState } from "react";
import type {
  Message,
  MessageChartEntry,
  MessageEventTimelineEntry,
  MessageTableEntry,
} from "@/lib/types";
import { MarkdownContent } from "./markdown/MarkdownContent";
import { MarkdownErrorBoundary } from "./markdown/MarkdownErrorBoundary";
import { MessageChart } from "../paired/MessageChart";
import { MessageDataTable } from "../paired/MessageDataTable";
import { MessageEventTimeline } from "../paired/MessageEventTimeline";

/**
 * 메시지 단위 액션.
 *
 * - user 메시지: [복사]
 * - assistant 메시지: [복사] [재생성?] [👍] [👎]
 *   재생성은 ChatContainer 의 onRegenerate 가 주어진 마지막 assistant 에만 노출.
 *   feedback 은 컴포넌트-로컬 state — 백엔드 연결 전까지 휘발.
 *
 * 노출: hover + focus-within 시 100% opacity. 데스크톱 우선이며,
 * 모바일에선 액션이 60% 로 항상 보임 (탭 토글 상태는 v1 미적용).
 */
type Props = {
  message: Message;
  streaming?: boolean;
  /** 재생성 트리거. assistant / error 중 가장 최근 하나에만 전달. */
  onRegenerate?: () => void;
};

export function ChatMessage({ message, streaming, onRegenerate }: Props) {
  // 풍선 DOM ref — 표의 [확장] overlay 가 풍선 위치에 anchor
  // 하기 위해 필요.
  const bubbleRef = useRef<HTMLDivElement>(null);

  // 메시지 단위 paired panel 토글. 두 종류:
  //   1) paneCollapsed — 패널 자체를 hide/show (DOM 에서 제거 / 복원).
  //      "패널 비활성화 / 활성화".
  //   2) paneFoldCmd — 모든 자식 패널의 본문을 일괄 fold/unfold (헤더만
  //      남김 / 다시 펼침). "패널 접기 / 펼치기". tick 으로 단발성 명령
  //      을 자식 패널에 전달, 자식은 effect 로 sync 후 자체 토글 자유.
  // 세션 메모리(컴포넌트 state) — 새로고침 시 default(노출/펼침) 로 reset.
  const [paneCollapsed, setPaneCollapsed] = useState(false);
  const [paneFoldCmd, setPaneFoldCmd] = useState<{
    folded: boolean;
    tick: number;
  }>({ folded: false, tick: 0 });

  // tables / charts / event timelines 를 좌·우 컬럼에 분배.
  // 백엔드의 `side?` 힌트가 있으면 그쪽으로, 없으면 적은 쪽 우선
  // (동률이면 type fallback: 표 → 좌, 차트 → 우, 타임라인 → 좌).
  // 단수형 `table?` / `chart?` 는 backward-compat 으로 흡수.
  // 훅은 early return 이전에 호출해야 하므로 isError / isUser 분기 전에 둠.
  const distributed = useMemo(() => {
    if (message.role !== "assistant") return { left: [], right: [] };
    return distributePairedItems({
      tables: message.tables ?? (message.table ? [message.table] : []),
      charts: message.charts ?? (message.chart ? [message.chart] : []),
      eventTimelines: message.eventTimelines ?? [],
    });
  }, [
    message.role,
    message.tables,
    message.table,
    message.charts,
    message.chart,
    message.eventTimelines,
  ]);

  if (message.role === "error") {
    return (
      <li className="flex justify-start">
        <div
          role="alert"
          className="max-w-[85%] rounded-lg px-md py-sm bg-brand-error-soft text-brand-error font-sans text-chat-message-body"
        >
          <div>
            {message.content}
            {onRegenerate && (
              <>
                {" "}
                <button
                  type="button"
                  onClick={onRegenerate}
                  className="font-sans text-chat-message-body text-brand-primary underline underline-offset-2 hover:text-brand-primary-active focus:outline-none focus:ring-2 focus:ring-brand-primary/15 rounded-xs"
                >
                  다시 시도
                </button>
              </>
            )}
          </div>
          {message.errorDetail && (
            <details className="mt-xs">
              <summary className="text-caption text-brand-error/70 cursor-pointer hover:text-brand-error focus:outline-none focus:ring-2 focus:ring-brand-error/30 rounded-xs">
                원인 보기
              </summary>
              <div className="mt-xxs text-caption text-brand-error/80 font-mono whitespace-pre-wrap break-words">
                kind: {message.errorDetail.kind}
                {typeof message.errorDetail.status === "number" &&
                  `\nstatus: ${message.errorDetail.status}`}
                {message.errorDetail.raw && `\nraw: ${message.errorDetail.raw}`}
              </div>
            </details>
          )}
        </div>
      </li>
    );
  }

  const isUser = message.role === "user";
  const hasLeft = distributed.left.length > 0;
  const hasRight = distributed.right.length > 0;
  const hasPaired = hasLeft || hasRight;
  const showLeft = hasLeft && !paneCollapsed;
  const showRight = hasRight && !paneCollapsed;

  return (
    <li
      className={[
        "group grid gap-xs",
        // xl+ : 좌측 gutter (1fr) | 풍선 (max 768) | 우측 gutter (1fr,
        //   차트 자리). 풍선은 항상 중앙에 자리잡아 표 유무로 위치가
        //   흔들리지 않음. xl 미만 viewport 에서는 단일 컬럼 스택 → 풍선
        //   아래 표 인라인.
        "xl:grid-cols-[minmax(0,1fr)_minmax(0,768px)_minmax(0,1fr)] xl:gap-md xl:items-start",
      ].join(" ")}
    >
      <div
        className={[
          "flex flex-col xl:col-start-2 xl:row-start-1 min-w-0",
          isUser ? "items-end" : "items-start",
        ].join(" ")}
      >
        <div
          ref={bubbleRef}
          aria-busy={streaming || undefined}
          className={[
            "max-w-[85%] rounded-lg px-md py-sm font-sans text-chat-message-body",
            isUser
              ? "whitespace-pre-wrap bg-brand-primary text-brand-on-primary"
              : "bg-brand-surface-card text-brand-ink",
          ].join(" ")}
        >
          {isUser ? (
            <>
              {/* 첨부 thumbnail — content 위에 grid. 텍스트만 있을
                  때와 첨부 있을 때 두 케이스 모두 자연스럽게. */}
              {message.attachments && message.attachments.length > 0 && (
                <ul
                  className={[
                    "grid grid-cols-2 gap-xxs",
                    message.content ? "mb-xs" : "",
                  ].join(" ")}
                >
                  {message.attachments.map((a) => (
                    <li key={a.id}>
                      {a.dataUrl ? (
                        // base64 inline preview — 작은 이미지라 next/image 안 씀.
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={a.dataUrl}
                          alt={a.name}
                          className="max-w-full max-h-40 rounded-sm bg-brand-surface-soft"
                        />
                      ) : (
                        <span className="text-caption">{a.name}</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              {message.content}
            </>
          ) : (
            // 스트리밍 중에도 MarkdownContent 가 토큰마다 점진 렌더.
            // ErrorBoundary 로 감싸 마크다운 라이브러리 throw 시 그 메시지만
            // plain text 로 fallback. 다른 메시지·앱 트리에 무영향.
            <MarkdownErrorBoundary fallbackText={message.content}>
              <MarkdownContent content={message.content} />
            </MarkdownErrorBoundary>
          )}
        </div>
        {!streaming && (
          <ActionGroup
            message={message}
            isUser={isUser}
            onRegenerate={isUser ? undefined : onRegenerate}
            paneToggle={
              hasPaired
                ? {
                    collapsed: paneCollapsed,
                    onToggle: () => setPaneCollapsed((c) => !c),
                  }
                : undefined
            }
            paneFoldToggle={
              hasPaired && !paneCollapsed
                ? {
                    folded: paneFoldCmd.folded,
                    onToggle: () =>
                      setPaneFoldCmd((prev) => ({
                        folded: !prev.folded,
                        tick: prev.tick + 1,
                      })),
                  }
                : undefined
            }
          />
        )}
      </div>
      {showLeft && (
        <div className="xl:col-start-1 xl:row-start-1 min-w-0 flex flex-col gap-md">
          {distributed.left.map((entry, idx) => {
            const key = `left-${idx}`;
            const defaultExpanded = idx === 0;
            if (entry.kind === "table") {
              return (
                <MessageDataTable
                  key={key}
                  table={entry.payload}
                  defaultExpanded={defaultExpanded}
                  bubbleRef={bubbleRef}
                  foldCmd={paneFoldCmd}
                />
              );
            }
            if (entry.kind === "chart") {
              return (
                <MessageChart
                  key={key}
                  chart={entry.payload}
                  defaultExpanded={defaultExpanded}
                  foldCmd={paneFoldCmd}
                />
              );
            }
            return (
              <MessageEventTimeline
                key={key}
                timeline={entry.payload}
                defaultExpanded={defaultExpanded}
                bubbleRef={bubbleRef}
                foldCmd={paneFoldCmd}
              />
            );
          })}
        </div>
      )}
      {showRight && (
        <div className="xl:col-start-3 xl:row-start-1 min-w-0 flex flex-col gap-md">
          {distributed.right.map((entry, idx) => {
            const key = `right-${idx}`;
            const defaultExpanded = idx === 0;
            if (entry.kind === "table") {
              return (
                <MessageDataTable
                  key={key}
                  table={entry.payload}
                  defaultExpanded={defaultExpanded}
                  bubbleRef={bubbleRef}
                  foldCmd={paneFoldCmd}
                />
              );
            }
            if (entry.kind === "chart") {
              return (
                <MessageChart
                  key={key}
                  chart={entry.payload}
                  defaultExpanded={defaultExpanded}
                  foldCmd={paneFoldCmd}
                />
              );
            }
            return (
              <MessageEventTimeline
                key={key}
                timeline={entry.payload}
                defaultExpanded={defaultExpanded}
                bubbleRef={bubbleRef}
                foldCmd={paneFoldCmd}
              />
            );
          })}
        </div>
      )}
    </li>
  );
}

// ────────────────────────────────────────────────────────────────────
// Action group
// ────────────────────────────────────────────────────────────────────

function ActionGroup({
  message,
  isUser,
  // 재생성 버튼은 v1 에서 숨김. prop 통로는 유지.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onRegenerate,
  paneToggle,
  paneFoldToggle,
}: {
  message: Message;
  isUser: boolean;
  onRegenerate?: () => void;
  /**
   * 메시지에 paired 표/차트/타임라인이 있을 때만 전달. 클릭 시 좌·우 패널
   * 자체를 hide / show — "패널 비활성화 / 활성화".
   */
  paneToggle?: { collapsed: boolean; onToggle: () => void };
  /**
   * 메시지의 모든 paired 패널 본문을 일괄 fold / unfold (헤더만 남김 /
   * 다시 펼침). "패널 접기 / 펼치기". paneToggle 로 패널이 hide 된 상태
   * 에선 의미 없으므로 미전달.
   */
  paneFoldToggle?: { folded: boolean; onToggle: () => void };
}) {
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null);
  const [justCopied, setJustCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setJustCopied(true);
      setTimeout(() => setJustCopied(false), 1500);
    } catch {
      // 클립보드 API 가 막혀있는 환경(insecure context, 권한 거부)은 v1
      // 에서 별도 처리 안 함 — 사용자가 다시 시도하거나 직접 선택해 복사.
    }
  };

  return (
    <div
      className={[
        "flex gap-xxs mt-xxs",
        isUser ? "self-end" : "self-start",
        // 기본 60% — 모바일에서도 보이도록. 데스크톱 hover/focus 시 100%.
        "opacity-60 group-hover:opacity-100 group-focus-within:opacity-100",
        "transition-opacity",
      ].join(" ")}
    >
      <ActionButton
        onClick={handleCopy}
        aria-label={justCopied ? "복사됨" : "메시지 복사"}
      >
        {justCopied ? <CheckIcon /> : <CopyIcon />}
        <span>{justCopied ? "복사됨" : "복사"}</span>
      </ActionButton>
      {/*
        재생성 버튼은 v1 에서 표시하지 않음. 핸들러(`onRegenerate`)·
        아이콘·prop 통로(MessageList → ChatMessage)·`handleRegenerate`
        in ChatContainer 는 그대로 살려둬, 다시 켤 때는 아래 한 블록을
        복원하면 됨.

        {!isUser && onRegenerate && (
          <ActionButton onClick={onRegenerate} aria-label="응답 재생성">
            <RegenerateIcon />
            <span>재생성</span>
          </ActionButton>
        )}
      */}
      {!isUser && (
        <>
          <ActionButton
            onClick={() =>
              setFeedback((f) => (f === "up" ? null : "up"))
            }
            aria-label="좋아요"
            aria-pressed={feedback === "up"}
            active={feedback === "up"}
          >
            <ThumbsUpIcon filled={feedback === "up"} />
          </ActionButton>
          <ActionButton
            onClick={() =>
              setFeedback((f) => (f === "down" ? null : "down"))
            }
            aria-label="아쉬워요"
            aria-pressed={feedback === "down"}
            active={feedback === "down"}
          >
            <ThumbsDownIcon filled={feedback === "down"} />
          </ActionButton>
          {paneFoldToggle && (
            <ActionButton
              onClick={paneFoldToggle.onToggle}
              aria-label={paneFoldToggle.folded ? "패널 펼치기" : "패널 접기"}
              aria-pressed={paneFoldToggle.folded}
              active={paneFoldToggle.folded}
            >
              <PanelFoldIcon folded={paneFoldToggle.folded} />
              <span>{paneFoldToggle.folded ? "패널 펼치기" : "패널 접기"}</span>
            </ActionButton>
          )}
          {paneToggle && (
            <ActionButton
              onClick={paneToggle.onToggle}
              aria-label={paneToggle.collapsed ? "패널 활성화" : "패널 비활성화"}
              aria-pressed={paneToggle.collapsed}
              active={paneToggle.collapsed}
            >
              <PanelToggleIcon collapsed={paneToggle.collapsed} />
              <span>{paneToggle.collapsed ? "패널 활성화" : "패널 비활성화"}</span>
            </ActionButton>
          )}
        </>
      )}
    </div>
  );
}

function ActionButton({
  children,
  onClick,
  active,
  ...rest
}: {
  children: ReactNode;
  onClick: () => void;
  active?: boolean;
  "aria-label"?: string;
  "aria-pressed"?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "inline-flex items-center gap-xxs px-xs py-xxs rounded-sm text-caption transition-colors",
        active
          ? "bg-brand-primary/10 text-brand-primary"
          : "text-brand-muted hover:bg-brand-ink-translucent-04 hover:text-brand-ink",
        "focus:outline-none focus:ring-2 focus:ring-brand-primary/15",
      ].join(" ")}
      {...rest}
    >
      {children}
    </button>
  );
}

// ────────────────────────────────────────────────────────────────────
// Icons
// ────────────────────────────────────────────────────────────────────

/**
 * Paired panel fold/unfold 아이콘. 위·아래 chevron 으로 본문이
 * 접혀 있는지 / 펼쳐져 있는지 표현. 패널 자체 hide 와 의미 구분.
 */
function PanelFoldIcon({ folded }: { folded: boolean }) {
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
      {folded ? (
        // 접혀 있음 → 누르면 펼침 (아래로 펼쳐지는 chevron)
        <>
          <polyline points="6 9 12 15 18 9" />
        </>
      ) : (
        // 펼쳐 있음 → 누르면 접기 (위로 접히는 chevron)
        <>
          <polyline points="6 15 12 9 18 15" />
        </>
      )}
    </svg>
  );
}

/**
 * Paired panel collapse 토글 아이콘. 양쪽 안쪽 화살표(접기) /
 * 양쪽 바깥쪽 화살표(펼치기) 형태로 좌·우 패널 가시성 의미를 직관 표현.
 */
function PanelToggleIcon({ collapsed }: { collapsed: boolean }) {
  // collapsed=false 면 "지금 펼침 → 누르면 접기" — 안쪽으로 모이는 화살표.
  // collapsed=true 면 "지금 접힘 → 누르면 펼치기" — 바깥쪽으로 펴지는 화살표.
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
      {collapsed ? (
        <>
          <polyline points="3 9 3 3 9 3" />
          <polyline points="21 9 21 3 15 3" />
          <polyline points="3 15 3 21 9 21" />
          <polyline points="21 15 21 21 15 21" />
        </>
      ) : (
        <>
          <polyline points="9 3 3 3 3 9" />
          <polyline points="15 3 21 3 21 9" />
          <polyline points="9 21 3 21 3 15" />
          <polyline points="15 21 21 21 21 15" />
        </>
      )}
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

// 재생성 버튼은 v1 에서 숨김. 아이콘 정의는 유지.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function RegenerateIcon() {
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
      <polyline points="1 4 1 10 7 10" />
      <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
    </svg>
  );
}

function ThumbsUpIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3z" />
      <line x1="7" y1="22" x2="7" y2="11" />
    </svg>
  );
}

function ThumbsDownIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3z" />
      <line x1="17" y1="2" x2="17" y2="13" />
    </svg>
  );
}

// ────────────────────────────────────────────────────────────────────
// Paired items distribution
// ────────────────────────────────────────────────────────────────────

type DistributedEntry =
  | { kind: "table"; payload: MessageTableEntry }
  | { kind: "chart"; payload: MessageChartEntry }
  | { kind: "timeline"; payload: MessageEventTimelineEntry };

/**
 * tables / charts / event timelines 를 좌·우 컬럼에 분배.
 * - entry 의 `side?` 가 명시되어 있으면 그쪽으로
 * - 미지정 시 항목 수 적은 쪽 우선
 *   (동률이면 type fallback: 표→좌, 차트→우, 타임라인→좌)
 * - 입력 순서를 보존해 컬럼 안에서의 stack 순서 결정
 */
function distributePairedItems({
  tables,
  charts,
  eventTimelines,
}: {
  tables: readonly MessageTableEntry[];
  charts: readonly MessageChartEntry[];
  eventTimelines: readonly MessageEventTimelineEntry[];
}): { left: DistributedEntry[]; right: DistributedEntry[] } {
  const left: DistributedEntry[] = [];
  const right: DistributedEntry[] = [];

  const all: DistributedEntry[] = [
    ...tables.map<DistributedEntry>((t) => ({ kind: "table", payload: t })),
    ...charts.map<DistributedEntry>((c) => ({ kind: "chart", payload: c })),
    ...eventTimelines.map<DistributedEntry>((tl) => ({
      kind: "timeline",
      payload: tl,
    })),
  ];

  for (const entry of all) {
    const explicit = entry.payload.side;
    let chosen: "left" | "right";
    if (explicit) {
      chosen = explicit;
    } else if (left.length < right.length) {
      chosen = "left";
    } else if (right.length < left.length) {
      chosen = "right";
    } else {
      // 동률 — type fallback (table/timeline 좌, chart 우)
      chosen = entry.kind === "chart" ? "right" : "left";
    }
    if (chosen === "left") left.push(entry);
    else right.push(entry);
  }

  return { left, right };
}
