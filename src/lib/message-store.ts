/**
 * 데이터 메시지 저장 규칙 — 순수 함수(테스트 대상).
 *
 * 스냅샷(`snapshot-store`)의 동생이지만 훨씬 얇다: 메시지는 판정·파싱 상태
 * 전이가 없고(등록·삭제뿐), 본문도 작다. 휴지통도 두지 않는다 — 스냅샷과 달리
 * 원문을 다시 붙여넣으면 그대로 재등록되는 데이터라 오클릭의 비용이 낮다.
 *
 * 저장 레코드는 코드보다 오래 사는 사용자 데이터다 — 로드는 {@link coerceMessage}
 * 로 접어 손상 항목을 조용히 건너뛴다(`coerceSnapshot` 과 같은 규율).
 */

import type { DataMessage } from "./types";

/** BE `pasted` 캡과 같은 값 — 이보다 긴 텍스트는 메시지 판정에 보내지 않는다. */
export const MESSAGE_RAW_MAX_CHARS = 32_768;

/** 등록 — 같은 원문이 이미 있으면 새로 만들지 않고 그 항목을 돌려준다. */
export function upsertMessage(
  list: DataMessage[],
  message: DataMessage,
): { list: DataMessage[]; stored: DataMessage; replacedExisting: boolean } {
  const existing = list.find((m) => m.raw === message.raw);
  if (existing) {
    // 재판정 결과가 더 최신이다 — 본문은 갱신하되 정체(id)는 유지한다.
    const stored = { ...message, id: existing.id, createdAt: existing.createdAt };
    return {
      list: list.map((m) => (m.id === existing.id ? stored : m)),
      stored,
      replacedExisting: true,
    };
  }
  return { list: [...list, message], stored: message, replacedExisting: false };
}

export function removeMessage(list: DataMessage[], id: string): DataMessage[] {
  return list.filter((m) => m.id !== id);
}

/** 목록을 어떤 축으로 묶어 볼 것인가 — 정렬(최신 순)은 어느 축에서든 같다. */
export type GroupMode = "time" | "eqp" | "date";

/** 이 분 이상 비면 목록에 공백 마커를 놓는다 — 유입이 끊긴 자리를 눈으로 알게. */
export const GAP_THRESHOLD_MINUTES = 45;

/**
 * 그려질 줄 — 메시지 줄 사이에 날짜 구분선·공백 마커·묶음 머리가 섞인다.
 * 화면은 이 배열을 순서대로 그리기만 한다(묶기 규칙은 전부 여기 있다).
 */
export type MessageRow =
  | { kind: "message"; message: DataMessage }
  | { kind: "daybreak"; label: string }
  | { kind: "gap"; label: string }
  | { kind: "header"; label: string; count: number };

/** `yyyy-MM-dd`(T| )`HH:mm[:ss[.f…]]` — 뒤의 오프셋·Z 는 보지 않는다. */
const STAMP =
  /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?(?:\.(\d{1,9}))?/;

/**
 * 비교용 시각 키 — 자릿수를 고정해 사전순 비교가 곧 시간순이 되게 한다.
 *
 * 시각을 LLM 이 뽑기 때문에 표기가 흔들린다(`T` 와 공백, 소수초 3자리와 6자리,
 * 초 생략). 그대로 문자열 비교하면 `11:58:03.412` 가 `11:58:03.412765` 보다
 * 앞서는 식으로 어긋나므로, 파싱해 `YYYYMMDDHHmmss` + 소수초 9자리로 편다.
 *
 * 오프셋은 무시한다 — 한 설비군의 메시지는 같은 시간대에서 오고, 섞였을 때의
 * 정책(무엇을 기준시로 볼 것인가)은 아직 정해진 바 없다.
 */
