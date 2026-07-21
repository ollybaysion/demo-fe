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
   * 이 요청을 낳은 **user 메시지 id**. 채워졌을 때 "그 질문까지의 히스토리"로
   * 되돌려 보내기 위해 붙잡아 둔다 — 사용자가 다시 타이핑하지 않게.
   */
  originMessageId: string;
  /**
   * 충족됨 — 같은 `queryKey` 의 스냅샷이 등록됐다. 패널에서는 사라지고
   * (스냅샷 카드가 그 자리를 대신한다), 채팅에 "다시 분석" 버튼이 남는다.
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
 * 한 메시지에서 비롯된 요청을 전부 걷어낸다 — 그 질문을 다시 분석하는 순간
 * 이전 요구는 수명이 끝난다(새 응답이 필요한 걸 다시 요청한다).
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
 * 이 메시지에서 비롯됐고 채워진 요청들 — 있으면 채팅에 "다시 분석" 버튼을 낸다.
 * 자동 재전송은 하지 않는다: 질문 하나가 조회 여러 건을 요청할 수 있어서, 언제
 * 쏠지는 사람이 정해야 한다.
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
