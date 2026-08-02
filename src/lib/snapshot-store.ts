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
 *
 *    단 **행이 없는 스냅샷은 예외다.** 내용이 없으니 내용으로 같다고 말할 수 없다 —
 *    "S-0004 로는 결과가 없다"와 "CVD-01 로는 결과가 없다"는 서로 다른 사실인데,
 *    컬럼 구성만 같으면 해시가 같아진다. 없음의 정체는 내용이 아니라 **어느 조회의
 *    없음인가**라서, 이쪽은 `queryKey` 까지 같아야 한 항목으로 접는다.
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
  // 중복은 살아 있는 것끼리만 본다 — 호출부(`commit`)의 반환 id 판정과 같은
  // 기준이어야 한다. 휴지통의 같은 내용에 접으면 버린 항목이 옛 id 로 몰래
  // 부활하고, 호출부는 새 id 를 돌려줘 카드가 허공을 가리킨다(미분류행 버그).
  const dupIndex = list.findIndex(
    (s) => s.deletedAt === undefined && isSameContent(s, next),
  );
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
 * 조회는 했는데 결과가 0행이었나 — **"아직 안 받았다"가 아니라 "없다는 사실"** 이다.
 *
 * 백엔드도 같은 기준으로 읽는다(`rows: []` + `rowCount: 0`): 미첨부와 구분해
 * 프롬프트에 싣고, 그 조회 절차를 거기서 정상 종료시킨다.
 */
export function isEmptyResult(snapshot: DataSnapshot): boolean {
  return snapshot.rows.length === 0;
}

/**
 * 없음의 내용 해시 — 내용이 없으니 엔진이 줄 해시도 없다. 대신 **어느 조회의
 * 없음인가**를 정체로 삼는다. 같은 조회를 다시 "결과 없음"으로 등록하면 한 항목으로
 * 접히고, 다른 조회의 없음은 따로 선다.
 */
export function emptyResultHash(queryKey: string): string {
  return `empty:${queryKey}`;
}

/** 같은 항목인가 — 없음끼리는 컬럼이 같아도 조회가 다르면 다른 사실이다. */
function isSameContent(a: DataSnapshot, b: DataSnapshot): boolean {
  if (a.contentHash !== b.contentHash) return false;
  if (!isEmptyResult(a) && !isEmptyResult(b)) return true;
  return a.queryKey === b.queryKey;
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
    s.deletedAt === undefined && isSameContent(s, next)
      ? { ...s, included: true }
      : s,
  );
}

/** 영구 삭제 — 되돌릴 수 없다. 휴지통에서 비울 때만 쓴다. */
export function removeSnapshot(
  list: DataSnapshot[],
  id: string,
): DataSnapshot[] {
  return list.filter((s) => s.id !== id);
}

/**
 * 휴지통으로 — 목록에서는 사라지되 저장소에는 남는다.
 *
 * 동봉(`included`)은 끈다: 지운 데이터가 요청에 계속 실리면 "지웠는데 답이
 * 그걸 근거로 말하는" 일이 생긴다. 되살릴 때 다시 켜는 건 사용자 몫이다.
 */
export function trashSnapshot(
  list: DataSnapshot[],
  id: string,
  at: string,
): DataSnapshot[] {
  return list.map((s) =>
    s.id === id ? { ...s, deletedAt: at, included: false } : s,
  );
}

/**
 * 휴지통에서 꺼낸다 — **동봉을 켠 채로** 돌아온다. 꺼진 채 돌려주면 카드의
 * 동봉 토글이 사용 중지인 지금은 되켤 길이 없어, 복원했는데 요청에 영영
 * 실리지 않는 항목이 된다. 되살린다는 건 다시 쓰겠다는 뜻이다.
 */
export function restoreSnapshot(
  list: DataSnapshot[],
  id: string,
): DataSnapshot[] {
  return list.map((s) => {
    if (s.id !== id || s.deletedAt === undefined) return s;
    const rest = { ...s, included: true };
    delete rest.deletedAt;
    return rest;
  });
}

/** 살아 있는 것들 — 화면의 목록과 요청 페이로드가 보는 유일한 집합. */
export function liveSnapshots(list: DataSnapshot[]): DataSnapshot[] {
  return list.filter((s) => s.deletedAt === undefined);
}

/** 휴지통 — 최근에 버린 것이 위로. */
export function trashedSnapshots(list: DataSnapshot[]): DataSnapshot[] {
  return list
    .filter((s) => s.deletedAt !== undefined)
    .sort((a, b) => (a.deletedAt! < b.deletedAt! ? 1 : -1));
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

/** 이미 같은 항목이 있나 — `upsertSnapshot` 이 갱신으로 접을 대상과 같은 판정. */
export function findSameContent(
  list: DataSnapshot[],
  next: DataSnapshot,
): DataSnapshot | undefined {
  return list.find((s) => isSameContent(s, next));
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

/** 요청에 실릴 것들 — 체크됐고 **버려지지 않은** 스냅샷. */
export function includedSnapshots(list: DataSnapshot[]): DataSnapshot[] {
  return list.filter((s) => s.included && s.deletedAt === undefined);
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
    // 휴지통 상태는 저장소를 건너오는 값이다 — 안 접으면 새로고침 한 번에
    // 버린 것이 전부 목록으로 돌아온다.
    ...(typeof r.deletedAt === "string" && r.deletedAt.length > 0
      ? { deletedAt: r.deletedAt }
      : {}),
  };
}
