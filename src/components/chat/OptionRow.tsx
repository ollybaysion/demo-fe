"use client";

/**
 * 선택지 한 행 — 번호 배지 + 라벨 + 캡션 + 동결.
 *
 * `ChoiceCard`(#173)의 목록 행(`variant="row"`)과 `CaptureClassifyCard`(#189)의
 * 카드형 행(`variant="tile"`/`"tile-quiet"`)이 이 컴포넌트를 공유한다 — 두 곳
 * 확정 시안의 겉모양은 다르지만(목록 vs 테두리 카드), 번호·라벨·캡션·동결이라는
 * 같은 문법을 쓴다. `row`는 다중 선택 상태(`selected`)를 틱으로 보여 주고,
 * `tile`/`tile-quiet`는 누르면 즉시 확정되는 행이라 선택 상태 없이 화살표만 둔다.
 */
type Variant = "row" | "tile" | "tile-quiet";

type Props = {
  index: number;
  label: string;
  caption?: string;
  selected?: boolean;
  frozen?: boolean;
  variant?: Variant;
  onClick: () => void;
};

export function OptionRow({
  index,
  label,
  caption,
  selected = false,
  frozen = false,
  variant = "row",
  onClick,
}: Props) {
  if (variant === "row") {
    return (
      <button
        type="button"
        data-opt
        aria-pressed={selected}
        disabled={frozen}
        onClick={onClick}
        className={
          "flex items-start gap-xs w-full min-w-0 rounded-sm px-xs py-[5px] min-h-8 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30 " +
          (selected ? "bg-brand-primary/10" : "hover:bg-brand-ink-translucent-04") +
          (frozen ? " cursor-not-allowed" : "")
        }
      >
        <Badge index={index} tone="row" on={selected} />
        <span className="flex-1 min-w-0 flex flex-col">
          <span className={"text-body-sm " + (selected ? "text-brand-ink" : "text-brand-body")}>
            {label}
          </span>
          {caption && <span className="text-caption text-brand-muted">{caption}</span>}
        </span>
        {selected && <Tick className="shrink-0 mt-[5px] text-brand-primary" />}
      </button>
    );
  }

  const quiet = variant === "tile-quiet";
  return (
    <button
      type="button"
      data-opt
      disabled={frozen}
      onClick={onClick}
      className={
        "flex items-center gap-sm w-full min-w-0 rounded-md px-sm py-xs text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30 border " +
        (quiet
          ? "border-dashed border-brand-hairline-soft bg-brand-surface-soft hover:border-solid hover:border-brand-primary hover:bg-brand-primary/5"
          : "border-brand-hairline bg-brand-canvas hover:border-brand-primary hover:bg-brand-primary/5") +
        (frozen ? " cursor-not-allowed opacity-60" : "")
      }
    >
      <Badge index={index} tone={variant} on={false} />
      <span className="flex-1 min-w-0 flex flex-col">
        <span className={"text-body-sm " + (quiet ? "text-brand-body" : "text-brand-ink")}>
          {label}
        </span>
        {caption && <span className="text-caption text-brand-muted-soft">{caption}</span>}
      </span>
      <span className="shrink-0 text-brand-muted-soft text-caption" aria-hidden>
        ›
      </span>
    </button>
  );
}

function Badge({ index, on, tone }: { index: number; on: boolean; tone: Variant }) {
  const color =
    tone === "row"
      ? on
        ? "border-brand-primary bg-brand-primary text-brand-on-primary"
        : "border-brand-hairline text-brand-muted"
      : tone === "tile-quiet"
        ? "border-brand-muted-soft text-brand-muted"
        : "border-transparent bg-brand-surface-cream-strong text-brand-body";
  return (
    <span
      className={
        "shrink-0 inline-flex items-center justify-center w-5 h-5 rounded-full border font-mono text-[11px] leading-none transition-colors " +
        (tone === "row" ? "mt-[1px] " : "") +
        color
      }
    >
      {index}
    </span>
  );
}

function Tick({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="10"
      height="10"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
