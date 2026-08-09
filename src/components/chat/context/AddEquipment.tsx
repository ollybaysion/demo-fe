"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { inputKind } from "@/lib/date-input";
import { readRecentSkills, recordSkillUse } from "@/lib/skill-usage";
import { DateTimeField } from "../DateTimeField";
import {
  fetchSkills,
  skillExtraInputs,
  type Skill,
  type SkillInput,
} from "@/lib/skills";
import { SkillPicker } from "./skill-pickers/SkillPicker";

/**
 * 오른쪽 패널의 **진입점** — 새 분석 추가.
 *
 * 설비 카드는 요청/스냅샷에서 파생되는 게 원칙이지만(`derive-cards`), 첫 화면에는
 * 파생할 것이 없다. 그래서 사람이 첫 수를 둔다.
 *
 * <p>폼은 **한 장이다**. 위에서부터 설비 · 스킬 · 그 스킬이 더 요구하는 값이 한
 * 화면에 있고, 아래 칸은 위 칸이 정해질수록 자라난다:
 *
 * <ul>
 *   <li><b>설비</b> — 이 분석의 대상. 이것만 넣고 [시작]해도 된다(스킬 없이 채팅부터
 *       시작할 수 있어야 하므로).</li>
 *   <li><b>스킬</b> — 아직 안 골랐다면 접힌 채로도 **검색창이 서 있다**. 무엇을
 *       더 할 수 있는지가 화면에서 사라지면, 할 수 있다는 것도 같이 사라진다.
 *       검색창에 손이 닿거나 슬라이드 버튼을 누르면 그 아래로 최근 칩 · 목록
 *       (그리고 [⤢] 로 넓은 화면)이 올라온다.</li>
 *   <li><b>남은 값</b> — 스킬을 고르면 그 스킬이 요구하는 인자가 이어서 열린다.
 *       **여기서 다 채워야 시작된다**: 반쯤 채운 분석은 만들지 않는다.</li>
 * </ul>
 *
 * <p>순서는 강제하지 않는다 — 설비를 안 넣고 스킬부터 골라도 되고, 그 반대도 된다.
 * [시작]만 설비가 있어야 열린다.
 *
 * <p>스킬 목록은 `GET /api/fdc/v1/skills` — 채팅이 툴로 쓰는 것과 같은 spec 이다.
 * 목록을 못 받으면 스킬 칸만 닫히고 설비 등록은 그대로 된다.
 */
type Props = {
  /**
   * 등록 — 설비명은 trim 된 값. `skill` 이 null 이면 **설비만** 등록한다(스킬은
   * 나중에 붙을 수 있다). `values` 는 인자 칸에서 받은 값(빈 값은 빠진다).
   */
  onAdd: (
    equipment: string,
    /** 고른 라인. 안 골랐으면 null — 라인은 필수가 아니다. */
    line: string | null,
    skill: Skill | null,
    values: Record<string, string>,
  ) => void;
  /** 이미 선 설비들 — 칩으로 세워 같은 설비를 다시 타이핑하지 않게 한다. */
  existing?: string[];
  /**
   * 바깥에서 연 진입 — 설비 카드의 [+]가 그 설비를 채운 채 스킬 칸을 열고 연다.
   * `nonce` 가 바뀔 때마다 다시 연다(같은 설비를 연달아 눌러도 반응하도록).
   */
  openFor?: { equipment: string; nonce: number } | null;
};

