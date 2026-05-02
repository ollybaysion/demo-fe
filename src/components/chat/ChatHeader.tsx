type Props = {
  onReset?: () => void;
};

export function ChatHeader({ onReset }: Props) {
  return (
    <header className="h-16 border-b border-brand-hairline bg-brand-canvas">
      <div className="mx-auto flex h-full max-w-chat-narrow items-center justify-between px-lg">
        <h1 className="font-sans text-title-lg text-brand-ink">FDC Agent</h1>
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
