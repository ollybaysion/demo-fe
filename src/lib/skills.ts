/**
 * 스킬 카탈로그 — 사람이 **고르는** 스킬.
 *
 * 채팅에서는 LLM 이 스킬을 고르지만, 오른쪽 패널의 "설비 추가" 진입은 사람이
 * 고른다: 설비명 + 스킬을 정하면 그 스킬이 요구하는 것들이 즉시 자리를 잡는다 —
 * 스칼라 인자는 **입력 카드**로, 조달 수단은 **데이터 슬롯**으로.
 *
 * **spec v3 에서 실행 판단은 전부 BE 로 갔다.** 여기 실리는 `sql` 은 bind 가
 * `:var` 로 남은 미완성 문장이라 화면에 내보내지 않는다 — 사람이 복사해 실행할
 * 문장도, "이 조회를 지금 열 수 있나"도 조달 원장(`/chat/data` 의 `dataRequests`)이
 * 답한다. 카탈로그는 **무엇을 알아내려는 절차인지**를 미리 보여 주는 데 쓴다.
 *
 * 카탈로그의 출처는 `GET /api/fdc/v1/skills`(BE `SkillsController`) — 채팅이 툴로
 * 컴파일해 쓰는 것과 같은 spec 이다. 여기 타입은 그 응답의 거울이다.
 */

export type SkillInput = {
  /** 스킬 인자 이름 — 회신 `inputs[skill][key]` 의 key 그대로. */
  key: string;
  required: boolean;
  description?: string;
};

/** bind 하나의 배선 — 인자에서 오거나, 다른 조회 결과의 컬럼에서 온다. */
export type SkillBind =
  | { from: "arg"; arg: string }
  | { from: "query"; query: string; column: string };

/**
 * 알아야 할 것 하나 — spec v3 의 세 번째 칸. 조회는 이것을 채우는 **수단**이다.
 *
 * `when` 이 있으면 조건부고(그 조건이 맞을 때만 활성), `filledBy` 가 비면 이 스킬로는
 * 못 얻는다는 선언이다. 판정은 BE 소관이라 화면은 이 목록을 **설명으로만** 쓴다.
 */
export type SkillNeed = {
  id: string;
  what: string;
  when?: string;
  filledBy: { query: string; column: string }[];
};

/**
 * 조달 수단 하나 = 분석 카드의 데이터 슬롯 하나.
 *
 * `sql` 은 bind 자리가 `:var` 로 남은 **미완성** 문장이다 — 화면에 그대로 내보내지
 * 않는다. 실행 가능한 SQL 은 BE 조달 원장(`dataRequests[].sql`)이 완성해 준다.
 * 여기 실리는 것은 카드를 미리 세우기 위한 자리표(라벨·의존 여부)다.
 */
export type SkillQuery = {
  /** 조달 id — 조회 키(`스킬#조달id__인자`)의 가운데 토막. 순서가 아니라 이름이다. */
  id: string;
  /** 이 조회가 채우는 need 의 말 — 카드가 조회 이름 대신 **답에 기여하는 것**을 말한다. */
  label: string;
  table?: string;
  sql: string;
  argBinds: Record<string, string>;
  /** 다른 조회 결과가 채우는 bind — 사용자가 채울 수 없다. */
  priorQueryBinds: string[];
  binds?: Record<string, SkillBind>;
};

export type Skill = {
  /** 툴 이름(언더스코어) — `inputs[skill][key]` 네임스페이스. */
  skill: string;
  /** spec 이름(하이픈) — 화면의 보조 표기. */
  name: string;
  description: string;
  /** 이 스킬이 답하는 질문들(말투 변형 포함) — 라우팅 신호이자 사람이 읽는 소개. */
  questions?: string[];
  /** "이 질문에 답한다는 건 …" — 스킬이 무엇을 말해 주는지의 한 문단. */
  rephrasing?: string;
  argumentHint?: string;
  anchorTable?: string;
  inputs: SkillInput[];
  needs: SkillNeed[];
  queries: SkillQuery[];
};

/**
 * 한 번의 "새 분석 추가" — 이 설비를 이 스킬로 본다.
 *
 * <p>`values` 가 세션 안에 있는 이유: 같은 스킬을 두 설비에 걸면 조회 키 값이 서로
 * 달라야 한다(CVD-01 은 30일, CVD-02 는 7일). 스킬로만 네임스페이스된 전역 값 맵
 * (`ChatInputs`)에 넣으면 두 세션이 한 칸을 두고 싸워 마지막 하나만 남고, 먼저 세워
 * 둔 요청 카드의 SQL 까지 나중 값으로 바뀐다. 채팅이 되물어 채우는 값은 지금도
 * 그 전역 맵에 있다 — 그건 스킬 단위가 맞다(대화 하나에 한 벌).
 */
