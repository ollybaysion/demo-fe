/**
 * 메시지 판정 mock(BE #64 MVP) — `BACKEND_URL` 없는 데모에서 `chat/data` 의
 * `pasted` 왕복을 흉내낸다. BE `MessageJudge`(스니프) + `MockLlm`(최상위 k=v
 * 평탄 분해)의 축소판이고, 규칙은 그쪽이 진실원이다.
 *
 * 실 BE 와 같은 한계를 일부러 유지한다: 중첩 값은 문자열 그대로 둔다 — MVP 가
 * 결정론 파서를 들이지 않기로 한 결정을 mock 이 앞지르면 안 된다.
 */

import type { FormattedMessage } from "./chat-data";

/** BE `MessageJudge.PASTED_MAX_CHARS` 와 같은 값. */
const PASTED_MAX_CHARS = 32_768;

/** BE 스니프와 같은 모양 — 자바 toString 덤프(`Ident{...}`). */
const CLASS_DUMP = /^[A-Za-z_$][A-Za-z0-9_$.]*\s*\{[\s\S]*\}$/;

export function sniffMessage(pasted: string): boolean {
  const one = pasted.trim();
  return one.length > 0 && one.length <= PASTED_MAX_CHARS && CLASS_DUMP.test(one);
}

/**
 * 판정 + 포맷팅 — 후보가 아니면 null(불가침, FE 표 파싱 폴백).
 * `force` 는 사용자 명시(`pastedForce`) — 스니프를 건너뛴다.
 */
export function mockFormatMessage(
  pasted: string,
  force: boolean,
): FormattedMessage | null {
  const raw = pasted.trim();
  if (raw.length === 0 || raw.length > PASTED_MAX_CHARS) return null;
  if (!force && !sniffMessage(raw)) return null;

  const shape = /^([A-Za-z_$][A-Za-z0-9_$.]*)\s*\{([\s\S]*)\}$/.exec(raw);
  if (!shape) {
    return {
      json: { raw },
      comment: "(mock) 구조를 읽지 못해 원문 그대로 담았습니다.",
    };
  }
  const [, className, inner] = shape;
  const json = topLevelPairs(inner);
  const eqpId = Object.entries(json).find(
    ([k]) => k.toLowerCase() === "eqpid",
  )?.[1];
  return {
    json,
    comment: `(mock) ${className} — 최상위 필드 ${Object.keys(json).length}개를 평탄 분해했습니다.`,
    ...(eqpId ? { eqpId } : {}),
    className,
  };
}

/** 중괄호·대괄호 깊이 0 의 콤마로만 자른 `k=v` 쌍들 — 순서 보존. */
function topLevelPairs(inner: string): Record<string, string> {
  const out: Record<string, string> = {};
  let depth = 0;
  let start = 0;
  for (let i = 0; i <= inner.length; i++) {
    const c = i < inner.length ? inner[i] : ",";
    if (c === "{" || c === "[") depth++;
    else if (c === "}" || c === "]") depth--;
    else if (c === "," && depth === 0) {
      const part = inner.slice(start, i).trim();
      start = i + 1;
      const eq = part.indexOf("=");
      if (eq > 0) out[part.slice(0, eq).trim()] = part.slice(eq + 1).trim();
    }
  }
  return out;
}
