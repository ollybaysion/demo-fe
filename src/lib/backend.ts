/**
 * Mock route vs 실 백엔드 forward 분기점.
 *
 * 운영 환경에서 `BACKEND_URL=https://fdc-api.internal` 같은 env 만
 * 주입하면 모든 `/api/fdc/v1/*` route 가 그쪽으로 forward.
 * env 미설정 시 각 route 의 mock 응답이 그대로 반환된다.
 *
 * 클라이언트는 항상 동일 path (`/api/fdc/v1/...`) 를 호출 — swap 시
 * 클라이언트 코드 무수정.
 *
 * **데모 모드**(시나리오 starter 흐름)와는 별개:
 *   - 데모 모드: chat 응답이 미리 짜여 있음 (route.ts 가 scenario 메타에
 *     따라 정해진 텍스트를 SSE 로 emit).
 *   - Mock route: 백엔드가 없어서 route.ts 가 자기 응답을 만드는 상태.
 *     데모 모드 여부와 무관하게 일반 채팅도 mock 응답.
 */

const RAW = process.env.BACKEND_URL?.trim();

/** 운영 환경이면 백엔드 base URL, 아니면 null. */
export const BACKEND_URL: string | null = RAW && RAW.length > 0 ? RAW : null;

/** route.ts 가 자기 mock 응답을 반환해야 하는지 여부. */
export const IS_MOCK = BACKEND_URL === null;

/**
 * 백엔드 미설정 시 `mockResponse()` 결과를 그대로 반환.
 * 설정 시 같은 path 를 백엔드로 forward (요청 method / body / 일부
 * 헤더 보존). 응답은 status / 헤더 / body 를 그대로 통과.
 */
export async function forwardOrMock(
  request: Request,
  apiPath: string,
  mockResponse: () => Response | Promise<Response>,
): Promise<Response> {
  if (!BACKEND_URL) {
    return mockResponse();
  }
  const url = new URL(apiPath, BACKEND_URL);
  // 본 클라이언트가 보낸 query string 보존.
  const incoming = new URL(request.url);
  url.search = incoming.search;
  // request body 는 GET / HEAD 가 아닐 때만 통과.
  const init: RequestInit = {
    method: request.method,
    headers: forwardHeaders(request.headers),
    body:
      request.method === "GET" || request.method === "HEAD"
        ? undefined
        : await request.clone().arrayBuffer(),
  };
  return fetch(url.toString(), init);
}

const HOP_BY_HOP = new Set([
  "host",
  "connection",
  "content-length",
  "transfer-encoding",
  "keep-alive",
  "upgrade",
]);

function forwardHeaders(src: Headers): Headers {
  const out = new Headers();
  src.forEach((v, k) => {
    if (!HOP_BY_HOP.has(k.toLowerCase())) out.set(k, v);
  });
  return out;
}
