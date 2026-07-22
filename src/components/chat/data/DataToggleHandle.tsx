"use client";

/**
 * 우측 슬롯의 데이터 스냅샷 패널을 여닫는 floating 핸들.
 *
 * 위치/translate(-x)는 부모 wrapper(`ChatContainer`의 right-handle stack)가
 * 책임지므로 여기서는 버튼 셸만 다룬다 — `ContextToggleHandle` 과 같은 규약.
 */
type Props = {
  isOpen: boolean;
  onToggle: () => void;
  /** 동봉된 스냅샷 수. 0 이면 뱃지를 달지 않는다. */
  includedCount: number;
};

export function DataToggleHandle({ isOpen, onToggle, includedCount }: Props) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={isOpen}
      aria-label={isOpen ? "데이터 패널 닫기" : "데이터 패널 열기"}
      className={[
        "relative h-24 w-16 rounded-l-lg",
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
        데이터
      </span>
      {includedCount > 0 && (
        // 패널이 닫혀 있어도 몇 개가 요청에 실리는지 보이게 한다 — 동봉은
        // 요금과 응답에 영향을 주는데 접힌 패널 뒤에 숨으면 잊힌다.
        <span
          aria-label={`${includedCount}개 동봉됨`}
          className="absolute top-1 right-1 min-w-[16px] h-4 px-[3px] rounded-pill bg-brand-canvas text-brand-primary text-center font-sans font-semibold"
          style={{ fontSize: "10px", lineHeight: "16px" }}
        >
          {includedCount}
        </span>
      )}
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
      <ellipse cx="12" cy="6" rx="8" ry="3" />
      <path d="M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6" />
      <path d="M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" />
    </svg>
  );
}
