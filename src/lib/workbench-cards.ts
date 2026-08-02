/**
 * 작업판 카드 3종 — 이 화면의 보관물은 이 세 객체가 전부다.
 *
 *   EquipmentCard (설비)
 *   └─ analyses[] ── AnalysisCard (분석)
 *      └─ cards[] ── SnapshotCard (스냅샷 카드, type 판별 유니온)
 *
 * 소속은 위치가 말한다 — 카드가 분석의 `cards` 안에, 분석이 설비의 `analyses`
 * 안에 실제로 들어 있다(inode 방식: 트리는 메타데이터+포인터). 표 본문(rows)
 * 같은 무거운 페이로드만 IDB 스냅샷 저장소에 두고 `snapshotId` 로 참조한다 —
 * 휴지통·중복 감지·결과 없음 처리는 그 층을 그대로 재사용한다.
 *
 * 트리는 대화와 무관한 보관물이다: localStorage 에 통째로 영속하고, 새 대화·
 * 대화 전환에서 초기화하지 않는다.
 *
 * 미분류(카드를 거치지 않은 붙여넣기 데이터)는 저장하지 않는다 — "어느 카드도
 * 참조하지 않는 IDB 스냅샷"으로 렌더 시 파생한다. 소속을 지어내지 않는다.
 */

import { newId } from "./id";
import type { Skill } from "./skills";
import { equipmentInputKey } from "./skills";

// ── 3종 카드 ──────────────────────────────────────────────────────────────

/** 설비 카드 — 최상위 보관물. id 는 이름에서 결정적(`eq-<slug>`): 같은 이름 = 같은 설비. */
export type EquipmentCard = {
  id: string;
  name: string;
  /** 사람이 고른 라인 — 안 골랐으면 null(모르는 값을 지어내지 않는다). */
  line: string | null;
  analyses: AnalysisCard[];
};

/**
 * 분석 카드 — 절차 실행(run) 하나와 1:1. `runs[]` 선언의 원천이고, BE 가
 * 카드에 되돌려주는 `run` 참조와 (skill.name, args) 얕은 비교로 대조된다.
 */
export type AnalysisCard = {
  id: string;
  skill: Skill;
  /** 시작 인자 — 생성 시점에 확정(설비형 입력이 있으면 설비명까지 채워서). */
  args: Record<string, string>;
  cards: SnapshotCard[];
};

/** 스냅샷 카드 — type 판별 유니온. 카드의 일생: request 가 채워지면 그 자리에서 data 로 전이. */
export type SnapshotCard =
  | RequestCard
  | DataCard
  | { type: "docs"; id: string; label: string; text: string }
  | { type: "link"; id: string; label: string; url: string }
  | { type: "image"; id: string; label: string; dataUrl: string };

/** BE 판정이 발급한 열린 요청 — 판정마다 전량 갱신되는 유일한 카드 종류. */
export type RequestCard = {
  type: "request";
  id: string;
  queryKey: string;
  label: string;
  sql?: string;
  columns?: string[];
  timeRange?: { start: string; end: string };
};

/** 등록된 표 데이터 — 본문(rows)은 IDB 스냅샷을 `snapshotId` 로 참조한다. */
export type DataCard = {
  type: "data";
  id: string;
  queryKey: string;
  label: string;
  snapshotId: string;
};

/** BE 카드/선언에 실리는 절차 실행 참조 — queryKey 역파싱 금지, 소속은 이걸로. */
export type RunRef = { skill: string; args: Record<string, string> };

/** BE 가 발급하는 열린 요청(와이어 형태) — openRequests[] 의 원소. */
export type WireRequest = {
  queryKey: string;
  label: string;
  sql?: string;
  columns?: string[];
  run?: RunRef;
};

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
  return { skill: card.skill.name, args: card.args };
}

