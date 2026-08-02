/**
 * 작업판 카드 — 이 화면의 보관물은 설비/분석 두 층과 분석의 데이터 슬롯이 전부다.
 *
 *   EquipmentCard (설비)
 *   └─ analyses[] ── AnalysisCard (분석)
 *      ├─ dataList[] ── DataSlot (데이터 슬롯 — 스킬 스텝 전량을 개설 때 선생성)
 *      └─ attachments[] ── docs | link | image (스텝에 안 매인 보관물)
 *
 * 분석 카드는 **필요한 데이터 목록 전체를 처음부터 안다** — `dataList` 가 스킬
 * 스텝 그대로이고, 각 슬롯의 상태(미정/요청/도착)는 저장하지 않고 렌더마다
 * `slot-resolve` 로 로컬 파생한다. 판정 왕복이 카드를 발급하던 이전 세대
 * (request→data 전이·리컨사일)는 폐기됐다 — 화면은 현재 상태의 순수 함수다.
 *
 * 소속은 위치가 말한다(inode 방식). 표 본문(rows)만 IDB 스냅샷 저장소에 두고
 * 슬롯이 `snapshotId` 로 참조한다. 본문이 완전 삭제돼 참조가 허공이 되면 그
 * 슬롯은 도착이 아니다 — 해석이 다시 요청으로 파생한다(허상 정리가 공짜).
 *
 * 트리는 대화와 무관한 보관물이다: localStorage 에 통째로 영속하고, 새 대화·
 * 대화 전환에서 초기화하지 않는다. 미분류(카드를 거치지 않은 붙여넣기)는
 * 저장하지 않는다 — "어느 슬롯도 참조하지 않는 IDB 스냅샷"으로 렌더 시
 * 파생한다. 소속을 지어내지 않는다.
 */

import { newId } from "./id";
import type { Skill, SkillBind, SkillStep } from "./skills";
import { equipmentInputKey } from "./skills";
import {
  type PriorRows,
  queryKeyOf,
  resolveSlot,
} from "./slot-resolve";

// ── 카드·슬롯 ─────────────────────────────────────────────────────────────

/** 설비 카드 — 최상위 보관물. id 는 이름에서 결정적(`eq-<slug>`): 같은 이름 = 같은 설비. */
export type EquipmentCard = {
  id: string;
  name: string;
  /** 사람이 고른 라인 — 안 골랐으면 null(모르는 값을 지어내지 않는다). */
  line: string | null;
  analyses: AnalysisCard[];
};

/**
 * 분석 카드 — 절차 실행(run) 하나와 1:1. `runs[]` 선언의 원천이다.
 * `skills` 는 미래(복합 분석)를 위한 배열 모양이지만 지금은 항상 1개다 —
 * 로직은 `skills[0]` 단일 가정.
 */
export type AnalysisCard = {
  id: string;
  skills: Skill[];
  /** 시작 인자 — 생성 시점에 확정(설비형 입력이 있으면 설비명까지 채워서). */
  args: Record<string, string>;
  dataList: DataSlot[];
  attachments: AttachmentCard[];
};

/**
 * 데이터 슬롯 — 스킬 스텝 하나의 자리. spec 사본(title·sql·binds)과 상태
 * (`snapshotId`)만 담는다. 요청/도착 여부는 저장하지 않는다 — 파생이다.
 */
export type DataSlot = {
  title: string;
  /** bind 자리가 `:var` 로 남은 spec 원문 SQL. */
  sql: string;
  /** bind 이름 → 배선(인자 or 앞 슬롯의 컬럼). */
  binds: Record<string, SkillBind>;
  /** 데이터가 붙으면 IDB 스냅샷 참조 — 본문이 죽으면 도착이 아니다. */
  snapshotId?: string;
};

/** 스텝에 안 매인 보관물 — 자리만 잡아 둔 타입(내용 정의는 별도 이슈). */
export type AttachmentCard =
  | { type: "docs"; id: string; label: string; text: string }
  | { type: "link"; id: string; label: string; url: string }
  | { type: "image"; id: string; label: string; dataUrl: string };

/** BE 카드/선언에 실리는 절차 실행 참조 — queryKey 역파싱 금지, 소속은 이걸로. */
export type RunRef = { skill: string; args: Record<string, string> };

// ── 정체·대조 ─────────────────────────────────────────────────────────────

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

/** 설비명 → 설비 카드 id. 파생·강조·트리가 같은 규칙을 써야 맞물린다. */
export function equipmentIdOf(name: string): string {
  return `eq-${slug(name) || "unnamed"}`;
}

