/**
 * 채팅 API 호출 에러 분류 / 사용자 친화 메시지 매핑.
 *
 * 분류:
 *   - network    — fetch reject (DNS/CORS/네트워크 단절)
 *   - timeout    — AbortController + setTimeout 으로 잘림
 *   - http-4xx   — 요청 자체 문제 (서버는 살아있음)
 *   - http-5xx   — 서버 측 오류
 *   - stream     — SSE `error` event 수신 또는 스트림 중단
 *   - unknown    — 위에 안 잡힌 케이스
 */

export type ChatErrorKind =
  | "network"
  | "timeout"
  | "http-4xx"
  | "http-5xx"
  | "stream"
  | "unknown";

export type ChatError = {
  kind: ChatErrorKind;
  status?: number;
  raw?: string;
};

/** 사용자 친화 메시지 — UI 에 메인 카피로 노출. */
export function chatErrorMessage(err: ChatError): string {
  switch (err.kind) {
    case "network":
      return "네트워크 연결을 확인해주세요.";
    case "timeout":
      return "응답이 지연되어 요청을 중단했어요.";
    case "http-4xx":
      return "요청을 처리할 수 없어요. 입력값을 확인해주세요.";
    case "http-5xx":
      return "서버에서 응답을 받지 못했어요. 잠시 후 다시 시도해주세요.";
    case "stream":
      return "응답 도중에 연결이 끊겼어요.";
    case "unknown":
      return "응답을 받지 못했어요.";
  }
}

/** Fetch / DOM 예외를 분류. AbortError 는 timeout 으로 매핑. */
export function classifyFetchError(err: unknown): ChatError {
  if (err instanceof DOMException && err.name === "AbortError") {
    return { kind: "timeout", raw: err.message };
  }
  if (err instanceof TypeError) {
    // 브라우저는 네트워크 단절 / DNS / CORS 모두 TypeError("Failed to fetch")
    // 으로 throw — 더 세분화는 어려움.
    return { kind: "network", raw: err.message };
  }
  if (err instanceof Error) {
    return { kind: "unknown", raw: err.message };
  }
  return { kind: "unknown", raw: String(err) };
}

/** Response 의 status 로 4xx / 5xx 분류. */
export function classifyHttpStatus(status: number): ChatError {
  if (status === 0) return { kind: "network", status };
  if (status >= 500) return { kind: "http-5xx", status };
  if (status >= 400) return { kind: "http-4xx", status };
  return { kind: "unknown", status };
}
