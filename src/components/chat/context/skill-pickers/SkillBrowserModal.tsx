"use client";

import { useEffect, useState } from "react";
import { equipmentInputKey, type Skill } from "@/lib/skills";
import { SkillRow } from "./SkillRow";
import { groupByUnit, matches, pickRecent } from "./types";

/**
 * 스킬을 **넓게 펴 놓고 고르는 화면**.
 *
 * 폼 안(`SkillPicker`)에서는 이름과 짧은 설명까지만 보인다 — 그것으로 확신이
 * 서는 사람에게는 그게 가장 빠르기 때문이다. 확신이 안 설 때 여기를 연다: 폭이
 * 있으니 왼쪽에 목록, 오른쪽에 그 스킬의 설명·필요한 값·조회 스텝을 함께 둔다.
 * 30개 중에서 변별이 일어나는 자리다.
 *
 * <p>고르는 일만 여기서 한다 — 설비 입력과 [시작]은 폼에 남는다. 넓은 화면이
 * 필요한 건 "무엇을 고를까"뿐이고, 그 다음 손은 원래 자리에서 이어져야 한다.
 */
export function SkillBrowserModal({
  skills,
  recent,
  selected,
  initialQuery = "",
  onPick,
  onClose,
}: {
  skills: Skill[];
  recent: string[];
  /** 열 때 미리 짚어 둘 스킬 — 폼에서 이미 고른 것이 있으면 그것. */
  selected: string;
  /** 폼 검색어를 이어받는다 — 같은 검색을 두 번 치게 하지 않는다. */
  initialQuery?: string;
  onPick: (skill: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState(initialQuery);
  // 여기서 짚는 것은 아직 선택이 아니다 — [이 스킬로]를 눌러야 폼으로 넘어간다.
  const [preview, setPreview] = useState(selected);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const shown = skills.find((s) => s.skill === preview) ?? null;
  const searching = query.trim().length > 0;
  const hits = skills.filter((s) => matches(s, query));
  const recentTop = pickRecent(skills, recent).slice(0, 3);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="스킬 고르기"
      className="fixed inset-0 z-50 flex items-center justify-center p-md"
    >
      <div
        className="absolute inset-0 bg-brand-ink/40"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative w-full max-w-[48rem] h-[32rem] bg-brand-canvas rounded-lg shadow-xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-md py-sm border-b border-brand-hairline">
          <h2 className="font-sans text-body-md text-brand-ink">스킬 고르기</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="inline-flex items-center justify-center w-8 h-8 rounded-sm text-brand-muted hover:bg-brand-ink-translucent-04 hover:text-brand-ink focus:outline-none focus:ring-2 focus:ring-brand-primary/15 transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 min-h-0 flex">
          {/* 왼쪽 — 찾기. 검색이 비면 최근 + 단위별 전체. */}
          <div className="w-[20rem] shrink-0 border-r border-brand-hairline flex flex-col">
            <div className="p-sm">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="이름·대상·테이블로 검색"
                autoFocus
                className="w-full h-8 rounded-sm border border-brand-hairline bg-brand-canvas px-xs text-caption text-brand-ink placeholder:text-brand-muted-soft focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
              />
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-none px-sm pb-sm flex flex-col gap-xxs">
              {searching ? (
                hits.length === 0 ? (
                  <p className="text-caption text-brand-muted-soft px-xs py-xs">
                    맞는 스킬이 없습니다.
                  </p>
                ) : (
                  hits.map((s) => (
                    <SkillRow
                      key={s.skill}
                      skill={s}
                      dense
                      selected={preview === s.skill}
                      onSelect={() => setPreview(s.skill)}
                    />
                  ))
                )
              ) : (
                <>
                  {recentTop.length > 0 && (
                    <>
                      <p className="text-caption text-brand-muted px-xs pt-xxs">
                        최근 사용
                      </p>
                      {recentTop.map((s) => (
                        <SkillRow
                          key={s.skill}
                          skill={s}
                          dense
                          selected={preview === s.skill}
                          onSelect={() => setPreview(s.skill)}
                        />
                      ))}
                      <div className="border-t border-brand-hairline my-xxs" />
                    </>
                  )}
                  {groupByUnit(skills).map(([unit, list]) => (
                    <div key={unit} className="flex flex-col gap-xxs">
                      <p className="text-caption text-brand-muted px-xs pt-xxs">
                        {unit}{" "}
                        <span className="text-brand-muted-soft tabular-nums">
                          ({list.length})
                        </span>
                      </p>
                      {list.map((s) => (
                        <SkillRow
                          key={s.skill}
                          skill={s}
                          dense
                          selected={preview === s.skill}
                          onSelect={() => setPreview(s.skill)}
                        />
                      ))}
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>

          {/* 오른쪽 — 고른 것이 무엇인지. */}
          <div className="flex-1 min-w-0 flex flex-col">
            {shown ? (
              <SkillDetail skill={shown} />
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-caption text-brand-muted-soft">
                  왼쪽에서 스킬을 고르세요.
                </p>
              </div>
            )}
            <div className="shrink-0 px-md py-sm border-t border-brand-hairline flex justify-end gap-sm">
              <button
                type="button"
                onClick={onClose}
                className="px-md h-9 rounded-md text-button text-brand-ink bg-brand-canvas border border-brand-hairline hover:bg-brand-ink-translucent-04 focus:outline-none focus:ring-2 focus:ring-brand-primary/15 transition-colors"
              >
                취소
              </button>
              <button
                type="button"
                disabled={!shown}
                onClick={() => {
                  if (!shown) return;
                  onPick(shown.skill);
                }}
                className={[
                  "px-md h-9 rounded-md text-button transition-colors focus:outline-none focus:ring-2 focus:ring-brand-primary/20",
                  shown
                    ? "bg-brand-primary text-brand-on-primary hover:bg-brand-primary-active"
                    : "bg-brand-primary-disabled text-brand-muted-soft cursor-not-allowed",
                ].join(" ")}
              >
                이 스킬로
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SkillDetail({ skill }: { skill: Skill }) {
  // 설비명은 진입 폼이 이미 받는다 — 여기서는 "설비로 채워짐"이라고만 알린다.
  const eqKey = equipmentInputKey(skill);
  return (
    <div className="flex-1 min-h-0 overflow-y-auto scrollbar-none p-md flex flex-col gap-sm">
      <div>
        {/* 제목은 이름 — 목록·칩·고른 뒤 한 줄과 같은 말로 세운다. */}
        <h3 className="font-mono text-body-md text-brand-ink">{skill.name}</h3>
        <p className="text-caption text-brand-muted-soft">
          {skill.focus} · {skill.unit}
          {skill.anchorTable ? ` · ${skill.anchorTable}` : ""}
        </p>
      </div>
      <p className="text-body-sm text-brand-body leading-relaxed">
        {skill.description}
      </p>

      <div>
        <p className="text-caption text-brand-muted mb-xxs">필요한 값</p>
        <ul className="flex flex-col gap-xxs">
          {skill.inputs.map((i) => (
            <li key={i.key} className="text-caption text-brand-ink">
              <span className="tabular-nums">{i.key.toUpperCase()}</span>
              {i.key === eqKey && (
                <span className="text-brand-muted-soft"> — 설비로 채움</span>
              )}
              {i.key !== eqKey && i.description && (
                <span className="text-brand-muted-soft"> — {i.description}</span>
              )}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <p className="text-caption text-brand-muted mb-xxs">조회</p>
        <ul className="flex flex-col gap-xxs">
          {skill.steps.map((s) => (
            <li key={s.title} className="text-caption text-brand-ink">
              {s.title}
              {s.produces && (
                <span className="text-brand-muted-soft"> — {s.produces}</span>
              )}
              {s.priorStepBinds.length > 0 && (
                <span className="text-brand-muted-soft">
                  {" "}
                  (앞 조회 결과 필요 — 카드로 서지 않음)
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
