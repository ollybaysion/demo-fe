"use client";

type Props = {
  open: boolean;
  onToggle: () => void;
};

export function ContextToggleHandle({ open, onToggle }: Props) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      aria-label={open ? "컨텍스트 패널 닫기" : "컨텍스트 패널 열기"}
      className={[
        "fixed top-1/4 z-20",
        "right-0",
        // When the panel is open, the handle visually attaches to the
        // panel's left edge. We translate it to follow the panel.
        "transition-transform duration-200 ease-out",
        open ? "translate-x-[-320px]" : "translate-x-0",
        "h-12 w-6 rounded-l-md",
        "bg-brand-canvas border border-r-0 border-brand-hairline",
        "flex items-center justify-center",
        "text-brand-ink hover:bg-brand-ink-translucent-04",
        "focus:outline-none focus:ring-2 focus:ring-brand-primary/15",
      ].join(" ")}
    >
      <Chevron pointing={open ? "right" : "left"} />
    </button>
  );
}

function Chevron({ pointing }: { pointing: "left" | "right" }) {
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
      style={{ transform: pointing === "right" ? "rotate(180deg)" : undefined }}
    >
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}
