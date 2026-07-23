import type { DataRequest, DataSnapshot } from "./types";

/**
 * 데이터 요청(pending) 상태 전이 — 순수 함수.
 *
 * 요청은 **스냅샷이 아니다.** 아직 값이 없는 요구일 뿐이라 스냅샷 목록과 섞지
 * 않고 별도 배열로 관리한다(그래야 `dataSnapshots` 동봉에 실려 나갈 일이 없다).
 * localStorage 에도 넣지 않는다 — 요청은 대화의 한 턴에 매인 것이라 보관 대상인
 * 스냅샷과 수명이 다르다.
 */

export type PendingRequest = {
  request: DataRequest;
  /**
   * 이 요청을 낳은 **user 메시지 id**. 충족된 요청의 수명 관리 단위다 —
   * 이어가기 발화("등록 완료")를 보내는 순간 같은 출처의 요청을 함께 걷어낸다.
   */
  originMessageId: string;
  /**
   * 충족됨 — 같은 `queryKey` 의 스냅샷이 등록됐다. 패널에서는 사라지고
   * (스냅샷 카드가 그 자리를 대신한다), 입력창 위에 "등록 완료" chip 안내가 뜬다.
   */
  fulfilled: boolean;
};

/**
 * 도착한 요청을 목록에 반영한다.
 *
 * 같은 `queryKey` 가 이미 있으면 **기존 것을 유지**한다. 재분석 때 백엔드가 같은
 * 요청을 다시 보내는 건 정상인데, 그때마다 새 카드를 쌓으면 패널이 같은 요구로
 * 뒤덮이고 사용자가 이미 채운 것까지 되살아난다.
 */
export function receiveRequests(
  prev: PendingRequest[],
  incoming: DataRequest[],
  originMessageId: string,
): PendingRequest[] {
  const known = new Set(prev.map((p) => p.request.queryKey));
  const added = incoming
    .filter((r) => !known.has(r.queryKey))
    .map((request) => ({ request, originMessageId, fulfilled: false }));
  return added.length === 0 ? prev : [...prev, ...added];
}

/** 스냅샷이 등록돼 요청이 충족됐다고 표시한다. */
export function markFulfilled(
  prev: PendingRequest[],
  queryKey: string,
): PendingRequest[] {
  return prev.map((p) =>
    p.request.queryKey === queryKey && !p.fulfilled
      ? { ...p, fulfilled: true }
      : p,
  );
}

/**
 * 한 메시지에서 비롯된 요청을 전부 걷어낸다 — 이어가기 발화를 보내는 순간
 * 이전 요구는 수명이 끝난다(새 응답이 여전히 부족하면 다시 요청해 온다).
 */
export function clearOrigin(
  prev: PendingRequest[],
  originMessageId: string,
): PendingRequest[] {
  return prev.filter((p) => p.originMessageId !== originMessageId);
}

/** 아직 채워지지 않은 것 — 패널 최상단에 카드로 뜬다. */
export function openRequests(list: PendingRequest[]): PendingRequest[] {
  return list.filter((p) => !p.fulfilled);
}

/**
 * 충족된 요청을 전부 걷어낸다 — 사용자가 **어떤 발화든** 보내는 순간 호출된다.
 * 등록된 스냅샷은 발화에 함께 실려 나가므로 그 시점에 요청의 소임이 끝난다.
 * "등록 완료" chip 클릭만 특별 취급하면, 안내대로 직접 타이핑한 사용자의
 * chip 이 영영 남는 자기모순이 생긴다.
 */
export function clearFulfilled(list: PendingRequest[]): PendingRequest[] {
  return list.filter((p) => !p.fulfilled);
}

/**
 * 이 메시지에서 비롯됐고 채워진 요청들 — 있으면 입력창 위에 "등록 완료" chip
 * 안내를 낸다. 자동 재전송은 하지 않는다: 질문 하나가 조회 여러 건을 요청할 수
 * 있어서, 언제 이어갈지는 사람이 정해야 한다.
 */
export function fulfilledForOrigin(
  list: PendingRequest[],
  originMessageId: string,
): PendingRequest[] {
  return list.filter((p) => p.fulfilled && p.originMessageId === originMessageId);
}

/**
 * 요청이 충족됐는가 — 같은 `queryKey` 의 스냅샷이 **동봉된 채로** 있는지.
 *
 * 보관만 하고 동봉을 꺼두면 요청에 실리지 않으므로 채워진 것이 아니다.
 */
export function isFulfilledBy(
  snapshots: DataSnapshot[],
  queryKey: string,
): boolean {
  return snapshots.some((s) => s.queryKey === queryKey && s.included);
}

/**
 * 요청 SQL 의 첫 `FROM` 에서 테이블명을 뽑는다 — 카드의 출처 테이블 칩용.
 *
 * 결정론적 추출만 한다: 식별자가 바로 오는 경우만 취하고, 서브쿼리(`FROM (`)나
 * 못 읽는 모양이면 `undefined` 를 준다 — 추측해서 채우지 않는다. 스키마 접두사는
 * 남긴다(`FDC.SENSOR_MASTER` 는 그대로가 정보다).
 */
export function tableFromSql(sql: string | undefined): string | undefined {
  if (!sql) return undefined;
  // 첫 FROM 만 본다 — 아무 FROM 이나 잡으면 `FROM (SELECT … FROM dual)` 의
  // 안쪽 테이블을 바깥 출처로 오인한다.
  const from = /\bfrom\b/i.exec(sql);
  if (!from) return undefined;
  const m = /^\s*([A-Za-z_][A-Za-z0-9_$#.]*)/.exec(
    sql.slice(from.index + from[0].length),
  );
  return m ? m[1].toUpperCase() : undefined;
}
