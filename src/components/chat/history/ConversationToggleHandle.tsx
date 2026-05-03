"use client";

/**
 * 좌측 슬롯의 대화 이력 사이드바를 여닫는 floating 핸들.
 * 우측 ContextToggleHandle / SummaryToggleHandle 의 좌우 미러 — 모서리만
 * 반대(rounded-r-lg)고, 화살표 방향도 반대.
 *
 * 위치/translate(x)는 부모 wrapper(`ChatContainer`의 left-handle stack)가
 * 책임지므로 여기서는 버튼 셸만 다룬다.
 */
type Props = {
  isOpen: boolean;
  onToggle: () => void;
};

export function ConversationToggleHandle({ isOpen, onToggle }: Props) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={isOpen}
      aria-label={isOpen ? "이전 대화 패널 닫기" : "이전 대화 패널 열기"}
      className={[
        "h-24 w-16 rounded-r-lg",
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
        이전
        <br />
        대화
      </span>
    </button>
  );
}

function Icon({ isOpen }: { isOpen: boolean }) {
  if (isOpen) {
    // chevron-left — 닫으면 좌측으로 사라짐을 시각화
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
        <polyline points="15 18 9 12 15 6" />
      </svg>
    );
  }
  // history clock glyph — 시간 거꾸로 돌리는 메타포
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
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
      <polyline points="3 3 3 8 8 8" />
      <polyline points="12 7 12 12 15 14" />
    </svg>
  );
}
