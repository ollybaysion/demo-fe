import type { Skill } from "@/lib/skills";

/**
 * 스킬 고르기의 계약 — 폼 안 `SkillPicker` 와 넓은 `SkillBrowserModal` 이 함께 쓴다.
 *
 * 어느 쪽에서 고르든 결과는 하나다: 선택된 스킬 이름. 설비 입력과 [시작]은 이
 * 계약 밖(`AddEquipment`)에 있어, 고르기는 고르기만 책임진다.
 */
export type SkillPickerProps = {
  skills: Skill[];
  /** 최근 쓴 스킬 이름(최근 순) — 목록 맨 위에 세운다. */
  recent: string[];
  /** 선택된 스킬 이름(`skill.skill`), 없으면 빈 문자열. */
  selected: string;
  /**
   * 펼쳤는가. 접혀 있으면 **검색창 한 줄만** 선다 — 최근 칩·목록·[⤢]는 펼친
   * 뒤에 온다. 검색창은 접힌 채로도 남는 유일한 자리라, 여기가 무엇을 고르는
   * 곳인지 늘 말해 준다.
   */
  expanded: boolean;
  /** 접힌 검색창에 손이 닿았다 — 펼쳐 달라(포커스·타이핑). */
  onExpand: () => void;
  onSelect: (skill: string) => void;
};

/** 분류축이 없는 스킬이 모이는 자리 — 없는 값을 지어내지 않는다. */
export const NO_ANCHOR_GROUP = "기타";

/**
 * 앵커 테이블별로 묶는다 — spec v3 가 남긴 유일한 분류축이다.
 *
 * v2 의 `unit`(센서·설비·레시피…)은 사람이 손으로 적던 두 번째 분류법이라
 * 제거됐다. 그 자리를 `anchorTable` 이 받는 게 v3 의 결정이다: 무엇을 보는
 * 스킬인지는 그 스킬이 딛고 선 테이블이 이미 말한다.
 */
export function groupByAnchor(skills: Skill[]): Array<[string, Skill[]]> {
  const byAnchor = new Map<string, Skill[]>();
  for (const s of skills) {
    const key = s.anchorTable?.trim() || NO_ANCHOR_GROUP;
    const list = byAnchor.get(key);
    if (list) list.push(s);
    else byAnchor.set(key, [s]);
  }
  return [...byAnchor.entries()];
}

/**
 * 검색 — 이름·설명·**답하는 질문**·앵커 테이블·인자 이름·알아내는 것까지 본다.
 * 30개에서는 사용자가 기억하는 단서가 제각각이라(테이블명만 아는 경우도, 물어보고
 * 싶은 문장만 아는 경우도 있다) 좁게 잡으면 안 걸린다.
 */
export function matches(skill: Skill, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const hay = [
    skill.name,
    skill.description,
    skill.rephrasing ?? "",
    ...(skill.questions ?? []),
    skill.anchorTable ?? "",
    ...skill.inputs.map((i) => i.key),
    ...skill.needs.map((n) => n.what),
  ]
    .join(" ")
    .toLowerCase();
  return hay.includes(q);
}

/** 최근 순으로 앞에 세운 목록 — 최근에 없는 것은 원래 순서를 지킨다. */
export function pickRecent(skills: Skill[], recent: string[]): Skill[] {
  return recent
    .map((name) => skills.find((s) => s.skill === name))
    .filter((s): s is Skill => s !== undefined);
}
