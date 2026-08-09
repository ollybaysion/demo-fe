"use client";

import { useEffect, useRef, useState } from "react";

/**
 * 종류 칩 — 이 데이터를 무엇으로 읽고 있는지 말하고, 거기서 바꾼다.
 *
 * [메시지로]·[표로] 처럼 **방향마다 버튼**을 두면 종류가 넷일 때 버튼이 열두 개가
 * 된다. 카드가 자기 종류를 말하고 그 자리에서 고르게 하면 종류가 늘어도 칩 하나다.
 *
 * 못 바꾸는 종류도 <b>회색으로 남기고 이유를 붙인다</b> — 감추면 종류가 몇인지
 * 익힐 수 없고, 왜 안 되는지도 영영 모른다.
 */
export type KindOption = {
  kind: string;
  label: string;
  /** 못 바꾸는 이유 — 있으면 회색으로 서고 눌리지 않는다. */
  blocked?: string;
  /** 어떻게 바뀌는지 한 마디(예: "원문을 표로") — 고르기 전에 알려 준다. */
  note?: string;
};

export function KindPicker({
  current,
  options,
  onPick,
  subject,
}: {
  /** 지금 종류 — `options` 의 kind 중 하나. */
  current: string;
  options: KindOption[];
  onPick: (kind: string) => void;
  /** 무엇의 종류인지 — 스크린리더가 읽을 대상(카드 이름). */
  subject: string;
}) {
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLSpanElement | null>(null);
  const label = options.find((o) => o.kind === current)?.label ?? current;

  // 바깥을 누르거나 Esc 로 닫는다 — 메뉴 하나 열어 두고 다른 카드를 만지면
  // 어느 카드의 메뉴인지 알 수 없게 된다.
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <span ref={boxRef} className="relative shrink-0 inline-flex">
      <button
        type="button"
        onClick={(e) => {
          // 카드 클릭(상세 열기)까지 번지면 메뉴를 열자마자 화면이 바뀐다.
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`${subject} 종류 — 지금은 ${label}`}
        title="이 데이터를 무엇으로 읽을지 고릅니다"
        className={[
          "inline-flex items-center gap-[3px] h-[21px] px-[6px] rounded-full border text-[11.5px] transition-colors focus:outline-none focus:ring-2 focus:ring-brand-primary/15",
          open
            ? "border-brand-primary/45 bg-brand-primary/10 text-brand-primary"
            : "border-brand-hairline text-brand-muted hover:text-brand-ink",
        ].join(" ")}
      >
        <span className={open ? "font-medium" : "font-medium text-brand-body"}>
          {label}
        </span>
        <span className="text-[9px] text-brand-muted-soft" aria-hidden>
          ▾
        </span>
      </button>

      {open && (
        <span
          role="menu"
          aria-label={`${subject} 종류 고르기`}
          className="absolute right-0 top-full z-30 mt-xxs min-w-[176px] rounded-lg border border-brand-hairline bg-brand-canvas p-[4px] shadow-lg"
        >
          <span className="block px-xs pt-[5px] pb-[3px] text-[10.5px] text-brand-muted-soft">
            이 데이터를 무엇으로 읽을까
          </span>
          {options.map((option) => {
            const isCurrent = option.kind === current;
            const blocked = Boolean(option.blocked);
            return (
              <button
                key={option.kind}
                type="button"
                role="menuitem"
                disabled={blocked || isCurrent}
                title={option.blocked ?? option.note ?? ""}
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen(false);
                  onPick(option.kind);
                }}
                className={[
                  "w-full flex items-center gap-xs px-xs py-[6px] rounded-md text-left text-[12.5px] transition-colors focus:outline-none focus:bg-brand-ink-translucent-04",
                  blocked
                    ? "text-brand-muted-soft/70 cursor-not-allowed"
                    : isCurrent
                      ? "font-medium text-brand-ink cursor-default"
                      : "text-brand-body hover:bg-brand-ink-translucent-04",
                ].join(" ")}
              >
                <span className="w-3 shrink-0 text-[11px] text-brand-primary">
                  {isCurrent ? "✓" : ""}
                </span>
                <span className="flex-1 min-w-0 truncate">{option.label}</span>
                {(option.blocked ?? option.note) && (
                  <span className="shrink-0 text-[10.5px] text-brand-muted-soft">
                    {option.blocked ?? option.note}
                  </span>
                )}
              </button>
            );
          })}
        </span>
      )}
    </span>
  );
}
