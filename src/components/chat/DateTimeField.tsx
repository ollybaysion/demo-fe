"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  buildDateValue,
  fmtDate,
  isValidTime,
  monthCells,
  parseDateValue,
  type InputKind,
} from "@/lib/date-input";

/**
 * 날짜 인자의 캘린더 입력 — 진입 폼(AskInputs)과 입력 카드(InputCard)가 같이 쓴다.
 *
 * 시안 랩(2026-08-09)에서 확정한 C1: 칸마다 브랜드 달력 팝업 하나. 네이티브
 * datetime-local 을 쓰지 않는 이유는 팝업이 브라우저 소관이라 디자인 통제가 안
 * 되기 때문이다(demo-fe #190).
 *
 * 값은 계약 그대로 문자열이다 — 날을 고르는 순간 `YYYY-MM-DD HH:mm`(datetime)
 * / `YYYY-MM-DD`(date)를 내보내고, 부모는 텍스트 입력과 똑같이 저장한다. 시각이
 * 유효하지 않은 동안(타이핑 중)은 내보내지 않는다 — 마지막 온전한 값이 남는다.
 */
type Props = {
  kind: Exclude<InputKind, "text">;
  value: string;
  onChange: (value: string) => void;
  /** 접근성 이름 — "START 입력" 처럼 인자 라벨로. */
  label: string;
};

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

/** 팝업 높이 어림 — 트리거 아래가 이보다 좁으면 위로 연다. */
const POPUP_ESTIMATE_PX = 340;
/** 팝업 너비 — 화면 오른쪽을 넘치면 이만큼 왼쪽으로 당긴다. */
const POPUP_WIDTH_PX = 248;

