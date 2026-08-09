/**
 * 날짜 인자 판별 + 값 포맷 — 캘린더 입력(DateTimeField)의 순수 로직.
 *
 * 판별은 추측이 아니라 **spec 이 선언한 신호**다: akg spec `inputs[].type`
 * (json-spec v0.9.0, `datetime | date`)이 BE 를 거쳐 그대로 온다 — 진입 폼은
 * `GET /skills` 카탈로그로, 입력 카드는 `inputRequests[].type` 으로. 신호가
 * 없으면 자유 텍스트다.
 *
 * 나가는 값은 계약 변경 없이 문자열 그대로다: `YYYY-MM-DD HH:mm`(datetime) /
 * `YYYY-MM-DD`(date). bind 로 들어가는 관례 포맷(mock SQL 의 `HH24:MI`)과 같다.
 */

export type InputKind = "datetime" | "date" | "text";

/**
 * spec 이 선언한 type → 입력 종류. 닫힌 enum 밖의 값(오타·미래 확장)은 text 로
 * 물러난다 — 모르는 신호로 달력을 띄워 자유 입력을 막는 것이 더 나쁘다.
 */
export function inputKind(type: string | undefined): InputKind {
  if (type === "datetime" || type === "date") return type;
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
