"use client";

/**
 * 스킬 사용 이력 — "자주 쓰는 것"의 유일한 정직한 출처.
 *
 * 카탈로그에는 인기·우선순위 같은 필드가 없고 만들 근거도 없다(사용 데이터는
 * 이 브라우저에만 있다). 그래서 **이 사용자가 최근 고른 것**을 최근 순으로 남겨
 * 목록 맨 위에 세운다. 30개를 매번 훑지 않게 하는 장치이므로 정확도보다 **직전에
 * 쓴 것이 위에 있다**는 예측 가능성이 중요하다.
 *
 * 스냅샷과 달리 지워져도 잃는 것이 없어(순서만 초기화) 실패는 조용히 흘린다.
 */

const KEY = "fdc.skill.recent";
const LIMIT = 8;

export function readRecentSkills(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((v): v is string => typeof v === "string").slice(0, LIMIT)
      : [];
  } catch {
    return [];
  }
}

/** 방금 쓴 스킬을 맨 앞으로. 같은 것이 이미 있으면 끌어올린다(중복 없음). */
export function recordSkillUse(skill: string): string[] {
  const next = [skill, ...readRecentSkills().filter((s) => s !== skill)].slice(
    0,
    LIMIT,
  );
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      // 저장 실패는 순서를 잃을 뿐이라 조용히 넘어간다.
    }
  }
  return next;
}
