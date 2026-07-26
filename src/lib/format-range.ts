/**
 * `2026-05-11T09:00` 쌍을 한 줄로. 같은 날이면 날짜를 한 번만 쓴다 —
 * 좁은 패널에서 반복되는 날짜가 시각을 밀어낸다.
 *
 * 문자열을 그대로 자른다(파싱하지 않는다) — 요청이 준 값이 진실원이고,
 * `Date` 로 왕복시키면 타임존이 값을 흔든다.
 */
export function formatRange(start: string, end: string): string {
  const s = split(start);
  const e = split(end);
  if (!s || !e) return `${start} – ${end}`;
  return s.date === e.date
    ? `${s.date} ${s.time} – ${e.time}`
    : `${s.date} ${s.time} – ${e.date} ${e.time}`;
}

function split(iso: string): { date: string; time: string } | null {
  const m = /^\d{4}-(\d{2}-\d{2})T(\d{2}:\d{2})/.exec(iso);
  return m ? { date: m[1], time: m[2] } : null;
}
