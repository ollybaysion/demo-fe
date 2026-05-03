/**
 * 서버 측 구조화 로거.
 *
 * - pino 기반. dev 는 pino-pretty 로 사람이 읽기 좋게 출력, production
 *   은 JSON line 으로 stdout — 컨테이너 로그 수집기(Loki / CloudWatch /
 *   Datadog 등) 가 그대로 색인 가능.
 * - 자동 redact: 민감 헤더 / 페이로드 키 / 사용자 메시지 본문(length 만).
 * - 외부 sink 연동(Sentry 등) 은 별도 작업.
 *
 * Next 16 의 API route 가 Node runtime 일 때 동작. edge runtime 에서는
 * pino 가 동작하지 않아 별도 처리 필요.
 */

import pino, { type Logger } from "pino";

const isProd = process.env.NODE_ENV === "production";

/**
 * 자동 redact 경로 (pino 의 fast-redact 표기). 민감한 부분만 `[REDACTED]`
 * 로 치환되고 나머지 객체 구조는 보존되어 grep / jq 가능.
 */
const redactPaths = [
  // 헤더 (대소문자 분리해서 둘 다 잡음)
  "*.headers.authorization",
  "*.headers.Authorization",
  "*.headers.cookie",
  "*.headers.Cookie",
  "*.headers['x-api-key']",
  "*.headers['X-API-Key']",
  // 페이로드 일반 민감 키
  "*.password",
  "*.token",
  "*.secret",
  "*.apiKey",
  "*.api_key",
  // 사용자 메시지 본문 — log 시점에는 length 등 메타만 별도 필드로 옮기고
  // 본문 자체는 redact.
  "req.body.messages[*].content",
];

export const logger: Logger = pino({
  level: process.env.LOG_LEVEL ?? (isProd ? "info" : "debug"),
  redact: { paths: redactPaths, censor: "[REDACTED]" },
  // dev: 사람이 읽는 출력. prod: JSON.
  transport: isProd
    ? undefined
    : {
        target: "pino-pretty",
        options: { translateTime: "HH:MM:ss.l", ignore: "pid,hostname" },
      },
});

/**
 * Request-scoped child logger. requestId / route / 기타 메타를 자동
 * 첨부해 한 요청의 로그가 흩어져도 grep 으로 묶을 수 있도록 함.
 */
export function makeRequestLogger(requestId: string, route: string): Logger {
  return logger.child({ requestId, route });
}

/**
 * UUID 생성 helper — Node 22+ / Web crypto 모두 지원. middleware 가
 * 없는 단계에서는 각 route 가 직접 호출.
 */
export function newRequestId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
