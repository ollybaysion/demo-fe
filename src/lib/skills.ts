/**
 * 스킬 카탈로그 — 사람이 **고르는** 스킬.
 *
 * 채팅에서는 LLM 이 스킬을 고르지만, 오른쪽 패널의 "설비 추가" 진입은 사람이
 * 고른다: 설비명 + 스킬을 정하면 그 스킬이 요구하는 것들이 즉시 카드로 선다 —
 * 스칼라 인자는 **입력 카드**로, 조회 스텝은 **데이터 요청 카드**로. 즉 백엔드가
 * 되물어 만들던 카드(`inputRequests`/`dataRequests`)를 사람이 먼저 세우는 것이고,
 * 채워진 값은 똑같이 `inputs[skill][key]` 로 실려 나가 백엔드가 이어받는다.
 *
 * 카탈로그의 출처는 `GET /api/fdc/v1/skills`(BE `SkillsController`) — 채팅이 툴로
 * 컴파일해 쓰는 것과 같은 spec 이다. 여기 타입은 그 응답의 거울이다.
 */

import type { DataRequest } from "./types";

export type SkillInput = {
  /** 스킬 인자 이름 — 회신 `inputs[skill][key]` 의 key 그대로. */
  key: string;
  required: boolean;
  description?: string;
};

export type SkillStep = {
  title: string;
  /** 이 스텝이 답에 기여하는 차원 한 마디. 데이터 카드의 category 로 쓴다. */
  produces?: string;
  /** bind 자리가 `:var` 로 남은 미완성 SQL. */
  sql: string;
  /** bind 이름 → 스킬 인자 이름. 사용자가 채울 수 있는 자리. */
  argBinds: Record<string, string>;
  /** 앞 스텝 결과가 채우는 bind — 사용자가 채울 수 없다. */
  priorStepBinds: string[];
};

export type Skill = {
  /** 툴 이름(언더스코어) — `inputs[skill][key]` 네임스페이스. */
  skill: string;
  /** spec 이름(하이픈) — 화면의 보조 표기. */
  name: string;
  unit: string;
  focus: string;
  description: string;
  argumentHint?: string;
  anchorTable?: string;
  inputs: SkillInput[];
  steps: SkillStep[];
};

/** 한 번의 "설비 추가" — 이 설비를 이 스킬로 본다. */
export type SkillSession = {
  id: string;
  equipment: string;
  skill: Skill;
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
 * 카탈로그의 `description` 은 LLM 이 툴을 고르라고 쓴 문장이라 사람이 훑기엔
 * 꼬리가 둘 붙어 있다: 인자 목록 괄호(`… (equipment·param_index 필요)`)와
 * 호출 지시(`… 묻는 상황에서 호출한다`). 둘 다 떼면 남는 것이 곧 그 스킬이
 * 보는 대상이다 — "특정 센서의 알람 발생 이력".
 *
 * 두 꼬리는 카탈로그 문장 형식에 기댄 것이라, 형식이 다르면 아무것도 못 떼고
 * 원문이 그대로 나온다(설명이 사라지느니 길게라도 보이는 편이 낫다).
 */
export function skillSummary(skill: Skill): string {
  return skill.description
    .replace(/\s*\([^)]*\)\s*\.?\s*$/, "")
    .replace(/\s*[를을]?\s*묻는 상황에서 호출한다\.?\s*$/, "")
    .trim();
}

/**
 * SQL 의 `:bind` 자리를 아는 값으로 메운다. 모르는 자리는 **그대로 둔다** —
 * 빈칸으로 지우면 사용자가 뭘 채워야 하는지 알 수 없는 SQL 이 된다.
 *
 * 값은 숫자면 그대로, 아니면 작은따옴표로 감싼다(내부 `'` 는 두 번 써서 이스케이프).
 * 사용자가 복사해 그대로 실행할 수 있어야 하므로 bind 변수로 남기지 않는다.
 */
export function renderStepSql(
  step: SkillStep,
  args: Record<string, string>,
): string {
  let sql = step.sql;
  for (const [bind, argName] of Object.entries(step.argBinds)) {
    const raw = args[argName]?.trim();
    if (!raw) continue;
    sql = sql.replaceAll(`:${bind}`, sqlLiteral(raw));
  }
  return sql;
}

function sqlLiteral(value: string): string {
  return /^-?\d+(\.\d+)?$/.test(value)
    ? value
    : `'${value.replaceAll("'", "''")}'`;
}

/** 이 스텝이 아직 못 채운 인자들 — 카드에 "무엇이 더 필요한지" 적기 위한 것. */
export function missingArgs(
  step: SkillStep,
  args: Record<string, string>,
): string[] {
  return Object.values(step.argBinds).filter((argName) => !args[argName]?.trim());
}

/**
 * 등록된 세션이 세울 **데이터 요청 카드** — 스텝 하나가 카드 하나.
 *
 * 라벨은 파생이 읽는 `설비 · category` 규칙을 지킨다(`derive-cards`) — 그래야
 * 이 카드가 그 설비 카드 밑으로 들어가고, 결과를 붙여넣으면 같은 그룹에서
 * pending → filled 로 바뀐다.
 *
 * 앞 스텝 결과에 묶인 bind(`priorStepBinds`)가 있는 스텝은 사용자가 채울 수
 * 없으므로 카드로 세우지 않는다 — 조달할 수 없는 요구를 세우면 영영 안 지워진다.
 */
export function skillDataRequests(
  session: SkillSession,
  values: Record<string, Record<string, string>>,
): DataRequest[] {
  const args: Record<string, string> = {
    ...(values[session.skill.skill] ?? {}),
  };
  const eq = equipmentInputKey(session.skill);
  if (eq) args[eq] = session.equipment;

  return session.skill.steps
    .map((step, i) => ({ step, i }))
    .filter(({ step }) => step.priorStepBinds.length === 0)
    .map(({ step, i }) => ({
      queryKey: skillQueryKey(session, i),
      label: `${session.equipment} · ${step.produces ?? step.title}`,
      sql: renderStepSql(step, args),
    }));
}

/** 세션·스텝 하나의 조달 키 — 설비까지 넣어 같은 스킬의 다른 설비와 안 겹친다. */
export function skillQueryKey(session: SkillSession, stepIndex: number): string {
  return `${session.skill.skill}__${slug(session.equipment)}__s${stepIndex}`;
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

/** 카탈로그 조회 — 실패는 빈 목록으로 흘린다(스킬을 못 받아도 화면은 산다). */
export async function fetchSkills(): Promise<Skill[]> {
  const res = await fetch("/api/fdc/v1/skills");
  if (!res.ok) throw new Error(`skills ${res.status}`);
  const body = (await res.json()) as { skills?: Skill[] };
  return body.skills ?? [];
}
