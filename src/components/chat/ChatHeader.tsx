"use client";

import { useState } from "react";
import { SettingsModal } from "@/components/settings/SettingsModal";

type Props = {
  onNewConversation?: () => void;
  /** 대화 이력 드로어 열기 — 3분할 상주 컬럼에서 밀려난 이력의 진입점. */
  onOpenHistory?: () => void;
};

export function ChatHeader({ onNewConversation, onOpenHistory }: Props) {
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <header className="h-16 border-b border-brand-hairline bg-brand-canvas">
      <div className="mx-auto flex h-full max-w-chat-narrow items-center justify-between px-lg">
        <div className="flex items-center gap-xs">
          {onOpenHistory && (
            <button
              type="button"
              onClick={onOpenHistory}
              aria-label="이전 대화 열기"
              title="이전 대화"
              className="shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-md text-brand-muted hover:bg-brand-ink-translucent-04 hover:text-brand-ink focus:outline-none focus:ring-2 focus:ring-brand-primary/15 transition-colors"
            >
              <MenuIcon />
            </button>
          )}
          <h1 className="font-sans text-title-lg text-brand-ink">FDC Agent</h1>
        </div>
        <div className="flex items-center gap-xs">
          {onNewConversation && (
            <button
              type="button"
              onClick={onNewConversation}
              aria-label="새 대화 시작"
              title="새 대화"
              className="shrink-0 inline-flex items-center gap-xs h-9 px-sm rounded-md text-brand-muted hover:bg-brand-ink-translucent-04 hover:text-brand-ink focus:outline-none focus:ring-2 focus:ring-brand-primary/15 transition-colors"
            >
              <NewChatIcon />
              <span className="font-sans text-button">새 대화</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            aria-label="설정 열기"
            title="설정"
            className="shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-md text-brand-muted hover:bg-brand-ink-translucent-04 hover:text-brand-ink focus:outline-none focus:ring-2 focus:ring-brand-primary/15 transition-colors"
          >
            <GearIcon />
          </button>
        </div>
      </div>
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </header>
  );
}

function MenuIcon() {
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
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

function NewChatIcon() {
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

function GearIcon() {
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
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}