export type SkillSession = {
  id: string;
  equipment: string;
  skill: Skill;
  /** 진입 폼에서 사람이 정한 조회 키 — 이 세션에만 매인다. */
  values: Record<string, string>;
};

/**
 * 설비명으로 곧장 채워지는 인자 이름들. 사용자가 설비를 이미 타이핑했는데
 * 같은 값을 입력 카드로 또 묻는 건 되묻기다 — 그 자리는 등록 순간 채운다.
 */
const EQUIPMENT_INPUT_KEYS = ["equipment", "eqp_id", "eqp"];

/** 이 스킬에서 설비명이 채울 인자 — 없으면 null(설비가 인자가 아닌 스킬). */
export function equipmentInputKey(skill: Skill): string | null {
  const hit = skill.inputs.find((i) =>
    EQUIPMENT_INPUT_KEYS.includes(i.key.toLowerCase()),
  );
  return hit ? hit.key : null;
}

/**
 * 진입 폼이 설비 말고 **더 받아야 하는 인자들** — 이 스킬의 조회 키.
 *
 * 진입의 대상은 언제나 설비다 — 센서·레시피 단위 스킬이라도 사람은 "어느
 * 설비의" 무엇인지부터 말한다. 그래서 설비명이 채우는 인자만 빼고 남은 필수
 * 인자를 진입에서 함께 받는다. 선택 인자는 묻지 않는다: 없어도 스킬이 돈다.
 *
 * <p>이 값들은 **DB 가 붙어도 사람이 정해야 하는 것**이다(어느 센서를, 며칠치를).
 * 왼쪽 데이터 패널의 요청 카드와는 성격이 다르다 — 그쪽은 지금 DB 에 못 붙어서
 * 사람이 SQL 을 대신 실행해 주는 임시 경로이고, 연결되면 사라진다. 그래서 조회
 * 키를 요청 카드 쪽으로 넘기지 않고 여기서 전부 받는다.
 */
export function skillExtraInputs(skill: Skill): SkillInput[] {
  const eq = equipmentInputKey(skill);
  return skill.inputs.filter((i) => i.required && i.key !== eq);
}

/**
 * 목록 한 줄에 붙일 **짧은 설명**.
 *
 * spec v3 부터는 `rephrasing`("이 질문에 답한다는 건 …")이 사람이 읽을 문장이다 —
 * 저자가 사람에게 쓴 것이고, 그 스킬이 무엇을 말해 주는지가 그대로 들어 있다.
 *
 * 없으면 `description` 으로 물러난다. 그쪽은 LLM 이 툴을 고르라고 합성한 문장이라
 * 꼬리가 둘 붙어 있다: 인자 목록 괄호(`… (equipment·param_index 필요)`)와 호출
 * 지시(`… 묻는 상황에서 호출한다`). 둘 다 떼면 남는 것이 그 스킬이 보는 대상이다.
 * 형식이 다르면 아무것도 못 떼고 원문이 그대로 나온다(설명이 사라지느니 길게라도
 * 보이는 편이 낫다).
 */
export function skillSummary(skill: Skill): string {
  if (skill.rephrasing?.trim()) return skill.rephrasing.trim();
  return skill.description
    .replace(/\s*\([^)]*\)\s*\.?\s*$/, "")
    .replace(/\s*[를을]?\s*묻는 상황에서 호출한다\.?\s*$/, "")
    .trim();
}

/**
 * 이 조회가 아직 못 채운 인자들 — 카드에 "무엇이 더 필요한지" 적기 위한 것.
 * 실행 문장 자체는 BE 가 만든다(FE 는 SQL 을 짓지 않는다).
 */
export function missingArgs(
  query: SkillQuery,
  args: Record<string, string>,
): string[] {
  return Object.values(query.argBinds).filter(
    (argName) => !args[argName]?.trim(),
  );
}

/** 카탈로그 조회 — 실패는 빈 목록으로 흘린다(스킬을 못 받아도 화면은 산다). */
export async function fetchSkills(): Promise<Skill[]> {
  const res = await fetch("/api/fdc/v1/skills");
  if (!res.ok) throw new Error(`skills ${res.status}`);
  const body = (await res.json()) as { skills?: Skill[] };
  return body.skills ?? [];
}
