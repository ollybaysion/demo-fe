"use client";

import { type FormEvent, type KeyboardEvent, useRef, useState } from "react";

type Props = {
  onSubmit: (text: string) => void;
  disabled?: boolean;
};

export function ChatInput({ onSubmit, disabled }: Props) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function tryDispatch() {
    const text = value.trim();
    if (!text || disabled) return;
    onSubmit(text);
    setValue("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    tryDispatch();
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    // IME composition (Korean): isComposing is true mid-Hangul-input. Block submit.
    if (e.nativeEvent.isComposing) return;
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      tryDispatch();
    }
  }

  function handleInput(e: FormEvent<HTMLTextAreaElement>) {
    const el = e.currentTarget;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-sm">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onInput={handleInput}
        disabled={disabled}
        rows={1}
        placeholder="메시지를 입력하세요"
        aria-label="채팅 메시지 입력"
        className="flex-1 resize-none bg-brand-canvas text-brand-ink placeholder:text-brand-muted-soft font-sans text-body-md rounded-md border border-brand-hairline px-sm py-sm focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/15 disabled:bg-brand-surface-soft disabled:text-brand-muted disabled:cursor-not-allowed transition-colors"
        style={{ minHeight: "44px", maxHeight: "200px" }}
      />
      <button
        type="submit"
        disabled={disabled || !value.trim()}
        className="h-10 px-md bg-brand-primary text-brand-on-primary font-sans text-button rounded-md hover:bg-brand-primary-active active:bg-brand-primary-active disabled:bg-brand-primary-disabled disabled:text-brand-muted disabled:cursor-not-allowed transition-colors"
      >
        전송
      </button>
    </form>
  );
}
