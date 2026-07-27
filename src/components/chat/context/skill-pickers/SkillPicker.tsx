"use client";

import { useState } from "react";
import { SkillBrowserModal } from "./SkillBrowserModal";
import { SkillRow } from "./SkillRow";
import { matches, pickRecent, type SkillPickerProps } from "./types";

/** 칩으로 세워 둘 최근 스킬 수 — 한 줄에 들어가고 한 번에 눈에 담기는 만큼. */
const CHIP_COUNT = 3;

/**
 * 스킬 고르기 — 폼 안에서 끝나고, 필요할 때만 넓은 화면을 연다.
 *
 * 세 갈래를 한 화면에 세로로 둔다. 위에서부터 손이 덜 드는 순서다:
 * <ol>
 *   <li><b>최근 칩</b> — 늘 쓰는 스킬이 정해진 사람은 여기서 한 번 눌러 끝낸다.
 *       범주를 타고 들어가거나 검색어를 치는 과정이 없다.</li>
 *   <li><b>검색 + 목록</b> — 이름을 아는 사람은 치고, 훑고 싶은 사람은 30개를
 *       그대로 스크롤한다. 목록은 한 덩어리다: 단위로 갈라 두면 찾는 스킬이 어느
 *       단위인지부터 알아야 하고, 그걸 아는 사람은 애초에 검색을 친다.</li>
 *   <li><b>[⤢]</b> — 이름과 짧은 설명만으로 확신이 안 설 때. 필요한 값·조회
 *       스텝까지 펴 놓은 넓은 화면(`SkillBrowserModal`)으로 넘어간다.</li>
 * </ol>
 *
 * <p>어느 갈래로 골라도 결과는 같다: 스킬 이름 하나가 `onSelect` 로 나간다.
 * 설비 입력은 이 컴포넌트 밖(`AddEquipment`)에 있고 여기와 독립이라, 스킬을
 * 고르는 동안에도 설비를 먼저 칠 수 있다.
 */
export function SkillPicker({
  skills,
  recent,
  selected,
  onSelect,
}: SkillPickerProps) {
  const [query, setQuery] = useState("");
  const [browsing, setBrowsing] = useState(false);

  const hits = skills.filter((s) => matches(s, query));
  const chips = pickRecent(skills, recent).slice(0, CHIP_COUNT);

  return (
    <div className="flex flex-col gap-xxs">
      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-xxs">
          <span className="text-caption text-brand-muted shrink-0">최근</span>
          {chips.map((s) => {
            const on = selected === s.skill;
            return (
              <button
                key={s.skill}
                type="button"
                onClick={() => onSelect(s.skill)}
                aria-pressed={on}
                title={`${s.focus} · ${s.name}`}
                className={[
                  "max-w-full truncate rounded-full border px-xs h-6 text-caption transition-colors focus:outline-none focus:ring-2 focus:ring-brand-primary/15",
                  on
                    ? "border-brand-primary bg-brand-primary text-brand-on-primary"
                    : "border-brand-hairline bg-brand-canvas text-brand-ink hover:border-brand-primary hover:text-brand-primary",
                ].join(" ")}
              >
                {s.focus}
              </button>
            );
          })}
        </div>
      )}

      <div className="flex items-center gap-xxs">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`스킬 검색 (${skills.length}개)`}
          className="flex-1 min-w-0 h-8 rounded-sm border border-brand-hairline bg-brand-canvas px-xs text-caption text-brand-ink placeholder:text-brand-muted-soft focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
        />
        <button
          type="button"
          onClick={() => setBrowsing(true)}
          aria-label="설명까지 보고 고르기"
          title="필요한 값·조회까지 보고 고르기"
          className="shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-sm border border-brand-hairline bg-brand-canvas text-brand-muted hover:border-brand-primary hover:text-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/15 transition-colors"
        >
          <ExpandIcon />
        </button>
      </div>

      {/*
        검색어가 비면 `matches` 가 전부 통과시키므로 목록은 늘 같은 한 덩어리다 —
        "검색 결과"와 "전체"가 다른 화면이 아니라, 치는 만큼 줄어드는 한 목록이다.
      */}
      <div className="max-h-[320px] overflow-y-auto scrollbar-none flex flex-col gap-xxs">
        {hits.length === 0 ? (
          <div className="px-xs py-xs flex flex-col gap-xxs items-start">
            <p className="text-caption text-brand-muted-soft">
              맞는 스킬이 없습니다.
            </p>
            <button
              type="button"
              onClick={() => setBrowsing(true)}
              className="text-caption text-brand-primary hover:underline focus:outline-none focus:ring-2 focus:ring-brand-primary/15 rounded-sm"
            >
              설명까지 보고 고르기 →
            </button>
          </div>
        ) : (
          hits.map((s) => (
            <SkillRow
              key={s.skill}
              skill={s}
              dense
              selected={selected === s.skill}
              onSelect={() => onSelect(s.skill)}
            />
          ))
        )}
      </div>

      {browsing && (
        <SkillBrowserModal
          skills={skills}
          recent={recent}
          selected={selected}
          initialQuery={query}
          onPick={(skill) => {
            onSelect(skill);
            setBrowsing(false);
          }}
          onClose={() => setBrowsing(false)}
        />
      )}
    </div>
  );
}

function ExpandIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <polyline points="15 3 21 3 21 9" />
      <polyline points="9 21 3 21 3 15" />
      <line x1="21" y1="3" x2="14" y2="10" />
      <line x1="3" y1="21" x2="10" y2="14" />
    </svg>
  );
}
