"use client";

import {
  type ButtonHTMLAttributes,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
  useRef,
  useState,
} from "react";

type Props = {
  onSubmit: (text: string) => void;
  disabled?: boolean;
};

const TEXTAREA_MAX_HEIGHT = 200;

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
    // IME composition (Korean Hangul): isComposing is true while composing.
    // Don't intercept Enter during composition or it cancels Hangul finalization.
    if (e.nativeEvent.isComposing) return;
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      tryDispatch();
    }
  }

  function handleInput(e: FormEvent<HTMLTextAreaElement>) {
    const el = e.currentTarget;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, TEXTAREA_MAX_HEIGHT)}px`;
  }

  return (
    <form onSubmit={handleSubmit}>
      <div
        className={[
          "flex items-end gap-xxs",
          "rounded-3xl border border-brand-hairline bg-brand-canvas",
          "px-xs py-xxs",
          "transition-colors",
          "focus-within:border-brand-primary focus-within:ring-2 focus-within:ring-brand-primary/15",
          disabled ? "opacity-60" : "",
        ].join(" ")}
      >
        <IconButton
          aria-label="도구 / 첨부 (개발 예정)"
          disabled={disabled}
          onClick={() => {
            // TODO: open tools / attachments menu
          }}
        >
          <PlusIcon />
        </IconButton>

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
          className="flex-1 resize-none bg-transparent text-brand-ink placeholder:text-brand-muted-soft font-sans text-body-md py-[10px] px-xs focus:outline-none disabled:text-brand-muted disabled:cursor-not-allowed"
          style={{ minHeight: "40px", maxHeight: `${TEXTAREA_MAX_HEIGHT}px` }}
        />

        <IconButton
          aria-label="음성 입력 (개발 예정)"
          disabled={disabled}
          onClick={() => {
            // TODO: voice input
          }}
        >
          <MicIcon />
        </IconButton>
      </div>
    </form>
  );
}

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
};

function IconButton({ children, className, ...rest }: IconButtonProps) {
  return (
    <button
      type="button"
      className={[
        "shrink-0 inline-flex items-center justify-center",
        "w-9 h-9 rounded-full",
        "text-brand-ink",
        "hover:bg-brand-ink-translucent-04 active:bg-brand-ink-translucent-04",
        "disabled:text-brand-muted-soft disabled:cursor-not-allowed disabled:hover:bg-transparent",
        "transition-colors",
        className ?? "",
      ].join(" ")}
      {...rest}
    >
      {children}
    </button>
  );
}

function PlusIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function MicIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}