export function AddEquipment({ onAdd, existing = [], openFor = null }: Props) {
  const [open, setOpen] = useState(false);
  const [equipment, setEquipment] = useState("");
  /** 고를 수 있는 라인 — AKG 가 가진 목록. 못 받으면 null 로 남고 칸은 안 그린다. */
  const [lines, setLines] = useState<string[] | null>(null);
  const [line, setLine] = useState("");
  /** 스킬 목록을 펼쳤는가 — 자리는 늘 보이고, 목록만 접힌다. */
  const [pickerOpen, setPickerOpen] = useState(false);
  const [skills, setSkills] = useState<Skill[] | null>(null);
  const [selected, setSelected] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [recent, setRecent] = useState<string[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  /** [시작]을 눌렀을 때만 나오는 검사 결과 — 채우면 곧바로 걷힌다. */
  const [submitError, setSubmitError] = useState<string | null>(null);
  const equipmentRef = useRef<HTMLInputElement | null>(null);

  // 목록은 **폼을 열 때** 받는다. 접혀 있어도 검색창은 서 있고, 그 자리는 몇 개
  // 중에서 고르는지(`스킬 검색 (30개)`)까지 말한다 — 목록이 없으면 쓸 수 없는
  // 칸이다. 못 받으면 검색창째로 안 그리고 설비 등록만 남는다.
  useEffect(() => {
    if (!open || skills !== null) return;
    let alive = true;
    fetchSkills()
      .then((list) => {
        if (alive) setSkills(list);
      })
      .catch(() => {
        if (alive) setError("스킬 목록을 불러오지 못했습니다.");
      });
    return () => {
      alive = false;
    };
  }, [open, skills]);

  /**
   * 펼치기 — 줄을 누르거나 검색창에 손이 닿으면.
   *
   * <p>하나뿐이면 고를 것이 없으니 이때 미리 골라 준다. 펼치기 전에 붙이지는
   * 않는다: 스킬 없이 설비만 넣고 시작하는 길이 그 스킬의 인자 요구로 막힌다.
   * 목록이 오는 중에 펼쳤다면 미리 고르지 않는다 — 한 줄짜리 목록에서 한 번
   * 누르면 되는 일이다.
   */
  const openPicker = useCallback(() => {
    setPickerOpen(true);
    if (skills?.length === 1) setSelected((prev) => prev || skills[0].skill);
  }, [skills]);

  useEffect(() => {
    if (open) equipmentRef.current?.focus();
  }, [open]);

  // 라인 목록은 폼을 열 때 한 번 — 고를 값이라 폼이 서기 전에 있어야 한다.
  // 못 받으면 라인 칸을 아예 안 그린다: 빈 드롭다운은 고를 수 없는 칸이라
  // 등록 자체를 막는 것처럼 읽힌다(라인은 필수가 아니다).
  useEffect(() => {
    if (!open || lines !== null) return;
    let alive = true;
    fetch("/api/fdc/v1/lines")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((body: { lines?: unknown }) => {
        if (!alive) return;
        const list = Array.isArray(body.lines)
          ? body.lines.filter((v): v is string => typeof v === "string")
          : [];
        setLines(list);
      })
      .catch(() => {
        if (alive) setLines([]);
      });
    return () => {
      alive = false;
    };
  }, [open, lines]);

  // 설비 카드에서 연 진입 — 설비는 이미 정해졌으니 스킬 칸을 펼친 채로 연다.
  // props 변화에 맞춘 상태 조정이라 effect 가 아니라 **렌더 중**에 한다: effect 로
  // 미루면 한 프레임 동안 닫힌 폼이 그려졌다가 열린다.
  const [seenNonce, setSeenNonce] = useState(0);
  if (openFor && openFor.nonce > seenNonce) {
    setSeenNonce(openFor.nonce);
    setRecent(readRecentSkills());
    setEquipment(openFor.equipment);
    setSelected("");
    setValues({});
    setPickerOpen(true);
    setOpen(true);
  }

  const close = useCallback(() => {
    setOpen(false);
    setEquipment("");
    setLine("");
    setPickerOpen(false);
    setSelected("");
    setError(null);
    setValues({});
    setSubmitError(null);
  }, []);

  const selectedSkill = (skills ?? []).find((s) => s.skill === selected) ?? null;
  const asking = selectedSkill ? skillExtraInputs(selectedSkill) : [];
  const name = equipment.trim();
  /**
   * 스킬을 붙였다면 그 스킬이 요구하는 값은 **여기서 다 채워야** 한다. 반쯤 채운
   * 분석은 만들지 않는다 — 카드로 세워 두고 나중에 되묻는 길을 두면, 조회도
   * 못 하는 카드가 화면에 남는다.
   */
  const missing = asking.filter((i) => !values[i.key]?.trim());

  /**
   * [시작] — 버튼은 늘 눌린다. 무엇이 모자란지는 **누른 뒤에** 말한다: 비활성
   * 버튼은 왜 못 누르는지 말해 주지 않고, 채우기 전부터 잔소리를 띄우면 아직
   * 하지도 않은 실수를 지적하는 꼴이 된다.
   */
  function submit() {
    if (!name) {
      setSubmitError("설비를 입력하세요.");
      equipmentRef.current?.focus();
      return;
    }
    if (missing.length > 0) {
      // 고르기 목록이 열려 있으면 인자 칸은 접혀 있다 — 어느 칸을 채우라는
      // 말인지 보이게 목록을 닫고 나서 말한다.
      setPickerOpen(false);
      setSubmitError(
        `${missing.map((i) => i.key.toUpperCase()).join(" · ")} 값을 입력하세요.`,
      );
      return;
    }
    const kept = Object.fromEntries(
      Object.entries(values)
        .map(([k, v]) => [k, v.trim()] as const)
        .filter(([, v]) => v.length > 0),
    );
    onAdd(name, line.trim() || null, selectedSkill, selectedSkill ? kept : {});
    // 방금 쓴 것이 다음 번 목록 맨 위에 온다.
    if (selectedSkill) setRecent(recordSkillUse(selectedSkill.skill));
    close();
  }

  if (!open) {
    /*
      접혀 있을 땐 동그란 [+] 하나. 가리키면 옆으로 늘어나며 글자가 나온다 —
      아이콘은 제자리에 있고 버튼이 오른쪽으로 자라므로, 가운데 정렬된 자리에서는
      아이콘이 왼쪽으로 미끄러지는 것처럼 보인다. 이름은 필요할 때만 자리를 쓴다.
    */
    return (
      <button
        type="button"
        onClick={() => {
          // 최근 사용은 localStorage 라 클라이언트에서만 읽는다(SSR 불일치 방지).
          setRecent(readRecentSkills());
          setOpen(true);
        }}
        aria-label="새 분석 추가"
        className="group inline-flex items-center h-[4.8rem] w-[4.8rem] hover:w-[14rem] px-[1.55rem] hover:px-lg gap-sm overflow-hidden rounded-full bg-brand-primary text-brand-on-primary shadow-md hover:bg-brand-primary-active focus:outline-none focus:ring-2 focus:ring-brand-primary/40 transition-[width,padding,background-color] duration-200 ease-out"
      >
        <span className="shrink-0">
          <PlusIcon />
        </span>
        <span className="whitespace-nowrap text-body-md opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          새 분석 추가
        </span>
      </button>
    );
  }

  return (
    <div className="w-full rounded-md border border-brand-primary/40 bg-brand-surface-soft p-sm flex flex-col gap-xs">
      <div className="flex items-center justify-between">
        <span className="text-caption font-medium text-brand-ink">
          새 분석 추가
        </span>
        <button
          type="button"
          onClick={close}
          aria-label="닫기"
          className="text-caption text-brand-muted-soft hover:text-brand-ink focus:outline-none focus:ring-2 focus:ring-brand-primary/15 rounded-sm px-xxs"
        >
          닫기
        </button>
      </div>

      {/*
        이미 선 설비 — 누르면 그 설비로 채운다. 같은 이름을 다시 치게 두면 오타
        하나로 카드가 둘이 된다. (설비 카드의 [+]와 같은 곳으로 가는 두 번째 문.)
      */}
      {existing.length > 0 && (
        <div className="flex flex-wrap items-center gap-xxs">
          <span className="text-caption text-brand-muted shrink-0">등록됨</span>
          {existing.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setEquipment(item)}
              aria-pressed={name === item}
              className={[
                "max-w-full truncate rounded-full border px-xs h-6 text-caption transition-colors focus:outline-none focus:ring-2 focus:ring-brand-primary/15",
                name === item
                  ? "border-brand-primary bg-brand-primary text-brand-on-primary"
                  : "border-brand-hairline bg-brand-canvas text-brand-ink hover:border-brand-primary hover:text-brand-primary",
              ].join(" ")}
            >
              {item}
            </button>
          ))}
        </div>
      )}

      <label className="flex flex-col gap-xxs">
        <span className="text-caption text-brand-muted">설비</span>
        <input
          ref={equipmentRef}
          value={equipment}
          onChange={(e) => {
            setEquipment(e.target.value);
            setSubmitError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
            if (e.key === "Escape") close();
          }}
          placeholder="예: CVD-01"
          className="h-8 rounded-sm border border-brand-hairline bg-brand-canvas px-xs text-caption text-brand-ink placeholder:text-brand-muted-soft focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
        />
      </label>

      {/*
        라인 — 타이핑이 아니라 **고르는 값**이다. 정해진 목록이 있는 것을 자유
        입력으로 두면 같은 라인이 표기만 다른 여러 값으로 갈라진다. 목록이 비면
        (못 받았거나 없으면) 칸을 아예 안 그린다.
      */}
      {lines !== null && lines.length > 0 && (
        <label className="flex flex-col gap-xxs">
          <span className="text-caption text-brand-muted">라인</span>
          <select
            value={line}
            onChange={(e) => setLine(e.target.value)}
            className="h-8 rounded-sm border border-brand-hairline bg-brand-canvas px-xs text-caption text-brand-ink focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
          >
            <option value="">선택 안 함</option>
            {lines.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </label>
      )}

      {/*
        스킬 칸 — 설비 칸과 **같은 무게**로 둔다: 라벨은 밖에, 필드는 같은 높이·
        같은 테두리. 둘은 이 폼의 두 축이고 어느 쪽이 더 중요하지 않다(설비만으로도,
        스킬을 붙여서도 시작할 수 있다). 그래서 아직 안 고른 동안에는 접혀 있어도
        **검색창이 서 있다** — 설비 입력칸 아래 빈 라벨 한 줄만 있으면 여기는
        "설비만 넣는 화면"으로 읽히고, 무엇을 더 할 수 있는지가 화면에서 사라진다.
        검색창에 손이 닿거나 이 줄을 누르면 최근 칩·목록이 위로 올라온다.
      */}
      <div className="flex flex-col gap-xxs">
        <button
          type="button"
          onClick={() => (pickerOpen ? setPickerOpen(false) : openPicker())}
          aria-expanded={pickerOpen}
          aria-label={pickerOpen ? "스킬 고르기 접기" : "스킬 고르기 펼치기"}
          className="group w-full flex items-center gap-xs rounded-sm py-xxs text-caption text-brand-muted hover:text-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/15 transition-colors"
        >
          <span className="shrink-0">분석 스킬</span>
          {/* 고른 뒤에 남는 한 줄 — 목록에서 누른 것과 **같은 말**이어야 한다.
              focus 를 세워 두면 "센서 측정값"을 골랐는데 붙는 건
              `fdc-trace-reading` 이라, 고르고 나서도 무엇을 골랐는지 모른다. */}
          <span className="flex-1 min-w-0 text-left truncate font-mono text-brand-ink">
            {selectedSkill?.name ?? ""}
          </span>
          {/*
            누를 곳 표시는 **상태마다 하나만** 둔다. 고르기 전에는 "열린다"는
            신호(chevron)가, 고른 뒤에는 "되돌아간다"는 글자가 필요하다 — 둘을
            같이 놓으면 무엇을 누르는 건지 되레 흐려진다.
          */}
          {selectedSkill && !pickerOpen ? (
            <span className="shrink-0 text-brand-primary underline underline-offset-2">
              다시 선택하기
            </span>
          ) : (
            <SlideChevron open={pickerOpen} />
          )}
        </button>

        {/* 목록을 못 받았거나 비었을 때 — 펼친 사람에게만 말한다. 접힌 자리에는
            아무 말도 남기지 않는다: 쓸 수 없는 칸이면 없는 편이 낫고, 설비 등록은
            그대로 된다. */}
        {pickerOpen && (error || skills === null || skills.length === 0) && (
          <p className="animate-step-rise text-caption text-brand-muted-soft leading-relaxed">
            {error ??
              (skills === null ? "불러오는 중…" : "쓸 수 있는 스킬이 없습니다.")}
          </p>
        )}

        {/*
          고르기 자리 — 접혀 있어도 **검색창 한 줄**은 남는다(`expanded={false}`).
          다만 이미 고른 뒤에 접히면 아무것도 남기지 않는다: 아래에 그 스킬의 인자
          칸이 서 있어 검색창까지 두면 한 자리에 세 겹이 되고, 다시 고르는 길은 줄
          오른쪽 [다시 선택하기] 하나로 족하다.
        */}
        {!error && skills !== null && skills.length > 0 && (pickerOpen || !selectedSkill) && (
          <SkillPicker
            skills={skills}
            recent={recent}
            selected={selected}
            expanded={pickerOpen}
            onExpand={openPicker}
            onSelect={(skillName) => {
              setSelected(skillName);
              setValues({});
              // 스킬이 바뀌면 요구하는 값도 바뀐다 — 앞선 검사 결과는 무효다.
              setSubmitError(null);
              // 고르고 나면 목록은 접는다 — 남은 칸(인자)이 바로 보이게.
              setPickerOpen(false);
            }}
          />
        )}
      </div>

      {/*
        고른 스킬이 더 요구하는 값 — 스킬이 **정해져 있는 동안에만** 자리를 쓴다.
        다시 고르는 중(`pickerOpen`)에는 접는다: 이전 스킬의 답이 목록 아래
        남아 있으면, 지금 고르는 스킬의 것인지 앞서 고른 것의 것인지 알 수 없다.
        값은 지우지 않는다 — 목록만 접으면(고르기 취소) 채운 그대로 돌아온다.
        새 스킬을 실제로 고른 순간엔 `onSelect` 가 비운다.
      */}
      {!pickerOpen && selectedSkill && asking.length > 0 && (
        <AskInputs
          inputs={asking}
          values={values}
          onChange={(key, value) => {
            setValues((prev) => ({ ...prev, [key]: value }));
            setSubmitError(null);
          }}
          onSubmit={submit}
        />
      )}

      {submitError && (
        <p role="alert" className="text-caption text-brand-error">
          {submitError}
        </p>
      )}

      <button
        type="button"
        onClick={submit}
        className="h-8 rounded-sm text-caption bg-brand-primary text-brand-on-primary hover:bg-brand-primary-active focus:outline-none focus:ring-2 focus:ring-brand-primary/20 transition-colors"
      >
        시작
      </button>
    </div>
  );
}

