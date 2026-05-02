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
      aria-label={open ? "설비 정보 패널 닫기" : "설비 정보 입력"}
      className={[
        "fixed top-1/4 right-0 z-20",
        "transition-transform duration-200 ease-out",
        open ? "translate-x-[-320px]" : "translate-x-0",
        "h-24 w-16 rounded-l-lg",
        "bg-brand-primary hover:bg-brand-primary-active active:bg-brand-primary-active",
        "text-brand-on-primary",
        "flex flex-col items-center justify-center gap-xxs",
        "shadow-md",
        "focus:outline-none focus:ring-2 focus:ring-brand-primary/40",
      ].join(" ")}
    >
      <Icon open={open} />
      <span
        className="font-sans font-medium leading-tight text-center"
        style={{ fontSize: "11px" }}
      >
        설비 정보
        <br />
        입력
      </span>
    </button>
  );
}

function Icon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <polyline points="9 18 15 12 9 6" />
      </svg>
    );
  }
  // Closed state: list icon — implies tabular input, complements label.
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <circle cx="4" cy="6" r="1" />
      <circle cx="4" cy="12" r="1" />
      <circle cx="4" cy="18" r="1" />
    </svg>
  );
}