/** 분석 카드 → BE 선언(와이어 형태). */
export function runRefOf(card: AnalysisCard): RunRef {
  return { skill: card.skills[0].name, args: card.args };
}

/** 같은 절차 실행인가 — 스킬 이름 + 시작 인자 얕은 비교. */
export function sameRun(a: RunRef | undefined, b: RunRef | undefined): boolean {
  if (!a || !b || a.skill !== b.skill) return false;
  const ak = Object.keys(a.args);
  const bk = Object.keys(b.args);
  return ak.length === bk.length && ak.every((k) => a.args[k] === b.args[k]);
}

/** 이름표(queryKey)에 들어갈 필수 인자 이름 — BE 와 같은 정렬 규칙. */
function requiredArgNames(skill: Skill): string[] {
  return skill.inputs
    .filter((i) => i.required)
    .map((i) => i.key)
    .sort();
}

/** 슬롯의 queryKey — BE `QueryKey.of` 와 같은 표기(0-기반 스텝). */
export function slotQueryKey(an: AnalysisCard, step: number): string {
  return queryKeyOf(
    an.skills[0].name,
    step,
    an.args,
    requiredArgNames(an.skills[0]),
  );
}

// ── 슬롯 상태 파생 ────────────────────────────────────────────────────────

/** 본문 조회 — 렌더 층이 가진 스냅샷 목록을 얇게 받는다. */
export type SnapshotLookup = (snapshotId: string) =>
  | { columns: string[]; rows: (string | null)[][] }
  | undefined;

export type SlotView =
  /** 바인드 미해결 — 카드를 그리지 않는다. */
  | { kind: "pending"; step: number; title: string; reason: string }
  /** 쿼리 확정 — 점선 요청 카드. */
  | { kind: "request"; step: number; title: string; queryKey: string; sql: string }
  /** 도착 — 본문이 살아 있는 데이터 카드. */
  | { kind: "data"; step: number; title: string; queryKey: string; snapshotId: string };

/**
 * 분석 카드의 슬롯 전량을 해석한다 — 화면·안내·판정 페이로드가 전부 이 결과를
 * 읽는다. `snapshotId` 가 있어도 본문이 죽었으면(완전 삭제) 도착으로 치지
 * 않는다 — 해석이 앞 슬롯을 미도착으로 보고 요청을 다시 파생한다.
 */
export function slotViews(an: AnalysisCard, lookup: SnapshotLookup): SlotView[] {
  const priorRowsOf = (step: number): PriorRows => {
    const slot = an.dataList[step];
    if (!slot?.snapshotId) return null;
    const body = lookup(slot.snapshotId);
    return body ?? null;
  };
  return an.dataList.map((slot, step) => {
    if (slot.snapshotId !== undefined && lookup(slot.snapshotId) !== undefined) {
      return {
        kind: "data",
        step,
        title: slot.title,
        queryKey: slotQueryKey(an, step),
        snapshotId: slot.snapshotId,
      };
    }
    const r = resolveSlot(slot.sql, slot.binds, an.args, priorRowsOf);
    if (r.kind === "ready") {
      return {
        kind: "request",
        step,
        title: slot.title,
        queryKey: slotQueryKey(an, step),
        sql: r.sql,
      };
    }
    return { kind: "pending", step, title: slot.title, reason: r.reason };
  });
}

// ── 트리 연산 (전부 불변 — 바뀐 가지만 새 객체) ───────────────────────────

export type Workbench = { equipments: EquipmentCard[] };

export const EMPTY_WORKBENCH: Workbench = { equipments: [] };

/**
 * 설비 등록 — 같은 이름이 있으면 병합(라인은 고른 사람이 있을 때만 갱신).
 * 등록은 언제나 이 함수를 거치므로 설비 id 충돌은 곧 의도된 병합이다.
 */
export function upsertEquipment(
  wb: Workbench,
  name: string,
  line: string | null,
): Workbench {
  const id = equipmentIdOf(name);
  const existing = wb.equipments.find((e) => e.id === id);
  if (!existing) {
    return {
      equipments: [...wb.equipments, { id, name, line, analyses: [] }],
    };
  }
  if (!line || existing.line === line) return wb;
  return replaceEquipment(wb, { ...existing, line });
}

/**
 * 스텝 → 슬롯. 배선 전문(`binds`)이 없는 구식 spec 은 argBinds 만이라도
 * 살린다 — priorStep 자리는 배선을 몰라 영영 미정으로 남는데, 지어내는 것보다
 * 낫고 재등록(새 카탈로그)이 자연 치유한다.
 */
