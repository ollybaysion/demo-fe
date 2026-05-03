"use client";

/**
 * 컨텍스트 핸들 바로 아래 같은 스타일로 쌓이는 요약 패널 토글.
 * 위치는 부모 wrapper가 잡고, 본 컴포넌트는 버튼 셸만 다룬다.
 */
type Props = {
  isOpen: boolean;
  onToggle: () => void;
};

export function SummaryToggleHandle({ isOpen, onToggle }: Props) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={isOpen}
      aria-label={isOpen ? "대화 요약 패널 닫기" : "대화 요약 패널 열기"}
      className={[
        "h-24 w-16 rounded-l-lg",
        "bg-brand-primary hover:bg-brand-primary-active active:bg-brand-primary-active",
        "text-brand-on-primary",
        "flex flex-col items-center justify-center gap-xxs",
        "shadow-md",
        "focus:outline-none focus:ring-2 focus:ring-brand-primary/40",
      ].join(" ")}
    >
      <Icon isOpen={isOpen} />
      <span
        className="font-sans font-medium leading-tight text-center"
        style={{ fontSize: "11px" }}
      >
        대화
        <br />
        요약
      </span>
    </button>
  );
}

function Icon({ isOpen }: { isOpen: boolean }) {
  if (isOpen) {
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
  // Clipboard glyph — operator handoff metaphor
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
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
      <rect x="9" y="3" width="6" height="4" rx="1" />
      <line x1="9" y1="12" x2="15" y2="12" />
      <line x1="9" y1="16" x2="13" y2="16" />
    </svg>
  );
}
