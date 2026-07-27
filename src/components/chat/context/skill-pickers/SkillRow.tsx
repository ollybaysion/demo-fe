"use client";

import { skillSummary, type Skill } from "@/lib/skills";

/**
 * 목록 한 줄 — 패널 목록과 넓은 화면이 함께 쓴다.
 *
 * 한 줄에 담는 것: focus(무엇을 보는지)와 **짧은 설명**. 고르는 사람이 30개에서
 * 답해야 하는 질문은 "이게 내가 찾는 그건가" 하나뿐이라, 그 판단에 쓰이는 문장만
 * 둔다. 스킬 식별자와 인자·조회의 세부는 넓은 화면(`SkillBrowserModal`)의 몫이다.
 */
export function SkillRow({
  skill,
  selected,
  onSelect,
  dense = false,
}: {
  skill: Skill;
  selected: boolean;
  onSelect: () => void;
  /** 좁은 패널용 — 설명을 두 줄로 자른다. */
  dense?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      title={skill.description}
      className={[
        "w-full text-left rounded-sm border px-xs py-[6px] transition-colors focus:outline-none focus:ring-2 focus:ring-brand-primary/15",
        selected
          ? "border-brand-primary bg-brand-canvas"
          : "border-transparent hover:border-brand-hairline hover:bg-brand-ink-translucent-04",
      ].join(" ")}
    >
      <span className="block text-caption text-brand-ink truncate">
        {skill.focus}
      </span>
      <span
        className={[
          "block text-caption text-brand-muted-soft leading-relaxed",
          dense ? "line-clamp-2" : "",
        ].join(" ")}
      >
        {skillSummary(skill)}
      </span>
    </button>
  );
}
