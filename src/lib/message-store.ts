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

/**
 * 설비별 묶음 — 설비 카드의 "메시지 한 줄"과 왼쪽 목록이 같은 규칙을 쓴다.
 * `eqpId` 가 없으면 미분류(`""` 키) 한 묶음이다. 등장 순서 보존.
 */
export function groupMessagesByEquipment(
  list: DataMessage[],
): { equipment: string; messages: DataMessage[] }[] {
  const order: string[] = [];
  const byEq = new Map<string, DataMessage[]>();
  for (const m of list) {
    const key = m.eqpId?.trim() ?? "";
    let bucket = byEq.get(key);
    if (!bucket) {
      bucket = [];
      byEq.set(key, bucket);
      order.push(key);
    }
    bucket.push(m);
  }
  return order.map((key) => ({ equipment: key, messages: byEq.get(key)! }));
}

/** 원문에서 제목을 만든다 — className 이 없을 때의 폴백(첫 줄 머리 40자). */
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
    ...(typeof r.docId === "string" && r.docId ? { docId: r.docId } : {}),
  };
}