function slotOf(step: SkillStep): DataSlot {
  const binds =
    step.binds ??
    Object.fromEntries(
      Object.entries(step.argBinds).map(([bind, arg]) => [
        bind,
        { from: "arg", arg } as SkillBind,
      ]),
    );
  return { title: step.title, sql: step.sql, binds };
}

/**
 * 분석 카드 개설 — 설비가 없으면 함께 세운다. 같은 설비에 같은 run 이 이미
 * 있으면 그대로 둔다(중복 개설 아님). 슬롯은 스킬 스텝 **전량**을 여기서
 * 선생성한다 — 분석 카드는 태어날 때부터 필요한 데이터 목록을 다 안다.
 */
export function openAnalysis(
  wb: Workbench,
  equipmentName: string,
  line: string | null,
  skill: Skill,
  values: Record<string, string>,
): { wb: Workbench; analysis: AnalysisCard } {
  const withEq = upsertEquipment(wb, equipmentName, line);
  const eq = withEq.equipments.find(
    (e) => e.id === equipmentIdOf(equipmentName),
  )!;
  const eqKey = equipmentInputKey(skill);
  const args = { ...(eqKey ? { [eqKey]: equipmentName } : {}), ...values };
  const ref = { skill: skill.name, args };
  const existing = eq.analyses.find((a) => sameRun(runRefOf(a), ref));
  if (existing) return { wb: withEq, analysis: existing };
  const analysis: AnalysisCard = {
    id: newId("an_"),
    skills: [skill],
    args,
    dataList: skill.steps.map(slotOf),
    attachments: [],
  };
  return {
    wb: replaceEquipment(withEq, {
      ...eq,
      analyses: [...eq.analyses, analysis],
    }),
    analysis,
  };
}

/** 트리의 모든 분석 카드 — 선언(runs[])을 만들 때의 순회 순서 그대로. */
export function allAnalyses(wb: Workbench): AnalysisCard[] {
  return wb.equipments.flatMap((e) => e.analyses);
}

/** 분석 카드 → BE `runs[]` 선언. 분석이 없으면 undefined(선언 생략). */
export function toRunDecls(wb: Workbench): RunRef[] | undefined {
  const analyses = allAnalyses(wb);
  return analyses.length === 0 ? undefined : analyses.map(runRefOf);
}

/**
 * 슬롯 채움 — 등록된 스냅샷을 queryKey 가 가리키는 슬롯에 앉힌다.
 * 재등록(같은 자리)은 참조만 갱신된다. 어느 슬롯과도 안 맞으면 트리는
 * 그대로다(스냅샷은 미분류로 남는다 — 소속을 지어내지 않는다).
 */
export function fulfillSlot(
  wb: Workbench,
  queryKey: string,
  snapshotId: string,
): Workbench {
  return mapAnalyses(wb, (an) => {
    const step = an.dataList.findIndex(
      (_, i) => slotQueryKey(an, i) === queryKey,
    );
    if (step === -1) return an;
    const dataList = an.dataList.map((s, i) =>
      i === step ? { ...s, snapshotId } : s,
    );
    return { ...an, dataList };
  });
}

/** 분석 카드 제거 — 슬롯·보관물도 함께 사라진다(cascade). IDB 본문 정리는 호출자 몫. */
export function removeAnalysis(wb: Workbench, analysisId: string): Workbench {
  return {
    equipments: wb.equipments.map((eq) =>
      eq.analyses.some((a) => a.id === analysisId)
        ? { ...eq, analyses: eq.analyses.filter((a) => a.id !== analysisId) }
        : eq,
    ),
  };
}

/** 설비 카드 제거 — 그 안의 분석·슬롯 전부 함께(cascade). */
export function removeEquipment(wb: Workbench, equipmentId: string): Workbench {
  return {
    equipments: wb.equipments.filter((e) => e.id !== equipmentId),
  };
}

/** 트리가 참조하는 모든 IDB 스냅샷 id — 미분류(=미참조) 파생의 반대편. */
export function referencedSnapshotIds(wb: Workbench): Set<string> {
  const ids = new Set<string>();
  for (const an of allAnalyses(wb)) {
    for (const s of an.dataList) {
      if (s.snapshotId !== undefined) ids.add(s.snapshotId);
    }
  }
  return ids;
}

