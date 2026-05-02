"use client";

import { type ReactNode, useEffect, useId, useRef } from "react";

/**
 * Branded confirmation dialog backed by the native <dialog> element so
 * we get focus trapping, Escape handling, and the ::backdrop pseudo for
 * free. Styled to match DESIGN.md tokens — cream canvas, hairline
 * border, coral primary action.
 *
 * Backdrop click and Escape both invoke `onClose`. Confirm calls
 * `onConfirm` and then `onClose` (auto-dismiss).
 */
type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "danger";
};

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "확인",
  cancelLabel = "취소",
  variant = "default",
}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descId = useId();

  // Sync `open` prop with the imperative dialog API.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  function handleBackdropClick(e: React.MouseEvent<HTMLDialogElement>) {
    // Click directly on the <dialog> means click landed on the backdrop
    // (the inner content's clicks have e.target === inner element).
    if (e.target === e.currentTarget) {
      dialogRef.current?.close();
    }
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={handleBackdropClick}
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      className="m-auto rounded-lg border border-brand-hairline bg-brand-canvas p-0 max-w-md w-[90vw] backdrop:bg-brand-ink/40"
    >
      <div className="p-lg flex flex-col gap-md">
        <h2
          id={titleId}
          className="font-display text-display-sm text-brand-ink leading-tight"
        >
          {title}
        </h2>
        {description && (
          <div id={descId} className="text-body-md text-brand-body">
            {description}
          </div>
        )}
        <div className="flex justify-end gap-sm pt-sm">
          <button
            type="button"
            onClick={onClose}
            className="px-md h-9 rounded-md text-button text-brand-ink bg-brand-canvas border border-brand-hairline hover:bg-brand-ink-translucent-04 focus:outline-none focus:ring-2 focus:ring-brand-primary/15 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={[
              "px-md h-9 rounded-md text-button",
              "focus:outline-none focus:ring-2 transition-colors",
              variant === "danger"
                ? "bg-brand-error text-brand-on-primary hover:opacity-90 focus:ring-brand-error/30"
                : "bg-brand-primary text-brand-on-primary hover:bg-brand-primary-active focus:ring-brand-primary/30",
            ].join(" ")}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}
