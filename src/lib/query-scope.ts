/**
 * 질의 대상(스코프) — 이 질문을 **무엇을 놓고** 하는지.
 *
 * 이 화면은 "이 설비에 관해 자유롭게 질의하세요"인데 어느 설비인지는 사람만 안다.
 * 그래서 사용자가 오른쪽 설비 카드를 입력창 위 트레이에 담고, 담긴 것이 곧 이
 * 질문의 범위가 된다.
 *
 * 담는 단위는 **설비**와 **분석 카드** 둘이고 성격은 같다 — 넓이만 다르다.
 * 설비를 담으면 그 설비 전체가, 분석 카드를 담으면 그 설비의 그 분석만. 그래서
 * 하나의 목록에 섞여 살고, 상위가 담기면 하위는 **흡수**된다(둘 다 담아 봐야 같은
 * 것을 두 번 말하는 셈이라, 담긴 것과 보내는 것이 어긋나 보인다).
 *
 * 여기는 규칙만 있는 순수 모듈이다 — 상태는 `ChatContainer` 가 쥔다.
 * `@/lib/request-store`·`@/lib/input-store` 의 형제.
 */

import type { SkillSession } from "./skills";

export type ScopeItem =
  | { kind: "equipment"; equipment: string }
  | {
      kind: "analysis";
      equipment: string;
      /** 파생 줄의 키(`derive-cards` 의 버킷 키) — 화면의 그 줄과 1:1. */
      lineKey: string;
      /** 그 줄이 보는 차원 — "측정 분포". 화면 표기이자 스킬 스텝과의 연결고리. */
      category: string;
    };

/** 회신 본문의 `scope` — BE `QueryScope` 의 거울. */
export type ChatScope = {
  equipments?: string[];
  analyses?: {
    id: string;
    equipment: string;
    skill?: string;
    focus?: string;
    inputs?: Record<string, string>;
  }[];
};

/** 같은 것을 두 번 담지 않기 위한 식별자. */
export function scopeKey(item: ScopeItem): string {
  return item.kind === "equipment"
    ? `eq:${item.equipment}`
    : `an:${item.lineKey}`;
}

/** 칩·뱃지에 적는 이름 — 분석은 설비 아래 한 단이라 경로로 적는다. */
export function scopeLabel(item: ScopeItem): string {
  return item.kind === "equipment"
    ? item.equipment
    : `${item.equipment} › ${item.category}`;
}

/** 이 설비가 통째로 담겼는가. */
export function hasEquipment(scope: ScopeItem[], equipment: string): boolean {
  return scope.some((i) => i.kind === "equipment" && i.equipment === equipment);
}

/**
 * **이 줄 자체가** 담겼는가 — 설비가 통째로 담긴 경우는 여기 안 센다.
 *
 * <p>흡수는 화면에서 **테두리 중첩**으로 말한다: 굵은 설비 테두리 안에 있으면
 * 그게 곧 포함이다. 그걸 줄에도 또 표시하면, 담긴 것은 하나인데 표시는 여럿이
 * 되어 트레이의 칩 수와 어긋난다.
 */
export function hasLine(scope: ScopeItem[], lineKey: string): boolean {
  return scope.some((i) => i.kind === "analysis" && i.lineKey === lineKey);
}

/**
 * 담는다. 상위(설비)를 담으면 그 설비의 분석 줄들은 흡수돼 목록에서 빠지고,
 * 이미 설비가 담긴 상태에서 그 아래 줄을 담는 건 아무 일도 아니다(이미 포함).
 */
export function addToScope(scope: ScopeItem[], item: ScopeItem): ScopeItem[] {
  if (scope.some((i) => scopeKey(i) === scopeKey(item))) return scope;
  if (item.kind === "equipment") {
    const kept = scope.filter(
      (i) => !(i.kind === "analysis" && i.equipment === item.equipment),
    );
    return [...kept, item];
  }
  if (hasEquipment(scope, item.equipment)) return scope;
  return [...scope, item];
}

export function removeFromScope(
  scope: ScopeItem[],
  item: ScopeItem,
): ScopeItem[] {
  return scope.filter((i) => scopeKey(i) !== scopeKey(item));
}

/**
 * 담기 토글.
 *
 * <p>설비가 통째로 담긴 상태에서 그 아래 줄을 누르면 **그 줄로 좁힌다**(설비를
 * 빼고 줄을 담는다) — 이미 포함된 것을 또 담는 건 아무 일도 아니고, 통째로
 * 빼버리는 것도 "이 분석만 보겠다"는 뜻과 다르다.
 */
export function toggleScope(scope: ScopeItem[], item: ScopeItem): ScopeItem[] {
  if (scope.some((i) => scopeKey(i) === scopeKey(item))) {
    return removeFromScope(scope, item);
  }
  if (item.kind === "analysis" && hasEquipment(scope, item.equipment)) {
    const narrowed = removeFromScope(scope, {
      kind: "equipment",
      equipment: item.equipment,
    });
    return addToScope(narrowed, item);
  }
  return addToScope(scope, item);
}

/**
 * 화면에서 사라진 대상을 걷어낸다 — 새 대화로 설비가 없어졌는데 칩만 남으면
 * 보이지 않는 것을 근거로 답하게 된다.
 */
export function pruneScope(
  scope: ScopeItem[],
  equipments: string[],
  lineKeys: string[],
): ScopeItem[] {
  const eq = new Set(equipments);
  const ln = new Set(lineKeys);
  const next = scope.filter((i) =>
    i.kind === "equipment" ? eq.has(i.equipment) : ln.has(i.lineKey),
  );
  return next.length === scope.length ? scope : next;
}

/**
 * 회신 본문에 실을 형태로 — 담긴 게 없으면 undefined(필드 자체가 빠져, 스코프를
 * 안 쓰는 요청은 지금까지와 같은 본문으로 나간다).
 *
 * 분석 줄에 스킬을 붙이는 건 여기서 한다. 줄은 파생물이라 스킬을 모르는데,
 * 그 줄을 세운 세션은 **같은 설비 · 같은 category** 로 찾을 수 있다. 채팅이 요청해
 * 생긴 줄은 세션이 없어 스킬 없이 나가고, 그건 그대로 맞다 — 그 줄엔 사람이 정한
 * 조회 키가 없다.
 */
export function toChatScope(
  scope: ScopeItem[],
  sessions: SkillSession[],
): ChatScope | undefined {
  if (scope.length === 0) return undefined;
  const equipments = scope
    .filter((i) => i.kind === "equipment")
    .map((i) => i.equipment);
  const analyses = scope
    .filter((i): i is Extract<ScopeItem, { kind: "analysis" }> =>
      i.kind === "analysis",
    )
    .map((i) => {
      const session = findSession(sessions, i.equipment, i.category);
      return {
        id: i.lineKey,
        equipment: i.equipment,
        focus: i.category,
        ...(session
          ? { skill: session.skill.skill, inputs: session.values }
          : {}),
      };
    });
  return {
    ...(equipments.length > 0 ? { equipments } : {}),
    ...(analyses.length > 0 ? { analyses } : {}),
  };
}

/** 이 줄을 세운 세션 — 같은 설비의, 그 category 를 내는 스텝을 가진 스킬. */
function findSession(
  sessions: SkillSession[],
  equipment: string,
  category: string,
): SkillSession | undefined {
  return sessions.find(
    (s) =>
      s.equipment === equipment &&
      s.skill.steps.some((step) => (step.produces ?? step.title) === category),
  );
}