/** 역인덱스 — snapshotId → 소속(설비·분석). 휴지통 복원·중복 안내용. */
export function ownerOfSnapshot(
  wb: Workbench,
  snapshotId: string,
): { equipment: EquipmentCard; analysis: AnalysisCard } | null {
  for (const eq of wb.equipments) {
    for (const an of eq.analyses) {
      if (an.dataList.some((s) => s.snapshotId === snapshotId)) {
        return { equipment: eq, analysis: an };
      }
    }
  }
  return null;
}

function replaceEquipment(wb: Workbench, eq: EquipmentCard): Workbench {
  return {
    equipments: wb.equipments.map((e) => (e.id === eq.id ? eq : e)),
  };
}

function mapAnalyses(
  wb: Workbench,
  f: (an: AnalysisCard) => AnalysisCard,
): Workbench {
  return {
    equipments: wb.equipments.map((eq) => {
      const analyses = eq.analyses.map(f);
      return analyses.every((a, i) => a === eq.analyses[i])
        ? eq
        : { ...eq, analyses };
    }),
  };
}

// ── 영속 (localStorage) ──────────────────────────────────────────────────

const STORAGE_KEY = "fdc.workbench.v1";

/** 저장 — 트리는 가볍다(본문은 IDB). 실패(용량 등)는 조용히 넘긴다: 다음 저장이 또 온다. */
export function saveWorkbench(wb: Workbench): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(wb));
  } catch {
    // 저장 실패가 사용 흐름을 끊으면 안 된다 — 메모리 상태가 진실이고 재시도된다.
  }
}

/**
 * 구식 분석(카드 세대: skill 단수 + cards[] request/data)을 슬롯 세대로 옮긴다.
 * data 카드의 참조는 queryKey 의 스텝 번호(`#N`)로 슬롯에 앉힌다 — 등록 데이터를
 * 버리지 않기 위한 **마이그레이션 한정** 파싱이다(정상 경로의 역파싱 금지와 무관).
 */
function migrateAnalysis(raw: unknown): AnalysisCard | null {
  if (typeof raw !== "object" || raw === null) return null;
  const a = raw as {
    id?: unknown;
    args?: unknown;
    skills?: unknown;
    dataList?: unknown;
    attachments?: unknown;
    skill?: Skill;
    cards?: unknown[];
  };
  if (typeof a.id !== "string" || typeof a.args !== "object" || a.args === null) {
    return null;
  }
  if (Array.isArray(a.skills) && Array.isArray(a.dataList)) {
    return {
      id: a.id,
      skills: a.skills as Skill[],
      args: a.args as Record<string, string>,
      dataList: a.dataList as DataSlot[],
      attachments: Array.isArray(a.attachments)
        ? (a.attachments as AttachmentCard[])
        : [],
    };
  }
  if (!a.skill || !Array.isArray(a.skill.steps)) return null;
  const dataList = a.skill.steps.map(slotOf);
  for (const c of a.cards ?? []) {
    const card = c as { type?: string; queryKey?: string; snapshotId?: string };
    if (card.type !== "data" || !card.queryKey || !card.snapshotId) continue;
    const m = /#(\d{1,3})(?:__|$)/.exec(card.queryKey);
    if (!m) continue;
    const step = Number(m[1]);
    if (step >= 0 && step < dataList.length) {
      dataList[step] = { ...dataList[step], snapshotId: card.snapshotId };
    }
  }
  return {
    id: a.id,
    skills: [a.skill],
    args: a.args as Record<string, string>,
    dataList,
    attachments: [],
  };
}

/** 복원 — 없거나 깨졌으면 빈 작업판. 모양이 어긋난 항목은 버린다(부분 수용). */
export function loadWorkbench(): Workbench {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_WORKBENCH;
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !Array.isArray((parsed as { equipments?: unknown }).equipments)
    ) {
      return EMPTY_WORKBENCH;
    }
    const equipments = (parsed as { equipments: unknown[] }).equipments
      .filter(
        (e): e is EquipmentCard & { analyses: unknown[] } =>
          typeof e === "object" &&
          e !== null &&
          typeof (e as EquipmentCard).id === "string" &&
          typeof (e as EquipmentCard).name === "string" &&
          Array.isArray((e as EquipmentCard).analyses),
      )
      .map((e) => ({
        id: e.id,
        name: e.name,
        line: typeof e.line === "string" ? e.line : null,
        analyses: e.analyses
          .map(migrateAnalysis)
          .filter((a): a is AnalysisCard => a !== null),
      }));
    return { equipments };
  } catch {
    return EMPTY_WORKBENCH;
  }
}