export function DateTimeField({ kind, value, onChange, label }: Props) {
  const parsed = useMemo(() => parseDateValue(value), [value]);
  const today = useMemo(() => new Date(), []);

  const [open, setOpen] = useState(false);
  /** 열리는 순간의 트리거 위치 — 팝업은 fixed 라 이 좌표로 자리를 잡는다. */
  const [anchor, setAnchor] = useState<{ left: number; top: number; up: boolean } | null>(null);
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  /** 키보드 초점이 있는 날 — 화살표로 움직이고 Enter 로 고른다. */
  const [focusDate, setFocusDate] = useState<Date>(parsed?.date ?? today);
  const [timeText, setTimeText] = useState(parsed?.time ?? "");

  const triggerRef = useRef<HTMLButtonElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const timeInvalid = timeText !== "" && !isValidTime(timeText);

  function openPopup() {
    const anchorDate = parsed?.date ?? today;
    setViewYear(anchorDate.getFullYear());
    setViewMonth(anchorDate.getMonth());
    setFocusDate(anchorDate);
    setTimeText(parsed?.time ?? "");
    // 팝업은 fixed — AskInputs 의 overflow 스크롤 컨테이너 안에서도 잘리지 않게.
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) {
      const up =
        window.innerHeight - rect.bottom < POPUP_ESTIMATE_PX &&
        rect.top > window.innerHeight - rect.bottom;
      setAnchor({
        left: Math.max(8, Math.min(rect.left, window.innerWidth - POPUP_WIDTH_PX - 8)),
        top: up ? rect.top - 4 : rect.bottom + 4,
        up,
      });
    } else {
      setAnchor(null);
    }
    setOpen(true);
  }

  function close() {
    setOpen(false);
    triggerRef.current?.focus();
  }

  // 열리면 키보드를 달력으로 — 화살표 이동이 바로 되게.
  useEffect(() => {
    if (open) gridRef.current?.focus();
  }, [open]);

  function moveMonth(delta: number) {
    const d = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  }

  /** 날을 고른다 — 이 순간 값이 나간다. 팝업은 시각을 만질 수 있게 열어 둔다. */
  function pickDay(d: Date) {
    setFocusDate(d);
    onChange(buildDateValue(kind, d, timeInvalid ? "" : timeText));
    if (kind === "date") close();
  }

  /** 시각 편집 — 온전해졌을 때만 값이 따라간다(타이핑 중간엔 내보내지 않는다). */
  function editTime(v: string) {
    setTimeText(v);
    if (parsed !== null && (v === "" || isValidTime(v))) {
      onChange(buildDateValue(kind, parsed.date, v));
    }
  }

  function moveFocus(deltaDays: number) {
    const d = new Date(
      focusDate.getFullYear(),
      focusDate.getMonth(),
      focusDate.getDate() + deltaDays,
    );
    setFocusDate(d);
    if (d.getMonth() !== viewMonth || d.getFullYear() !== viewYear) {
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
    }
  }

  function onGridKeyDown(e: React.KeyboardEvent) {
    const moves: Record<string, number> = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -7,
      ArrowDown: 7,
    };
    if (e.key in moves) {
      e.preventDefault();
      moveFocus(moves[e.key]);
      return;
    }
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      pickDay(focusDate);
      return;
    }
    if (e.key === "PageUp" || e.key === "PageDown") {
      e.preventDefault();
      moveMonth(e.key === "PageUp" ? -1 : 1);
    }
  }

  const navBtn =
    "inline-flex h-6 w-6 items-center justify-center rounded-sm text-brand-muted " +
    "hover:bg-brand-ink-translucent-04 hover:text-brand-primary focus:outline-none " +
    "focus:ring-2 focus:ring-brand-primary/20";

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => (open ? close() : openPopup())}
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={[
          "flex h-8 w-full items-center justify-between rounded-sm border border-brand-hairline",
          "bg-brand-canvas px-xs text-caption text-left focus:outline-none focus:ring-2",
          "focus:ring-brand-primary/20",
          parsed ? "font-mono text-brand-ink" : "text-brand-muted-soft",
        ].join(" ")}
      >
        <span className="truncate">{parsed !== null ? value : "날짜를 고르세요"}</span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
          className="shrink-0 text-brand-muted"
        >
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      </button>

      {open && (
        <>
          {/* 바깥 클릭 = 닫기. 값은 이미 나가 있어 잃을 것이 없다. */}
          <button
            type="button"
            aria-label="달력 닫기"
            onClick={close}
            className="fixed inset-0 z-10 cursor-default"
          />
          <div
            role="dialog"
            aria-label={`${label} 달력`}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.stopPropagation();
                close();
              }
            }}
            style={
              anchor !== null
                ? {
                    left: anchor.left,
                    top: anchor.top,
                    transform: anchor.up ? "translateY(-100%)" : undefined,
                  }
                : undefined
            }
            className={[
              "fixed z-20 w-[248px] rounded-md border border-brand-hairline",
              "bg-brand-canvas p-sm shadow-lg",
            ].join(" ")}
          >
            <div className="flex flex-col gap-xs">
              <div className="flex items-center justify-between">
                <button type="button" onClick={() => moveMonth(-1)} aria-label="이전 달" className={navBtn}>
                  ‹
                </button>
                <span className="text-caption font-medium text-brand-ink">
                  {viewYear}년 {viewMonth + 1}월
                </span>
                <button type="button" onClick={() => moveMonth(1)} aria-label="다음 달" className={navBtn}>
                  ›
                </button>
              </div>

              <div className="grid grid-cols-7">
                {WEEKDAYS.map((w) => (
                  <span
                    key={w}
                    className="flex h-6 items-center justify-center text-caption text-brand-muted-soft"
                  >
                    {w}
                  </span>
                ))}
              </div>

              <div
                ref={gridRef}
                tabIndex={-1}
                onKeyDown={onGridKeyDown}
                className="grid grid-cols-7 focus:outline-none"
              >
                {monthCells(viewYear, viewMonth).map((d) => {
                  const key = fmtDate(d);
                  const inMonth = d.getMonth() === viewMonth;
                  const selected = parsed !== null && key === fmtDate(parsed.date);
                  const focused = key === fmtDate(focusDate);
                  const isToday = key === fmtDate(today);
                  return (
                    <button
                      key={key}
                      type="button"
                      tabIndex={-1}
                      onClick={() => pickDay(d)}
                      aria-label={key}
                      aria-pressed={selected}
                      className={[
                        "flex h-7 items-center justify-center rounded-sm text-caption transition-colors",
                        selected
                          ? "bg-brand-primary font-medium text-brand-on-primary"
                          : inMonth
                            ? "text-brand-ink hover:bg-brand-primary/15 hover:text-brand-primary"
                            : "text-brand-muted-soft hover:bg-brand-ink-translucent-04",
                        !selected && isToday ? "font-semibold text-brand-primary" : "",
                        !selected && focused ? "ring-2 ring-inset ring-brand-primary/40" : "",
                      ].join(" ")}
                    >
                      {d.getDate()}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between border-t border-brand-hairline-soft pt-xs">
                {kind === "datetime" ? (
                  <label className="flex items-center gap-xs">
                    <span className="shrink-0 text-caption text-brand-muted">시각</span>
                    <input
                      value={timeText}
                      onChange={(e) => editTime(e.target.value)}
                      placeholder="00:00"
                      aria-label={`${label} 시각`}
                      aria-invalid={timeInvalid}
                      className={[
                        "h-7 w-[72px] rounded-sm border bg-brand-canvas px-xs text-center font-mono",
                        "text-caption text-brand-ink placeholder:text-brand-muted-soft",
                        "focus:outline-none focus:ring-2",
                        timeInvalid
                          ? "border-brand-error focus:ring-brand-error/20"
                          : "border-brand-hairline focus:ring-brand-primary/20",
                      ].join(" ")}
                    />
                  </label>
                ) : (
                  <span />
                )}
                <div className="flex items-center gap-xs">
                  {parsed !== null && (
                    <button
                      type="button"
                      onClick={() => {
                        setTimeText("");
                        onChange("");
                      }}
                      className="text-caption text-brand-muted hover:text-brand-error focus:outline-none"
                    >
                      지우기
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={close}
                    disabled={parsed === null}
                    className="h-7 rounded-sm bg-brand-primary px-sm text-caption font-medium text-brand-on-primary hover:bg-brand-primary-active disabled:cursor-not-allowed disabled:bg-brand-canvas disabled:text-brand-muted-soft focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                  >
                    확인
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
