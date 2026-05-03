"use client";

import { useEffect, useRef, useState } from "react";
import { HELP_MARKDOWN } from "@/content/help";
import { MarkdownContent } from "@/components/chat/markdown/MarkdownContent";

/**
 * 도움말 FAB + 모달.
 *
 * - 좌측 하단 fixed FAB (`?` 아이콘) — 모든 화면에서 항상 노출
 * - 클릭 → 중앙 모달 (마크다운 렌더링)
 * - 닫기: X 버튼 / ESC / backdrop 클릭
 * - 모달 내부 스크롤 — 긴 가이드 대응
 *
 * 콘텐츠는 `src/content/help.md` (raw text import). 마크다운 렌더링은
 * MarkdownContent 재사용.
 */
export function HelpButton() {
  const [open, setOpen] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // ESC 닫기 + 열렸을 때 X 버튼에 포커스.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    closeButtonRef.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="도움말 / 운영 정책"
        className="fixed bottom-lg right-lg z-30 inline-flex items-center justify-center w-11 h-11 rounded-full bg-brand-primary text-brand-on-primary shadow-md hover:bg-brand-primary-active focus:outline-none focus:ring-2 focus:ring-brand-primary/40 transition-colors"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <QuestionIcon />
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="도움말"
          className="fixed inset-0 z-50 flex items-center justify-center p-md"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-brand-ink/40"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          {/* Modal card */}
          <div className="relative w-full max-w-2xl max-h-[85vh] bg-brand-canvas rounded-lg shadow-xl flex flex-col">
            <div className="flex items-center justify-between px-md py-sm border-b border-brand-hairline">
              <h2 className="font-sans text-body-md text-brand-ink">도움말</h2>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={() => setOpen(false)}
                aria-label="닫기"
                className="inline-flex items-center justify-center w-8 h-8 rounded-sm text-brand-muted hover:bg-brand-ink-translucent-04 hover:text-brand-ink focus:outline-none focus:ring-2 focus:ring-brand-primary/15 transition-colors"
              >
                <CloseIcon />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-md py-sm">
              <MarkdownContent content={HELP_MARKDOWN} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function QuestionIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
