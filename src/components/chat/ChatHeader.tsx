type Props = {
  onNewConversation?: () => void;
};

export function ChatHeader({ onNewConversation }: Props) {
  return (
    <header className="h-16 border-b border-brand-hairline bg-brand-canvas">
      <div className="mx-auto flex h-full max-w-chat-narrow items-center justify-between px-lg">
        <h1 className="font-sans text-title-lg text-brand-ink">FDC Agent</h1>
        {onNewConversation && (
          <button
            type="button"
            onClick={onNewConversation}
            aria-label="새 대화 시작"
            title="새 대화"
            className="shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-full text-brand-muted hover:bg-brand-ink-translucent-04 hover:text-brand-ink focus:outline-none focus:ring-2 focus:ring-brand-primary/15 transition-colors"
          >
            <NewChatIcon />
          </button>
        )}
      </div>
    </header>
  );
}

function NewChatIcon() {
  // pencil-on-square — "새로 쓰기" 메타포 (ChatGPT 헤더 패턴)
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
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
    </svg>
  );
}
