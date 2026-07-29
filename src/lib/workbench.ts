import type { ScopeItem } from "./query-scope";
import type { SkillSession } from "./skills";
import { readJson, removeKey, writeJson } from "./storage";

/**
 * 대화별 **작업판** — 사람이 세워 둔 것들.
 *
 * 우측 설비 카드는 저장물이 아니라 파생물이다(`derivePanel`). 그 씨앗이 전부
 * 메모리 state 였던 탓에, 대화를 옮기거나 새로고침하면 사람이 등록한 설비·라인·
 * 스킬이 통째로 사라졌다 — 카드가 사라진 것으로 보이지만 실은 씨앗이 사라진 것이다.
 * 그래서 씨앗을 대화에 붙여 저장한다.
 *
 * 채팅이 요청한 데이터 카드(`useDataRequests`)는 **여기 넣지 않는다** — 요청은
 * 대화의 한 턴에 매인 것이라 되살아나면 이미 지나간 요구가 유령으로 남는다.
 * 그 요청이 실제로 채워졌다면 스냅샷이 남고, 스냅샷은 `sessionSnapshotIds` 로
 * 이 대화의 기본 스코프에 돌아온다.
 */
export type Workbench = {
  /** `새 분석 추가`로 직접 등록한 설비 — 카드가 서는 첫 이유. */
  seedEquipments: string[];
  /** 설비 → 사람이 고른 라인. 채팅에서 파생된 설비는 여기 없다. */
  equipmentLines: Record<string, string>;
  /** 등록한 스킬 세션 — 좌측 입력·요청 카드의 출처. */
  skillSessions: SkillSession[];
  /** 이 대화가 등록한 스냅샷 id — 기본 스코프를 그대로 복원한다. */
  sessionSnapshotIds: string[];
  /** 질의 대상 트레이에 담긴 것들. */
  queryScope: ScopeItem[];
};

export const EMPTY_WORKBENCH: Workbench = {
  seedEquipments: [],
  equipmentLines: {},
  skillSessions: [],
  sessionSnapshotIds: [],
  queryScope: [],
};

/** 아직 저장할 것이 없는 작업판 — 빈 것은 대화에 붙이지 않는다. */
export function isEmptyWorkbench(w: Workbench): boolean {
  return (
    w.seedEquipments.length === 0 &&
    Object.keys(w.equipmentLines).length === 0 &&
    w.skillSessions.length === 0 &&
    w.sessionSnapshotIds.length === 0 &&
    w.queryScope.length === 0
  );
}

function strings(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

function stringMap(v: unknown): Record<string, string> {
  if (!v || typeof v !== "object" || Array.isArray(v)) return {};
  const out: Record<string, string> = {};
  for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
    if (typeof val === "string") out[k] = val;
  }
  return out;
}

function isSkillSession(v: unknown): v is SkillSession {
  if (!v || typeof v !== "object") return false;
  const s = v as Record<string, unknown>;
  if (typeof s.id !== "string" || typeof s.equipment !== "string") return false;
  if (!s.skill || typeof s.skill !== "object") return false;
  const skill = s.skill as Record<string, unknown>;
  return typeof skill.skill === "string" && typeof skill.name === "string";
}

function isScopeItem(v: unknown): v is ScopeItem {
  if (!v || typeof v !== "object") return false;
  const i = v as Record<string, unknown>;
  if (typeof i.equipment !== "string") return false;
  if (i.kind === "equipment") return true;
  return (
    i.kind === "analysis" &&
    typeof i.lineKey === "string" &&
    typeof i.category === "string"
  );
}

/**
 * 저장된 값 → 쓸 수 있는 작업판.
 *
 * 낡은 저장분·손으로 고친 localStorage 를 만나도 화면이 서야 하므로, 못 읽는
 * 조각은 통째로 버리는 대신 **그 자리만 비운다**. 스킬 하나가 깨졌다고 등록한
 * 설비까지 잃을 이유는 없다.
 */
export function parseWorkbench(v: unknown): Workbench {
  if (!v || typeof v !== "object") return EMPTY_WORKBENCH;
  const w = v as Record<string, unknown>;
  return {
    seedEquipments: strings(w.seedEquipments),
    equipmentLines: stringMap(w.equipmentLines),
    skillSessions: Array.isArray(w.skillSessions)
      ? w.skillSessions.filter(isSkillSession)
      : [],
    sessionSnapshotIds: strings(w.sessionSnapshotIds),
    queryScope: Array.isArray(w.queryScope)
      ? w.queryScope.filter(isScopeItem)
      : [],
  };
}

function canonical(w: Workbench): string {
  return JSON.stringify([
    w.seedEquipments,
    Object.keys(w.equipmentLines)
      .sort()
      .map((k) => [k, w.equipmentLines[k]]),
    w.skillSessions,
    w.sessionSnapshotIds,
    w.queryScope,
  ]);
}

/**
 * 내용이 같은가 — 같으면 대화의 `updatedAt` 을 올리지 않는다. 복원 직후의
 * 되쓰기가 사이드바 정렬을 흔드는 것을 막는다.
 */
export function sameWorkbench(a: Workbench, b: Workbench): boolean {
  return canonical(a) === canonical(b);
}

/**
 * 아직 대화가 없을 때의 작업판.
 *
 * 대화는 첫 메시지에서 생긴다. 그 전에 `새 분석 추가`로 설비를 세워 두고
 * 새로고침하면 붙일 대화가 없어 잃는다 — 그 구간만 이 자리에 맡아 둔다.
 * 대화가 생기는 순간 그 대화로 옮겨 가고 이 자리는 비워진다.
 */
const PENDING_KEY = "fdc-agent:pending-workbench";

export function loadPendingWorkbench(): Workbench {
  return parseWorkbench(readJson<unknown>(PENDING_KEY, null));
}

export function savePendingWorkbench(w: Workbench): void {
  if (isEmptyWorkbench(w)) {
    removeKey(PENDING_KEY);
    return;
  }
  writeJson(PENDING_KEY, w);
}

export function clearPendingWorkbench(): void {
  removeKey(PENDING_KEY);
}