export function timeKey(value: string | null | undefined): string | null {
  const m = typeof value === "string" ? STAMP.exec(value.trim()) : null;
  if (!m) return null;
  const [, y, mo, d, h, mi, s, frac] = m;
  return `${y}${mo}${d}${h}${mi}${s ?? "00"}${(frac ?? "").padEnd(9, "0")}`;
}

/** 정렬·묶기의 기준 시각 — 발생 시각이 없으면 등록 시각으로 줄 선다. */
function keyOf(m: DataMessage): string {
  return timeKey(m.occurredAt) ?? timeKey(m.createdAt) ?? "";
}

/**
 * 목록에 보일 시각 — `exact` 가 false 면 발생 시각이 아니라 등록 시각이다
 * (화면은 그 자리에 시각 대신 `—` 를 그린다: 없는 정보를 있는 척하지 않는다).
 */
export function messageStamp(
  m: DataMessage,
): { date: string; time: string; frac: string; exact: boolean } | null {
  const occurred = typeof m.occurredAt === "string" ? STAMP.exec(m.occurredAt.trim()) : null;
  const key = keyOf(m);
  if (!key) return null;
  return {
    date: `${key.slice(0, 4)}-${key.slice(4, 6)}-${key.slice(6, 8)}`,
    time: `${key.slice(8, 10)}:${key.slice(10, 12)}:${key.slice(12, 14)}`,
    // 원문에 없던 자릿수는 채우지 않는다 — 붙여 그리면 정밀도를 속이게 된다.
    frac: occurred?.[7] ?? "",
    exact: occurred !== null,
  };
}

