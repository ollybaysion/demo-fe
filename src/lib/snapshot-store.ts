/**
 * 스냅샷 목록의 상태 전이 — React 밖의 순수 함수들.
 *
 * 훅에서 분리해 둔 이유는 테스트다. 중복 판정·토글 규칙 같은 규칙은 렌더러 없이
 * 검증되어야 하고, 훅은 이 함수들에 localStorage 와 `useState` 를 두른 얇은 껍데기다.
 *
 * 두 가지 규칙이 여기 박혀 있다:
 *
 *  - **중복 = 같은 내용.** 판정 기준은 엔진 `provenance.sha256`(정규화된 columns+rows
 *    의 해시)이라, 같은 표를 다른 라벨로 두 번 붙여넣어도 한 항목으로 접힌다. 이때
 *    새 항목을 만들지 않고 기존 항목을 **갱신**한다 — 사용자가 쥔 토글 상태
 *    (`included`/`pinned`)는 보존하고 라벨·시각만 새 것으로 덮는다. 다시 붙여넣는
 *    행위의 의도는 "이게 최신"이지 "하나 더"가 아니기 때문이다.
 *  - **📌 는 동봉을 전제한다.** 내용 푸시는 요청에 실려야 성립하므로 `pinned` 를
 *    켜면 `included` 도 켜지고, `included` 를 끄면 `pinned` 도 풀린다.
 */

import type { ChatDataSnapshot, DataSnapshot } from "@/lib/types";

export const SNAPSHOTS_STORAGE_KEY = "fdc-agent:data-snapshots";

/**
 * 같은 내용이 이미 있으면 그 항목을 갱신하고, 없으면 뒤에 붙인다.
 * 갱신된(또는 추가된) 항목은 제자리를 지킨다 — 목록이 튀지 않게.
 */
export function upsertSnapshot(
  list: DataSnapshot[],
  next: DataSnapshot,
): DataSnapshot[] {
  const dupIndex = list.findIndex((s) => s.contentHash === next.contentHash);
  if (dupIndex === -1) return [...list, next];

  const existing = list[dupIndex];
  const merged: DataSnapshot = {
    ...next,
    // 사용자가 쥔 상태와 항목 정체성은 기존 것을 잇는다.
    id: existing.id,
    included: existing.included,
    pinned: existing.pinned,
  };
  return list.map((s, i) => (i === dupIndex ? merged : s));
}

export function removeSnapshot(
  list: DataSnapshot[],
  id: string,
): DataSnapshot[] {
  return list.filter((s) => s.id !== id);
}

/** 동봉 토글. 끄면 📌 도 함께 풀린다. */
export function toggleIncluded(
  list: DataSnapshot[],
  id: string,
): DataSnapshot[] {
  return list.map((s) => {
    if (s.id !== id) return s;
    const included = !s.included;
    return { ...s, included, pinned: included ? s.pinned : false };
  });
}

/** 📌 토글. 켜면 동봉도 함께 켜진다. */
export function togglePinned(
  list: DataSnapshot[],
  id: string,
): DataSnapshot[] {
  return list.map((s) => {
    if (s.id !== id) return s;
    const pinned = !s.pinned;
    return { ...s, pinned, included: pinned ? true : s.included };
  });
}

export function setLabel(
  list: DataSnapshot[],
  id: string,
  label: string,
): DataSnapshot[] {
  return list.map((s) => (s.id === id ? { ...s, label } : s));
}

export function findByContentHash(
  list: DataSnapshot[],
  contentHash: string,
): DataSnapshot | undefined {
  return list.find((s) => s.contentHash === contentHash);
}

/** 요청에 실릴 것들. 카탈로그 노출과 풀의 대상이다. */
export function includedSnapshots(list: DataSnapshot[]): DataSnapshot[] {
  return list.filter((s) => s.included);
}

/** 그중 전문이 주입되는 것들(📌). */
export function pinnedSnapshots(list: DataSnapshot[]): DataSnapshot[] {
  return list.filter((s) => s.included && s.pinned);
}

/**
 * 채팅 요청에 실을 모양으로 접는다.
 *
 * 동봉된 것만 나가고, 그중 📌 만 `rows` 를 달고 나간다 — 나머지는 카탈로그 항목이라
 * 내용 없이 "이런 표가 있다"만 알린다. 동봉이 하나도 없으면 빈 배열이 아니라
 * `undefined` 를 준다: 요청 본문에서 필드 자체를 빼기 위한 것이고, 그래야 이 기능을
 * 안 쓰는 요청이 지금과 똑같은 모양으로 나간다.
 */
export function toChatPayload(
  list: DataSnapshot[],
): ChatDataSnapshot[] | undefined {
  const included = includedSnapshots(list);
  if (included.length === 0) return undefined;
  return included.map((s) => ({
    queryKey: s.queryKey,
    label: s.label,
    capturedAt: s.capturedAt,
    columns: s.columns,
    rowCount: s.rows.length,
    ...(s.pinned ? { rows: s.rows } : {}),
  }));
}

/**
 * localStorage 에서 읽은 값을 현재 모양으로 접는다.
 *
 * 저장된 값은 사용자 브라우저에 남아 있어 코드보다 오래 산다 — 모양이 어긋난
 * 항목은 통째로 버리는 대신 조용히 건너뛰어, 한 항목의 손상이 목록 전체를
 * 날리지 않게 한다.
 */
export function migrateSnapshots(input: unknown): DataSnapshot[] {
  if (!Array.isArray(input)) return [];
  const out: DataSnapshot[] = [];
  for (const raw of input) {
    const snapshot = coerceSnapshot(raw);
    if (snapshot) out.push(snapshot);
  }
  return out;
}

function coerceSnapshot(raw: unknown): DataSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (
    typeof r.id !== "string" ||
    typeof r.queryKey !== "string" ||
    typeof r.contentHash !== "string" ||
    !Array.isArray(r.columns) ||
    !Array.isArray(r.rows)
  ) {
    return null;
  }
  const columns = r.columns.filter((c): c is string => typeof c === "string");
  if (columns.length !== r.columns.length) return null;

  const rows: (string | null)[][] = [];
  for (const row of r.rows) {
    if (!Array.isArray(row)) return null;
    const cells = row.filter(
      (c): c is string | null => typeof c === "string" || c === null,
    );
    if (cells.length !== row.length) return null;
    rows.push(cells);
  }

  const included = r.included === true;
  return {
    id: r.id,
    queryKey: r.queryKey,
    label: typeof r.label === "string" ? r.label : r.queryKey,
    capturedAt: typeof r.capturedAt === "string" ? r.capturedAt : "",
    columns,
    rows,
    contentHash: r.contentHash,
    included,
    // 저장된 값이 규칙을 어겼더라도(수기 편집 등) 읽는 쪽에서 바로잡는다.
    pinned: included && r.pinned === true,
    warnings: Array.isArray(r.warnings)
      ? r.warnings.filter((w): w is string => typeof w === "string")
      : [],
  };
}
