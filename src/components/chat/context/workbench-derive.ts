/**
 * 작업판 트리 → 화면 모델 파생 — `derive-cards`(라벨 파싱)의 후계자.
 *
 * 소속이 트리에 명시돼 있으므로(설비⊃분석⊃카드) 여기서는 **읽어서 옮겨 담기만**
 * 한다: 라벨 파싱도, 버킷 추측도 없다. 그룹 = 분석 카드 하나(키 = 분석 id,
 * 우측 줄 키와 동일 — 줄 클릭이 곧 그룹 안내다). 예외는 미분류 한 그룹 —
 * 어느 카드도 참조하지 않는 스냅샷과, 어느 분석과도 맞지 않은 구식 요청이
 * 모인다. 소속을 지어내지 않는다.
 */

import type { PendingRequest } from "@/lib/request-store";
import { JUDGE_ORIGIN } from "@/lib/request-store";
import type { DataSnapshot } from "@/lib/types";
import type { AnalysisCard, Workbench } from "@/lib/workbench-cards";
import { referencedSnapshotIds } from "@/lib/workbench-cards";
import type { EquipmentCardModel, EquipmentLine } from "./equipment-cards.mock";
import type { DerivedGroup, DerivedPanel } from "./derive-cards";

export const UNCLASSIFIED_GROUP_KEY = "unclassified";

/**
 * 분석 카드의 사람이 읽는 라벨 — 기본은 스킬 이름만. 인자는 실행의 정체
 * 식별자지 사람 읽으라고 있는 값이 아니라 제목에서 뺀다. 단 같은 자리에서
 * 같은 스킬이 인자만 다르게 여럿이면 구분이 안 되니, 그때만 꼬리로 붙인다.
 */
export function analysisLabel(
  an: AnalysisCard,
  siblings: AnalysisCard[] = [],
): string {
  const dup = siblings.some(
    (s) => s !== an && s.skill.name === an.skill.name,
  );
  if (!dup) return an.skill.name;
  const args = Object.entries(an.args)
    .map(([k, v]) => `${k}=${v}`)
    .join(", ");
  return args ? `${an.skill.name} (${args})` : an.skill.name;
}

/**
 * 트리 + 스냅샷 저장소 → 우측 설비 카드와 좌측 데이터 그룹.
 *
 * @param snapshots      살아 있는 스냅샷 전부 — 트리의 data 카드가 여기서 본문을
 *                       찾는다. 세션 스코프와 무관하다: 보관물 카드가 스코프
 *                       토글로 사라지면 그게 곧 "설비 카드가 죽는" 증상이다.
 * @param unclassified   미분류 후보 — 세션 스코프를 **거친** 목록을 받는다.
 *                       (붙여넣기 잔여는 지금까지처럼 현재 세션 것만 기본 노출.)
 * @param legacyRequests 구식 요청 카드(채팅 릴레이 등 트리 밖) — 미분류로 흘린다.
 */
export function deriveWorkbenchPanel(
  wb: Workbench,
  snapshots: DataSnapshot[],
  unclassified: DataSnapshot[],
  legacyRequests: PendingRequest[] = [],
): DerivedPanel {
  const byId = new Map(snapshots.map((s) => [s.id, s]));
  const referenced = referencedSnapshotIds(wb);

  const equipmentCards: EquipmentCardModel[] = [];
  const groups: DerivedGroup[] = [];

  for (const eq of wb.equipments) {
    const lines: EquipmentLine[] = [];
    for (const an of eq.analyses) {
      const label = analysisLabel(an, eq.analyses);
      const dataSnapshots = an.cards
        .filter((c) => c.type === "data")
        .map((c) => byId.get(c.snapshotId))
        .filter((s): s is DataSnapshot => s !== undefined);
      const requests: PendingRequest[] = an.cards
        .filter((c) => c.type === "request")
        .map((c) => ({
          request: {
            queryKey: c.queryKey,
            label: c.label,
            ...(c.sql !== undefined ? { sql: c.sql } : {}),
            ...(c.columns !== undefined ? { columns: c.columns } : {}),
            ...(c.timeRange !== undefined ? { timeRange: c.timeRange } : {}),
          },
          originMessageId: JUDGE_ORIGIN,
          fulfilled: false,
        }));
      lines.push({
        key: an.id,
        start: "",
        end: "",
        category: label,
        status: dataSnapshots.length > 0 ? "filled" : "pending",
        tableCount: dataSnapshots.length,
        ...(requests[0] ? { requestKey: requests[0].request.queryKey } : {}),
      });
      groups.push({
        key: an.id,
        label: `${eq.name} · ${label}`,
        equipment: eq.name,
        snapshots: dataSnapshots,
        requests,
      });
    }
    equipmentCards.push({
      id: eq.id,
      equipment: eq.name,
      line: eq.line,
      descriptors: [],
      status: null,
      lines,
    });
  }

  // 미분류 — 트리가 참조하지 않는 스냅샷(세션 스코프 적용분) + 구식 요청.
  const leftovers = unclassified.filter((s) => !referenced.has(s.id));
  const leftoverRequests = legacyRequests.filter((r) => !r.fulfilled);
  if (leftovers.length > 0 || leftoverRequests.length > 0) {
    groups.push({
      key: UNCLASSIFIED_GROUP_KEY,
      label: "미분류",
      equipment: "미분류",
      snapshots: leftovers,
      requests: leftoverRequests,
    });
  }

  return { equipmentCards, groups };
}