/** 같은 절차 실행인가 — 스킬 이름 + 시작 인자 얕은 비교. */
export function sameRun(a: RunRef | undefined, b: RunRef | undefined): boolean {
  if (!a || !b || a.skill !== b.skill) return false;
  const ak = Object.keys(a.args);
  const bk = Object.keys(b.args);
  return ak.length === bk.length && ak.every((k) => a.args[k] === b.args[k]);
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
 * 분석 카드 개설 — 설비가 없으면 함께 세운다. 같은 설비에 같은 run 이 이미
 * 있으면 그대로 둔다(중복 개설 아님). 반환의 `analysis` 는 트리 안의 실물.
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
  const analysis: AnalysisCard = { id: newId("an_"), skill, args, cards: [] };
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
 * 판정 결과 반영 — BE `openRequests`(전량)를 각 분석의 request 카드에 맞춘다.
 *
 * request 카드만 갈아끼운다: data·docs·link·image 는 사용자 보관물이라 판정이
 * 못 건드린다. 같은 queryKey 의 기존 request 카드는 객체를 유지해(내용 같을 때)
 * 깜빡임을 막고, run 참조가 어느 분석과도 안 맞는 요청은 버리지 않고 반환해
 * 호출자가 구식 경로(미소속 표시)로 넘긴다.
 *
 * `snapshotIdByKey` 는 자가 치유 백필이다: 판정이 열라고 한 카드의 queryKey 와
 * **정확히 일치**하는 스냅샷이 이미 로컬에 있으면(트리 도입 전 등록분 등) 요청
 * 카드 대신 그 자리에 data 카드를 앉힌다 — 키는 BE 발급분과의 등치 비교뿐,
 * 역파싱이 아니다. 백필이 있었으면 `backfilled` 로 알려 호출자가 판정을 한 번
 * 더 돌리게 한다(도착이 실려야 다음 단계가 열린다).
 */
export function reconcileRequestCards(
  wb: Workbench,
  open: WireRequest[],
  snapshotIdByKey?: (queryKey: string) => string | undefined,
): { wb: Workbench; unmatched: WireRequest[]; backfilled: number } {
  const unmatched: WireRequest[] = [];
  let backfilled = 0;
  const byAnalysis = new Map<string, WireRequest[]>();
  for (const req of open) {
    const analysis = allAnalyses(wb).find((a) =>
      sameRun(runRefOf(a), req.run),
    );
    if (!analysis) {
      unmatched.push(req);
      continue;
    }
    const list = byAnalysis.get(analysis.id) ?? [];
    list.push(req);
    byAnalysis.set(analysis.id, list);
  }

  const next: Workbench = {
    equipments: wb.equipments.map((eq) => ({
      ...eq,
      analyses: eq.analyses.map((an) => {
        const wanted = byAnalysis.get(an.id) ?? [];
        const keep = an.cards.filter((c) => c.type !== "request");
        const prevReq = new Map(
          an.cards
            .filter((c): c is RequestCard => c.type === "request")
            .map((c) => [c.queryKey, c]),
        );
        const fulfilled = new Set(
          an.cards
            .filter((c): c is DataCard => c.type === "data")
            .map((c) => c.queryKey),
        );
        const requests = wanted
          // 이미 data 로 전이한 자리는 다시 열지 않는다 — 판정 직후 스냅샷이
          // 아직 페이로드에 없던 낡은 echo 가 카드를 되살리는 것을 막는다.
          .filter((r) => !fulfilled.has(r.queryKey))
          .map((r): SnapshotCard => {
            const prev = prevReq.get(r.queryKey);
            // 자가 치유 — 이 키의 데이터가 이미 로컬에 있으면 요청 대신 도착.
            const snapId = snapshotIdByKey?.(r.queryKey);
            if (snapId !== undefined) {
              backfilled++;
              return {
                type: "data" as const,
                id: prev?.id ?? newId("card_"),
                queryKey: r.queryKey,
                label: r.label,
                snapshotId: snapId,
              };
            }
            if (prev && prev.label === r.label && prev.sql === r.sql) {
              return prev;
            }
            return {
              type: "request" as const,
              id: prev?.id ?? newId("card_"),
              queryKey: r.queryKey,
              label: r.label,
              ...(r.sql !== undefined ? { sql: r.sql } : {}),
              ...(r.columns !== undefined ? { columns: r.columns } : {}),
            };
          });
        if (requests.length === 0 && keep.length === an.cards.length) {
          return an;
        }
        return { ...an, cards: [...keep, ...requests] };
      }),
    })),
  };
  return { wb: next, unmatched, backfilled };
}

/**
 * request → data 전이 — 요청 카드를 채워 등록한 순간, 같은 자리의 카드가
 * 데이터 카드가 되고 본문은 IDB 스냅샷(`snapshotId`)을 가리킨다.
 * 같은 queryKey 의 data 카드가 이미 있으면 참조만 갱신한다(재등록).
 */
export function fulfillRequestCard(
  wb: Workbench,
  queryKey: string,
  snapshotId: string,
): Workbench {
  return mapAnalyses(wb, (an) => {
    if (!an.cards.some((c) => "queryKey" in c && c.queryKey === queryKey)) {
      return an;
    }
    const existing = an.cards.find(
      (c): c is DataCard => c.type === "data" && c.queryKey === queryKey,
    );
    if (existing) {
      return {
        ...an,
        cards: an.cards.map((c) =>
          c === existing ? { ...existing, snapshotId } : c,
        ),
      };
    }
    return {
      ...an,
      cards: an.cards.map((c) =>
        c.type === "request" && c.queryKey === queryKey
          ? {
              type: "data" as const,
              id: c.id,
              queryKey: c.queryKey,
              label: c.label,
              snapshotId,
            }
          : c,
      ),
    };
  });
}

/** 분석 카드 제거 — 소속 카드도 함께 사라진다(cascade). IDB 본문 정리는 호출자 몫. */
export function removeAnalysis(wb: Workbench, analysisId: string): Workbench {
  return {
    equipments: wb.equipments.map((eq) =>
      eq.analyses.some((a) => a.id === analysisId)
        ? { ...eq, analyses: eq.analyses.filter((a) => a.id !== analysisId) }
        : eq,
    ),
  };
}

/** 설비 카드 제거 — 그 안의 분석·카드 전부 함께(cascade). */
export function removeEquipment(wb: Workbench, equipmentId: string): Workbench {
  return {
    equipments: wb.equipments.filter((e) => e.id !== equipmentId),
  };
}

/** 트리가 참조하는 모든 IDB 스냅샷 id — 미분류(=미참조) 파생의 반대편. */
export function referencedSnapshotIds(wb: Workbench): Set<string> {
  const ids = new Set<string>();
  for (const an of allAnalyses(wb)) {
    for (const c of an.cards) {
      if (c.type === "data") ids.add(c.snapshotId);
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
      if (an.cards.some((c) => c.type === "data" && c.snapshotId === snapshotId)) {
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
    const equipments = (parsed as { equipments: unknown[] }).equipments.filter(
      (e): e is EquipmentCard =>
        typeof e === "object" &&
        e !== null &&
        typeof (e as EquipmentCard).id === "string" &&
        typeof (e as EquipmentCard).name === "string" &&
        Array.isArray((e as EquipmentCard).analyses),
    );
    return { equipments };
  } catch {
    return EMPTY_WORKBENCH;
  }
}
