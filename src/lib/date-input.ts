/**
 * 날짜 인자 판별 + 값 포맷 — 캘린더 입력(DateTimeField)의 순수 로직.
 *
 * 스킬 인자에는 타입 신호가 없다(spec `inputs[]` = name·required·description뿐).
 * 그래서 key·설명 문구의 휴리스틱으로 "이 인자는 날짜다"를 판별한다. **모호하면
 * text** — 달력 오탐이 자유 입력을 막는 것이 미탐보다 나쁘다. spec 에
 * `inputs[].type` 이 생기면(akg #43) 그 신호가 이 휴리스틱을 대체한다.
 *
 * 나가는 값은 계약 변경 없이 문자열 그대로다: `YYYY-MM-DD HH:mm`(datetime) /
 * `YYYY-MM-DD`(date). bind 로 들어가는 관례 포맷(mock SQL 의 `HH24:MI`)과 같다.
 */

export type InputKind = "datetime" | "date" | "text";

/** 설명에서 시점(시각)을 뜻하는 말 — "시간"은 길이로도 읽혀 제외한다. */
const DATETIME_WORDS = /시각|일시/;
const DATE_WORDS = /날짜|일자/;

/** key 만으로 확신할 수 있는 꼬리 — 이름이 스스로 타입을 말하는 경우다. */
const DATETIME_KEY = /(^|_)(dt|datetime|time)$/i;
const DATE_KEY = /(^|_)(date|day)$/i;

/**
 * 인자 하나의 입력 종류 — key 와 사람이 읽는 문구(설명·라벨)로 판별한다.
 * 설명이 key 보다 우선한다: 저자가 사람에게 쓴 문장이 이름 관례보다 정확하다.
 */
export function inputKind(key: string, text?: string): InputKind {
  const t = text ?? "";
  if (DATETIME_WORDS.test(t)) return "datetime";
  if (DATE_WORDS.test(t)) return "date";
  if (DATETIME_KEY.test(key)) return "datetime";
  if (DATE_KEY.test(key)) return "date";
  return "text";
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** 로컬 기준 `YYYY-MM-DD` — Date 의 시각 부분은 버린다. */
export function fmtDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** `HH:mm` — 00:00~23:59 만 유효하다. */
export function isValidTime(v: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
}

/**
 * 저장된 값 문자열 → 달력 상태. 손대지 않은 칸(빈 문자열)과 못 읽는 문자열은
 * 둘 다 "아직 안 고름"이다 — 이전에 텍스트로 적어 둔 값이 있어도 깨지지 않는다.
 */
export function parseDateValue(
  value: string,
): { date: Date; time: string } | null {
  const m = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})(?: ([0-2]\d:[0-5]\d))?$/);
  if (!m) return null;
  const [, y, mo, d, time] = m;
  const date = new Date(Number(y), Number(mo) - 1, Number(d));
  // 2026-02-31 같은 넘침은 Date 가 조용히 다음 달로 만든다 — 그건 못 읽는 값이다.
  if (fmtDate(date) !== `${y}-${mo}-${d}`) return null;
  return { date, time: time ?? "" };
}

/** 달력 상태 → 나가는 값 문자열. date 종류는 시각 없이 날짜만 나간다. */
export function buildDateValue(
  kind: InputKind,
  date: Date,
  time: string,
): string {
  if (kind === "date") return fmtDate(date);
  return `${fmtDate(date)} ${isValidTime(time) ? time : "00:00"}`;
}

/** 그 달을 담는 6주(42칸) — 일요일 시작, 앞뒤 이웃 달 날짜 포함. */
export function monthCells(year: number, month: number): Date[] {
  const startOffset = new Date(year, month, 1).getDay();
  const cells: Date[] = [];
  for (let i = 0; i < 42; i++) {
    cells.push(new Date(year, month, 1 - startOffset + i));
  }
  return cells;
}
