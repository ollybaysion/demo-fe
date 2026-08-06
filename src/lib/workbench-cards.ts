/**
 * 작업판 카드 — 이 화면의 보관물은 설비/분석 두 층과 분석의 데이터 슬롯이 전부다.
 *
 *   EquipmentCard (설비)
 *   └─ analyses[] ── AnalysisCard (분석)
 *      ├─ dataList[] ── DataSlot (조달 수단 전량을 개설 때 선생성)
 *      └─ attachments[] ── docs | link | image (조회에 안 매인 보관물)
 *
 * 분석 카드는 **알아내려는 것의 목록을 처음부터 안다** — `dataList` 가 스킬의
 * `queries[]` 그대로다. 다만 각 슬롯이 **지금 실행 가능한지는 여기서 판단하지
 * 않는다**: spec v3 부터 그 판정과 실행 문장은 BE 조달 원장(`/chat/data` 의
 * `dataRequests`)이 준다. 화면이 스킬을 읽어 SQL 을 완성하던 세대(`slot-resolve`)는
 * 폐기됐다 — 같은 규칙을 두 곳에 두면 반드시 갈라진다.
 *
 * 그래서 슬롯이 들고 있는 것은 **정체(조달 id·라벨)와 소유(snapshotId)뿐**이다.
 * 소속은 위치가 말한다(inode 방식). 표 본문(rows)만 IDB 스냅샷 저장소에 두고
 * 슬롯이 `snapshotId` 로 참조한다. 본문이 완전 삭제돼 참조가 허공이 되면 그
 * 슬롯은 도착이 아니다 — 다음 판정이 그 조회를 다시 연다(허상 정리가 공짜).
 *
 * 트리는 대화와 무관한 보관물이다: localStorage 에 통째로 영속하고, 새 대화·
 * 대화 전환에서 초기화하지 않는다. 미분류(카드를 거치지 않은 붙여넣기)는
 * 저장하지 않는다 — "어느 슬롯도 참조하지 않는 IDB 스냅샷"으로 렌더 시
 * 파생한다. 소속을 지어내지 않는다.
 */

import { newId } from "./id";
import type { Skill, SkillQuery } from "./skills";
import { equipmentInputKey } from "./skills";

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
 * 데이터 슬롯 — 조달 수단 하나의 자리.
 *
 * 정체(`queryId`·`label`)와 소유(`snapshotId`)만 담는다. **SQL 도 배선도 없다** —
 * 실행 문장과 "지금 열 수 있나"는 BE 원장이 답하고, 화면은 그것을 그린다.
 */
export type DataSlot = {
  /** 조달 id — 조회 키(`스킬#조달id__인자`)의 가운데 토막. 순서가 아니라 이름이다. */
  queryId: string;
  /** 이 조회가 채우는 need 의 말 — 원장이 오기 전에도 무엇을 알아내려는지 보인다. */
  label: string;
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

/**
 * 슬롯의 조회 키 — BE `QueryKey.of` 와 같은 표기(`스킬#조달id__이름표`).
 *
 * 가운데가 스텝 인덱스가 아니라 **조달 id** 다(spec v3). `queries[]` 는 카탈로그라
 * 순서에 뜻이 없어져, 위치로 가리키면 목록 재배열만으로 남의 조회를 가리키게 된다.
 * 이름표에는 그 조회가 쓰는 바인드가 아니라 **스킬의 필수 인자 전량**이 들어간다 —
 * 그래야 한 절차의 모든 조회가 같은 이름표를 단다.
 */
export function slotQueryKey(an: AnalysisCard, queryId: string): string {
  const skill = an.skills[0];
  const parts: string[] = [];
  for (const name of requiredArgNames(skill)) {
    const value = an.args[name];
    if (value !== undefined && value.trim() !== "") {
      parts.push(`${name}=${sanitize(value)}`);
    }
  }
  const label = parts.join("&");
  const head = `${skill.name}#${queryId}`;
  return label ? `${head}__${label}` : head;
}

/** 구분자 충돌만 막는다 — 값의 다른 문자는 그대로 둔다(사람이 읽는 키다). */
function sanitize(value: string): string {
  return value.trim().replace(/#/g, "_").replace(/&/g, "_").replace(/=/g, "_");
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

/** 조달 수단 → 슬롯. 자리와 이름만 가져온다 — 실행 판단은 BE 원장 소관이다. */
function slotOf(query: SkillQuery): DataSlot {
  return { queryId: query.id, label: query.label };
}

/**
 * 분석 카드 개설 — 설비가 없으면 함께 세운다. 같은 설비에 같은 run 이 이미
 * 있으면 그대로 둔다(중복 개설 아님). 슬롯은 스킬의 조달 수단 **전량**을 여기서
 * 선생성한다 — 분석 카드는 태어날 때부터 무엇을 알아내려는지 다 안다.
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
    dataList: skill.queries.map(slotOf),
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
    const at = an.dataList.findIndex(
      (slot) => slotQueryKey(an, slot.queryId) === queryKey,
    );
    if (at === -1) return an;
    const dataList = an.dataList.map((s, i) =>
      i === at ? { ...s, snapshotId } : s,
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

/**
 * v2 = spec v3 슬롯 세대. 키를 올려 **옛 저장분을 버린다** — 조회 키의 가운데가
 * 스텝 인덱스(`#0`)에서 조달 id(`#sensor_row`)로 바뀌어, 옛 카드의 참조는 어느
 * 조회도 가리키지 못한다. 옮길 수 있는 것도 아니다(인덱스 → id 대응이 없다).
 * 데모의 보관물이라 버리는 편이 낫고, 새 등록이 곧바로 자리를 채운다.
 */
const STORAGE_KEY = "fdc.workbench.v2";

/** 저장 — 트리는 가볍다(본문은 IDB). 실패(용량 등)는 조용히 넘긴다: 다음 저장이 또 온다. */
export function saveWorkbench(wb: Workbench): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(wb));
  } catch {
    // 저장 실패가 사용 흐름을 끊으면 안 된다 — 메모리 상태가 진실이고 재시도된다.
  }
}

/**
 * 저장분 한 건 수용 — 모양이 어긋나면 버린다(부분 수용). 세대 간 변환은 없다:
 * 키를 올려 옛 세대를 통째로 떨어뜨렸으므로 여기 오는 것은 v2 뿐이고, 그래도
 * 손으로 고친 저장분이 있을 수 있어 필드는 하나씩 확인한다.
 */
function readAnalysis(raw: unknown): AnalysisCard | null {
  if (typeof raw !== "object" || raw === null) return null;
  const a = raw as {
    id?: unknown;
    args?: unknown;
    skills?: unknown;
    dataList?: unknown;
    attachments?: unknown;
  };
  if (typeof a.id !== "string" || typeof a.args !== "object" || a.args === null) {
    return null;
  }
  if (!Array.isArray(a.skills) || a.skills.length === 0) return null;
  if (!Array.isArray(a.dataList)) return null;
  const dataList = a.dataList.filter(
    (s): s is DataSlot =>
      typeof s === "object" &&
      s !== null &&
      typeof (s as DataSlot).queryId === "string",
  );
  return {
    id: a.id,
    skills: a.skills as Skill[],
    args: a.args as Record<string, string>,
    dataList,
    attachments: Array.isArray(a.attachments)
      ? (a.attachments as AttachmentCard[])
      : [],
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
          .map(readAnalysis)
          .filter((a): a is AnalysisCard => a !== null),
      }));
    return { equipments };
  } catch {
    return EMPTY_WORKBENCH;
  }
}
