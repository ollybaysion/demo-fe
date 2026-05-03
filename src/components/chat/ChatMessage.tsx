"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import type { Message } from "@/lib/types";
import { MarkdownContent } from "./markdown/MarkdownContent";
import { MessageDataTable } from "./MessageDataTable";

/**
 * 메시지 단위 액션 (#30).
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
  // 풍선 높이를 측정해 paired 표 의 max-height 를 거기에 맞춤(#34) —
  // 표 내부 세로 스크롤. 사용자가 토글 버튼으로 풀 펼침 가능.
  const bubbleRef = useRef<HTMLDivElement>(null);
  const [bubbleHeight, setBubbleHeight] = useState<number | null>(null);
  const [tableExpanded, setTableExpanded] = useState(false);

  useEffect(() => {
    const el = bubbleRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setBubbleHeight(entry.contentRect.height);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if (message.role === "error") {
    return (
      <li className="flex justify-start">
        <div
          role="alert"
          className="max-w-[85%] rounded-lg px-md py-sm bg-brand-error-soft text-brand-error font-sans text-chat-message-body"
        >
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
      </li>
    );
  }

  const isUser = message.role === "user";
  const hasTable = !isUser && !!message.table;

  return (
    <li
      className={[
        "group grid gap-xs",
        // xl+ : 좌측 gutter (1fr) | 풍선 (max 768) | 우측 gutter (1fr,
        //   향후 #37 차트 자리). 풍선은 항상 중앙에 자리잡아 표 유무로
        //   위치가 흔들리지 않음. xl 미만 viewport 에서는 단일 컬럼 스택
        //   → 풍선 아래 표 인라인.
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
            message.content
          ) : (
            // 스트리밍 중에도 MarkdownContent 가 토큰마다 점진 렌더.
            <MarkdownContent content={message.content} />
          )}
        </div>
        {!streaming && (
          <ActionGroup
            message={message}
            isUser={isUser}
            onRegenerate={isUser ? undefined : onRegenerate}
          />
        )}
      </div>
      {hasTable && message.table && (
        <div className="xl:col-start-1 xl:row-start-1 min-w-0 flex justify-end">
          <MessageDataTable
            table={message.table}
            maxHeight={bubbleHeight}
            expanded={tableExpanded}
            onToggleExpand={() => setTableExpanded((v) => !v)}
          />
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
}: {
  message: Message;
  isUser: boolean;
  onRegenerate?: () => void;
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
