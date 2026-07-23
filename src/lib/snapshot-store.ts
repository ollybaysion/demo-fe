/**
 * 스냅샷 목록의 상태 전이 — React 밖의 순수 함수들.
 *
 * 훅에서 분리해 둔 이유는 테스트다. 중복 판정·토글 규칙 같은 규칙은 렌더러 없이
 * 검증되어야 하고, 훅은 이 함수들에 IndexedDB 와 `useState` 를 두른 얇은 껍데기다.
 *
 * 여기 함수들은 안 바뀐 항목의 **참조를 보존**해야 한다 — 영속화가 이전/다음
 * 배열의 참조 비교로 바뀐 레코드만 골라 쓰기 때문이다(`snapshot-idb` 의
 * `computePersistPlan`). 항목을 통째로 map 으로 복사하는 식의 리팩터링은
 * 동작은 같아 보여도 모든 레코드를 매번 다시 쓰게 만든다.
 *
 * 두 가지 규칙이 여기 박혀 있다:
 *
 *  - **중복 = 같은 내용.** 판정 기준은 엔진 `provenance.sha256`(정규화된 columns+rows
 *    의 해시)이라, 같은 표를 다른 라벨로 두 번 붙여넣어도 한 항목으로 접힌다. 이때
 *    새 항목을 만들지 않고 기존 항목을 **갱신**한다 — 사용자가 쥔 체크 상태
 *    (`included`)는 보존하고 라벨·시각만 새 것으로 덮는다. 다시 붙여넣는
 *    행위의 의도는 "이게 최신"이지 "하나 더"가 아니기 때문이다.
 *  - **체크 = 내용까지 실린다.** 상태 축은 하나다(포함/제외) — 체크된 스냅샷은
 *    rows 전문이 요청에 실리고, 해제하면 아예 실리지 않는다. 카탈로그-온리 중간
 *    상태는 두지 않는다: "표가 있다"만 알리는 상태는 모델이 값을 못 보는데 사용자는
 *    줬다고 믿는, 서로 속는 상태였다.
 */

import type { ChatDataSnapshot, DataSnapshot } from "@/lib/types";

/**
 * localStorage 세대의 키. 지금은 IndexedDB 가 정본이고, 이 키는 첫 로드
 * 이관(옛 데이터 줍기)과 IndexedDB 불가 환경의 후퇴 경로에만 쓰인다.
 */
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
  };
  return list.map((s, i) => (i === dupIndex ? merged : s));
}

/**
 * 요청 카드를 채우는 경로의 등록.
 *
 * `upsertSnapshot` 과 달리 포함을 못박는다. 갱신 경로가 사용자 체크를 보존하는 건
 * 평소엔 맞지만 여기선 함정이 된다 — 예전에 체크 해제로 등록해 둔 것과 내용이
 * 같으면, 요청을 채웠는데도 요청에 실리지 않아 채워지지 않은 채로 남는다.
 */
export function upsertFulfilling(
  list: DataSnapshot[],
  next: DataSnapshot,
): DataSnapshot[] {
  return upsertSnapshot(list, next).map((s) =>
    s.contentHash === next.contentHash ? { ...s, included: true } : s,
  );
}

export function removeSnapshot(
  list: DataSnapshot[],
  id: string,
): DataSnapshot[] {
  return list.filter((s) => s.id !== id);
}

/** 포함 체크 토글. */
export function toggleIncluded(
  list: DataSnapshot[],
  id: string,
): DataSnapshot[] {
  return list.map((s) => (s.id === id ? { ...s, included: !s.included } : s));
}

export function setLabel(
  list: DataSnapshot[],
  id: string,
  label: string,
): DataSnapshot[] {
  return list.map((s) => (s.id === id ? { ...s, label } : s));
}

/**
 * 출처 쿼리를 단다/고친다/지운다(`undefined` = 지움).
 * 빈 문자열은 저장하지 않는다 — "쿼리 없음"의 표현은 필드 부재 하나로 통일.
 */
export function setSourceSql(
  list: DataSnapshot[],
  id: string,
  sourceSql: string | undefined,
): DataSnapshot[] {
  return list.map((s) => {
    if (s.id !== id) return s;
    const trimmed = sourceSql?.trim();
    if (!trimmed) {
      if (s.sourceSql === undefined) return s;
      const rest = { ...s };
      delete rest.sourceSql;
      return rest;
    }
    return { ...s, sourceSql: trimmed };
  });
}

export function findByContentHash(
  list: DataSnapshot[],
  contentHash: string,
): DataSnapshot | undefined {
  return list.find((s) => s.contentHash === contentHash);
}

/**
 * 이름 없이 등록된 스냅샷의 자동 라벨.
 *
 * 등록은 붙여넣기만으로 끝나야 한다 — 이름은 마찰이다. 선두 컬럼 두 개를
 * 이름 삼아 두고, 더 좋은 이름은 카드에서 언제든 바꿀 수 있게 한다.
 * 컬럼 수·행 수는 라벨에 넣지 않는다 — 컬럼은 카드의 칩이, 규모는 펼친
 * 미리보기가 이미 보여주므로 라벨에 겹치면 소음이다.
 */
export function autoLabel(columns: string[]): string {
  return columns.slice(0, 2).join(" · ");
}

/** 요청에 실릴 것들 — 체크된 스냅샷. */
export function includedSnapshots(list: DataSnapshot[]): DataSnapshot[] {
  return list.filter((s) => s.included);
}

/**
 * 채팅 요청에 실을 모양으로 접는다.
 *
 * 체크된 것만 나가고, 전부 `rows` 를 달고 나간다 — 체크했다는 건 근거로 쓰라는
 * 뜻이니 내용이 함께 가야 한다. 체크가 하나도 없으면 빈 배열이 아니라
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
    rows: s.rows,
  }));
}

/**
 * 저장소(IndexedDB 레코드 또는 localStorage 세대)에서 읽은 값을 현재 모양으로 접는다.
 *
 * 저장된 값은 사용자 브라우저에 남아 있어 코드보다 오래 산다 — 모양이 어긋난
 * 항목은 통째로 버리는 대신 조용히 건너뛰어, 한 항목의 손상이 목록 전체를
 * 날리지 않게 한다. (구버전이 남긴 `pinned` 필드는 조용히 버린다 — 상태 축이
 * 하나로 줄면서 체크가 그 역할까지 흡수했다.)
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

  return {
    id: r.id,
    queryKey: r.queryKey,
    label: typeof r.label === "string" ? r.label : r.queryKey,
    capturedAt: typeof r.capturedAt === "string" ? r.capturedAt : "",
    columns,
    rows,
    contentHash: r.contentHash,
    included: r.included === true,
    warnings: Array.isArray(r.warnings)
      ? r.warnings.filter((w): w is string => typeof w === "string")
      : [],
    ...(typeof r.sourceSql === "string" && r.sourceSql.trim().length > 0
      ? { sourceSql: r.sourceSql }
      : {}),
  };
}
