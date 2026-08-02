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
import { equipmentInputKey } from "@/lib/skills";
import type { AnalysisCard, Workbench } from "@/lib/workbench-cards";
import { referencedSnapshotIds } from "@/lib/workbench-cards";
import type { EquipmentCardModel, EquipmentLine } from "./equipment-cards.mock";
import type { DerivedGroup, DerivedPanel } from "./derive-cards";

export const UNCLASSIFIED_GROUP_KEY = "unclassified";

/**
 * 분석 카드 제목은 **2줄**이다: 제목줄 = 스킬 이름, 둘째 줄 = 파라미터
 * ("snsr_id=B"). 수식어를 지어 붙이지 않고, 설비명이 채운 인자는 계층(설비
 * 카드 소속)이 이미 말하므로 뺀다.
 */
export function analysisParams(an: AnalysisCard): string | null {
  const eqKey = equipmentInputKey(an.skill);
  const parts = Object.entries(an.args)
    .filter(([k]) => k !== eqKey)
    .map(([k, v]) => `${k}=${v}`);
  return parts.length > 0 ? parts.join(", ") : null;
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
      const title = an.skill.name;
      const params = analysisParams(an);
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
        category: title,
        ...(params ? { sub: params } : {}),
        status: dataSnapshots.length > 0 ? "filled" : "pending",
        tableCount: dataSnapshots.length,
        ...(requests[0] ? { requestKey: requests[0].request.queryKey } : {}),
      });
      groups.push({
        key: an.id,
        label: `${eq.name} · ${title}`,
        ...(params ? { sublabel: params } : {}),
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
