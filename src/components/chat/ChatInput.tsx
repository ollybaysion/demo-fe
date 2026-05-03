"use client";

import {
  type ButtonHTMLAttributes,
  type ClipboardEvent as ReactClipboardEvent,
  type DragEvent as ReactDragEvent,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
  useRef,
  useState,
} from "react";
import type { MessageAttachment } from "@/lib/types";

type Props = {
  onSubmit: (text: string, attachments?: MessageAttachment[]) => void;
  disabled?: boolean;
  /**
   * When provided, the input is locked to this exact text (rendered as
   * ghost-styled value), the user can only press Enter to submit, and
   * typing is blocked. Used by demo scenarios (#19) to constrain the
   * presenter to the scripted next message.
   */
  lockedValue?: string;
  /**
   * Optional placeholder override. Used in demo "ended" state to show
   * a notice in place of the regular hint.
   */
  placeholder?: string;
};

const TEXTAREA_MAX_HEIGHT = 200;

// 이미지 첨부 (#91) 제약.
const MAX_ATTACH_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);
// 한 번에 너무 많은 첨부가 들어오는 케이스 방지 (drop 시).
const MAX_ATTACH_COUNT = 4;

export function ChatInput({
  onSubmit,
  disabled,
  lockedValue,
  placeholder,
}: Props) {
  const [value, setValue] = useState("");
  const [attachments, setAttachments] = useState<MessageAttachment[]>([]);
  const [attachError, setAttachError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Treat any string (including "") as locked. An empty locked value
  // shows the placeholder while still blocking typing — used for the
  // demo "ended" state.
  const isLocked = typeof lockedValue === "string";
  const displayValue = isLocked ? lockedValue : value;

  function tryDispatch() {
    const text = (isLocked ? lockedValue : value).trim();
    // 텍스트 없이 첨부만 있는 경우도 허용 (이미지만 보내고 싶을 때).
    if ((!text && attachments.length === 0) || disabled) return;
    onSubmit(text, attachments.length > 0 ? attachments : undefined);
    if (!isLocked) {
      setValue("");
      setAttachments([]);
      setAttachError(null);
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    tryDispatch();
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.nativeEvent.isComposing) return;
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      tryDispatch();
      return;
    }
    if (isLocked) {
      e.preventDefault();
    }
  }

  function handleInput(e: FormEvent<HTMLTextAreaElement>) {
    if (isLocked) return;
    const el = e.currentTarget;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, TEXTAREA_MAX_HEIGHT)}px`;
  }

  async function ingestFiles(files: FileList | File[]): Promise<void> {
    if (isLocked || disabled) return;
    setAttachError(null);
    const remainingSlots = MAX_ATTACH_COUNT - attachments.length;
    if (remainingSlots <= 0) {
      setAttachError(`첨부는 최대 ${MAX_ATTACH_COUNT}개까지 가능합니다.`);
      return;
    }
    const arr = Array.from(files).filter(
      (f): f is File => f instanceof File,
    );
    const accepted: MessageAttachment[] = [];
    for (const file of arr.slice(0, remainingSlots)) {
      if (!ALLOWED_MIME.has(file.type)) {
        setAttachError(
          `허용되지 않은 형식입니다: ${file.type || "(unknown)"}`,
        );
        continue;
      }
      if (file.size > MAX_ATTACH_BYTES) {
        setAttachError(
          `파일이 너무 큽니다 (${(file.size / 1024 / 1024).toFixed(1)}MB / 최대 5MB).`,
        );
        continue;
      }
      const dataUrl = await fileToDataUrl(file);
      accepted.push({
        id: `att_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
        type: "image",
        mime: file.type,
        name: file.name || `pasted-${Date.now()}.${mimeToExt(file.type)}`,
        sizeBytes: file.size,
        dataUrl,
      });
    }
    if (accepted.length > 0) {
      setAttachments((prev) => [...prev, ...accepted]);
    }
  }

  function handlePaste(e: ReactClipboardEvent<HTMLTextAreaElement>) {
    if (isLocked || disabled) return;
    const items = e.clipboardData?.items;
    if (!items) return;
    const files: File[] = [];
    for (const item of Array.from(items)) {
      if (item.kind === "file") {
        const f = item.getAsFile();
        if (f) files.push(f);
      }
    }
    if (files.length === 0) return;
    e.preventDefault();
    void ingestFiles(files);
  }

  function handleDrop(e: ReactDragEvent<HTMLElement>) {
    if (isLocked || disabled) return;
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer?.files?.length) {
      void ingestFiles(e.dataTransfer.files);
    }
  }

  function handleDragOver(e: ReactDragEvent<HTMLElement>) {
    if (isLocked || disabled) return;
    if (e.dataTransfer?.types?.includes("Files")) {
      e.preventDefault();
      setDragActive(true);
    }
  }

  function removeAttachment(id: string) {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  }

  return (
    <form
      onSubmit={handleSubmit}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={() => setDragActive(false)}
    >
      {/* 첨부 thumbnail strip (#91) */}
      {attachments.length > 0 && (
        <ul className="flex flex-wrap items-center gap-xs mb-xs">
          {attachments.map((a) => (
            <li
              key={a.id}
              className="relative inline-flex items-center gap-xs px-xs py-xxs rounded-md border border-brand-hairline bg-brand-canvas"
            >
              {a.dataUrl && (
                // 작은 데이터 URL 의 inline preview — Next/image 사용 안 함.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={a.dataUrl}
                  alt={a.name}
                  className="w-10 h-10 rounded-sm object-cover bg-brand-surface-soft"
                />
              )}
              <span className="text-caption text-brand-muted truncate max-w-[140px]">
                {a.name}
              </span>
              <button
                type="button"
                onClick={() => removeAttachment(a.id)}
                aria-label={`${a.name} 첨부 제거`}
                className="inline-flex items-center justify-center w-6 h-6 rounded-sm text-brand-muted hover:bg-brand-ink-translucent-04 hover:text-brand-ink focus:outline-none focus:ring-2 focus:ring-brand-primary/15"
              >
                <XIcon />
              </button>
            </li>
          ))}
        </ul>
      )}
      {attachError && (
        <p
          role="alert"
          className="mb-xs text-caption text-brand-error"
        >
          {attachError}
        </p>
      )}

      <div
        className={[
          "flex items-end gap-xxs",
          "rounded-3xl border bg-brand-canvas",
          dragActive ? "border-brand-primary ring-2 ring-brand-primary/15" : "border-brand-hairline",
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
          value={displayValue}
          onChange={(e) => {
            if (!isLocked) setValue(e.target.value);
          }}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          onPaste={handlePaste}
          disabled={disabled}
          readOnly={isLocked}
          rows={1}
          placeholder={
            placeholder ??
            (dragActive ? "이미지를 여기에 놓으세요" : "메시지를 입력하세요")
          }
          aria-label="채팅 메시지 입력"
          className={[
            "flex-1 resize-none bg-transparent",
            "placeholder:text-brand-muted-soft font-sans text-body-md",
            "py-[10px] px-xs",
            "focus:outline-none",
            "disabled:text-brand-muted disabled:cursor-not-allowed",
            isLocked ? "text-brand-muted-soft cursor-default" : "text-brand-ink",
          ].join(" ")}
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

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function mimeToExt(mime: string): string {
  switch (mime) {
    case "image/png":
      return "png";
    case "image/jpeg":
      return "jpg";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    default:
      return "bin";
  }
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

function XIcon() {
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
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
