type Props = {
  onReset?: () => void;
  /** 메시지가 1건 이상이고 요약 패널이 사용 가능할 때만 prop을 채워 넘김. */
  onOpenSummary?: () => void;
};

export function ChatHeader({ onReset, onOpenSummary }: Props) {
  return (
    <header className="h-16 border-b border-brand-hairline bg-brand-canvas">
      <div className="mx-auto flex h-full max-w-chat-narrow items-center justify-between px-lg">
        <h1 className="font-sans text-title-lg text-brand-ink">FDC Agent</h1>
        <div className="flex items-center gap-xxs">
          {onOpenSummary && (
            <button
              type="button"
              onClick={onOpenSummary}
              aria-label="대화 요약 패널 열기"
              title="대화 요약"
              className="shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-full text-brand-muted hover:bg-brand-ink-translucent-04 hover:text-brand-ink focus:outline-none focus:ring-2 focus:ring-brand-primary/15 transition-colors"
            >
              <SummaryIcon />
            </button>
          )}
          {onReset && (
            <button
              type="button"
              onClick={onReset}
              aria-label="대화 초기화"
              title="대화 초기화"
              className="shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-full text-brand-muted hover:bg-brand-ink-translucent-04 hover:text-brand-ink focus:outline-none focus:ring-2 focus:ring-brand-primary/15 transition-colors"
            >
              <ResetIcon />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

function ResetIcon() {
  return (
    <svg
      width="18"
      height="18"
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

function SummaryIcon() {
  // Clipboard glyph — implies "copy / handoff to ops"
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
      <rect x="9" y="3" width="6" height="4" rx="1" />
      <line x1="9" y1="12" x2="15" y2="12" />
      <line x1="9" y1="16" x2="13" y2="16" />
    </svg>
  );
}
