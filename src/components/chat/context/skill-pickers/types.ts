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
  onSelect: (skill: string) => void;
};

/** 단위별로 묶는다 — 카탈로그가 주는 유일한 분류축(`unit`). */
export function groupByUnit(skills: Skill[]): Array<[string, Skill[]]> {
  const byUnit = new Map<string, Skill[]>();
  for (const s of skills) {
    const list = byUnit.get(s.unit);
    if (list) list.push(s);
    else byUnit.set(s.unit, [s]);
  }
  return [...byUnit.entries()];
}

/**
 * 검색 — 이름·focus·설명·앵커 테이블·인자 이름까지 본다. 30개에서는 사용자가
 * 기억하는 단서가 제각각이라(테이블명만 아는 경우도 있다) 좁게 잡으면 안 걸린다.
 */
export function matches(skill: Skill, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const hay = [
    skill.name,
    skill.focus,
    skill.unit,
    skill.description,
    skill.anchorTable ?? "",
    ...skill.inputs.map((i) => i.key),
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
