/**
 * 영속 식별자 생성 — 작업판 트리(설비⊃분석⊃카드)의 소속이 id 로 이어지므로
 * 충돌은 곧 소속 오염이다. 브라우저 네이티브 UUID(122비트)를 쓰고, 테스트 등
 * `crypto.randomUUID` 가 없는 환경에서만 시간+랜덤으로 물러선다.
 *
 * 접두사는 종류 구분용이다(`an_`, `card_`, `snap-` …). `snap-` 계열은 엔진
 * query_id 패턴(`^[A-Za-z0-9_][A-Za-z0-9_.-]*$`)을 만족해야 하는데 UUID 의
 * 하이픈은 허용 문자라 그대로 통과한다.
 */
export function newId(prefix = ""): string {
  const body =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return prefix ? `${prefix}${body}` : body;
}