/** 최신 순 — 어느 묶기 축에서도 이 순서다. */
export function sortMessages(list: DataMessage[]): DataMessage[] {
  return [...list].sort((a, b) => {
    const ka = keyOf(a);
    const kb = keyOf(b);
    return ka === kb ? 0 : ka < kb ? 1 : -1;
  });
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

/** `8월 7일 (금)` — 목록 안에서만 쓰는 짧은 날짜(연도는 구분선이 아니라 상세에). */
export function dateLabel(date: string): string {
  const [y, mo, d] = date.split("-").map(Number);
  if (!y || !mo || !d) return date;
  const weekday = WEEKDAYS[new Date(Date.UTC(y, mo - 1, d)).getUTCDay()];
  return `${mo}월 ${d}일 (${weekday})`;
}

function gapLabel(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return h > 0 ? `${h}시간 ${m ? `${m}분 ` : ""}공백` : `${m}분 공백`;
}

function minutesOfKey(key: string): number {
  return (
    Number(key.slice(8, 10)) * 60 +
    Number(key.slice(10, 12)) +
    Number(key.slice(12, 14)) / 60
  );
}

/**
 * 목록 한 벌 — 정렬 + 묶기 + 사이 표식까지 마친 줄들.
 *
 * `time` 축은 한 줄기로 흐르되 날짜가 바뀌면 구분선을, 유입이 오래 끊기면 공백
 * 마커를 끼운다. `eqp`·`date` 축은 머리를 세워 묶는다 — 설비는 이름순(사람이
 * 찾는 축이라 순서가 고정이어야 한다), 날짜는 최신순이다.
 */
export function buildMessageRows(
  list: DataMessage[],
  mode: GroupMode,
): MessageRow[] {
  const sorted = sortMessages(list);
  if (mode === "time") {
    const rows: MessageRow[] = [];
    let prev: DataMessage | null = null;
    for (const message of sorted) {
      const stamp = messageStamp(message);
      const prevStamp = prev ? messageStamp(prev) : null;
      if (stamp && prevStamp && stamp.date !== prevStamp.date) {
        rows.push({ kind: "daybreak", label: dateLabel(stamp.date) });
      } else if (stamp?.exact && prevStamp?.exact) {
        const minutes = minutesOfKey(keyOf(prev!)) - minutesOfKey(keyOf(message));
        if (minutes >= GAP_THRESHOLD_MINUTES) {
          rows.push({ kind: "gap", label: gapLabel(minutes) });
        }
      }
      rows.push({ kind: "message", message });
      prev = message;
    }
    return rows;
  }

  const groups: { key: string; label: string; items: DataMessage[] }[] = [];
  for (const message of sorted) {
    const key =
      mode === "eqp"
        ? (message.eqpId?.trim() ?? "")
        : (messageStamp(message)?.date ?? "");
    let group = groups.find((g) => g.key === key);
    if (!group) {
      const label =
        mode === "eqp" ? key || "미분류" : key ? dateLabel(key) : "시각 없음";
      group = { key, label, items: [] };
      groups.push(group);
    }
    group.items.push(message);
  }
  if (mode === "eqp") {
    // 미분류는 이름이 없으니 맨 뒤 — 설비 이름들 사이에 끼면 찾기 어렵다.
    groups.sort((a, b) =>
      a.key === b.key ? 0 : !a.key ? 1 : !b.key ? -1 : a.key < b.key ? -1 : 1,
    );
  }
  return groups.flatMap((g): MessageRow[] => [
    { kind: "header", label: g.label, count: g.items.length },
    ...g.items.map((message): MessageRow => ({ kind: "message", message })),
  ]);
}

/** 지금 화면에 보이는 순서 — 상세의 `‹ n / N ›` 가 이 순서를 따른다. */
export function visibleMessages(rows: MessageRow[]): DataMessage[] {
  return rows.flatMap((r) => (r.kind === "message" ? [r.message] : []));
}

/** 목록에 있는 설비들 — 거르개 칩의 재료. 이름순, 미분류는 빼고. */
export function equipmentsOf(list: DataMessage[]): string[] {
  const seen = new Set<string>();
  for (const m of list) {
    const eqp = m.eqpId?.trim();
    if (eqp) seen.add(eqp);
  }
  return [...seen].sort();
}

/** 거르개 — 고른 설비가 없으면 전체다(고르는 순간 그 설비들만). */
export function filterByEquipment(
  list: DataMessage[],
  picked: string[],
): DataMessage[] {
  if (picked.length === 0) return list;
  return list.filter((m) => picked.includes(m.eqpId?.trim() ?? ""));
}

/** 원문에서 제목을 만든다 — title·className 이 없을 때의 폴백(첫 줄 머리 40자). */
export function labelFromRaw(raw: string): string {
  const head = raw.trim().split(/\r?\n/, 1)[0] ?? "";
  const cut = head.slice(0, 40).trim();
  return cut.length > 0 ? cut : "메시지";
}

/** 저장분 수용 — 모양이 어긋난 항목은 버린다(부분 수용). */
export function migrateMessages(input: unknown): DataMessage[] {
  if (!Array.isArray(input)) return [];
  const out: DataMessage[] = [];
  for (const raw of input) {
    const message = coerceMessage(raw);
    if (message) out.push(message);
  }
  return out;
}

function coerceMessage(raw: unknown): DataMessage | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (
    typeof r.id !== "string" ||
    typeof r.raw !== "string" ||
    r.json === undefined ||
    r.json === null
  ) {
    return null;
  }
  return {
    id: r.id,
    label: typeof r.label === "string" && r.label.trim() ? r.label : labelFromRaw(r.raw),
    createdAt: typeof r.createdAt === "string" ? r.createdAt : "",
    raw: r.raw,
    json: r.json,
    ...(typeof r.comment === "string" && r.comment ? { comment: r.comment } : {}),
    ...(typeof r.eqpId === "string" && r.eqpId ? { eqpId: r.eqpId } : {}),
    ...(typeof r.className === "string" && r.className
      ? { className: r.className }
      : {}),
    ...(typeof r.occurredAt === "string" && timeKey(r.occurredAt)
      ? { occurredAt: r.occurredAt }
      : {}),
    ...(typeof r.docId === "string" && r.docId ? { docId: r.docId } : {}),
  };
}
