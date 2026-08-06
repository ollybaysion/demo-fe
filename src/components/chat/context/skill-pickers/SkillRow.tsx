"use client";

import { skillSummary, type Skill } from "@/lib/skills";

/**
 * 목록 한 줄 — 패널 목록과 넓은 화면이 함께 쓴다.
 *
 * 한 줄에 담는 것: **스킬 이름**, 무엇을 보는지(focus), 그리고 짧은 설명.
 *
 * 이름이 먼저인 이유는 그것이 이 스킬을 부르는 유일한 말이기 때문이다 — 채팅에서
 * 툴로 불리는 것도, 문서·동료와 주고받는 것도 `fdc-trace-reading` 이지 "센서
 * 측정값" 이 아니다. focus 만 세워 두면 목록에서 고른 것과 실제로 붙은 것이 같은
 * 이름으로 이어지지 않아, 고르고 나서도 무엇을 골랐는지 확인할 길이 없다.
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
      <span className="flex items-baseline gap-xs">
        <span className="min-w-0 truncate font-mono text-caption text-brand-ink">
          {skill.name}
        </span>
        {/* 앵커 테이블은 이름 옆에 낮은 무게로 — 무엇을 딛고 선 스킬인지 가리키는
            꼬리표지 이름 자리를 대신하는 값이 아니다(v2 의 focus 자리). */}
        <span className="min-w-0 shrink truncate font-mono text-caption text-brand-muted">
          {skill.anchorTable ?? ""}
        </span>
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