/**
 * 고른 스킬이 더 요구하는 값들 — 아래에서 올라온다(`animate-step-rise`).
 *
 * 전부 채워야 [시작]이 열린다. 조회에 필요한 값이 빈 채로 분석 카드가 서면 그
 * 카드는 조달할 수 없는 요구가 되어 영영 안 걷힌다.
 */
function AskInputs({
  inputs,
  values,
  onChange,
  onSubmit,
}: {
  inputs: SkillInput[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  onSubmit: () => void;
}) {
  return (
    <div className="animate-step-rise flex flex-col gap-xs">
      <p className="text-caption text-brand-muted leading-relaxed">
        이 스킬에 더 필요한 값입니다.
      </p>
      <div className="max-h-[240px] overflow-y-auto scrollbar-none flex flex-col gap-xs">
        {inputs.map((input) => {
          const kind = inputKind(input.key, input.description);
          const heading = (
            <span className="text-caption text-brand-muted">
              {input.key.toUpperCase()}
              {input.description && (
                <span className="text-brand-muted-soft">
                  {" "}
                  — {input.description}
                </span>
              )}
            </span>
          );
          // 달력 분기는 label 로 감싸지 않는다 — label 이 팝업까지 덮으면 팝업의
          // 빈 곳 클릭이 트리거 버튼 활성화로 전달돼 달력이 닫힌다.
          if (kind !== "text") {
            return (
              <div key={input.key} className="flex flex-col gap-xxs">
                {heading}
                <DateTimeField
                  kind={kind}
                  value={values[input.key] ?? ""}
                  onChange={(v) => onChange(input.key, v)}
                  label={`${input.key.toUpperCase()} 입력`}
                />
              </div>
            );
          }
          return (
            <label key={input.key} className="flex flex-col gap-xxs">
              {heading}
              <input
                value={values[input.key] ?? ""}
                onChange={(e) => onChange(input.key, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onSubmit();
                }}
                placeholder={inputPlaceholder(input)}
                className="h-8 rounded-sm border border-brand-hairline bg-brand-canvas px-xs text-caption text-brand-ink placeholder:text-brand-muted-soft focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
              />
            </label>
          );
        })}
      </div>
    </div>
  );
}

/**
 * 인자 칸의 예시 — 카탈로그가 설명에 적어 둔 `(예: CVD-01)` 을 그대로 쓴다.
 * 예시가 없으면 아무 예시도 지어내지 않는다.
 */
function inputPlaceholder(input: SkillInput): string {
  const hint = input.description?.match(/예:\s*([^)\s][^)]*)/)?.[1]?.trim();
  return hint ? `예: ${hint}` : "값";
}

/** 위로 올라온다는 신호 — 열리면 방향이 뒤집혀 "접으면 내려간다"가 된다. */
function SlideChevron({ open }: { open: boolean }) {
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
      className={[
        "shrink-0 text-brand-muted-soft transition-transform duration-200",
        open ? "rotate-180" : "",
      ].join(" ")}
    >
      <polyline points="7 13 12 8 17 13" />
      <polyline points="7 18 12 13 17 18" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      width="26"
      height="26"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}
