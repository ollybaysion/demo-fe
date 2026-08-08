import { describe, expect, it } from "vitest";

import type { Skill } from "@/lib/skills";
import type { DataRequest, DataSnapshot } from "@/lib/types";
import {
  EMPTY_WORKBENCH,
  fulfillSlot,
  openAnalysis,
  removeEquipment,
} from "@/lib/workbench-cards";
import { deriveWorkbenchPanel, UNCLASSIFIED_GROUP_KEY } from "./workbench-derive";

/**
 * 원장 소비 — spec v3 에서 요청 카드의 진실원은 **서버**다. 화면은 상태대로
 * 그리기만 하고, 무엇을 감출지도 SQL 을 어떻게 완성할지도 판단하지 않는다.
 */

const SKILL: Skill = {
  skill: "fdc_explain_sensor",
  name: "fdc-explain-sensor",
  description: "센서 설명",
  inputs: [{ key: "snsr_id", required: true }],
  needs: [
    {
      id: "measure_kind",
      what: "무엇을 재는 센서인지",
      filledBy: [{ query: "sensor_row", column: "SNSR_TYPE_CD" }],
    },
  ],
  queries: [
    {
      id: "sensor_row",
      label: "무엇을 재는 센서인지",
      sql: "SELECT * FROM fdc_sensor WHERE snsr_id = :id",
      argBinds: { id: "snsr_id" },
      priorQueryBinds: [],
    },
    {
      id: "equipment_row",
      label: "그 설비의 이름과 모델",
      sql: "SELECT * FROM fdc_equipment WHERE eqp_id = :eqp",
      argBinds: {},
      priorQueryBinds: ["eqp"],
    },
  ],
};

const SENSOR_KEY = "fdc-explain-sensor#sensor_row__snsr_id=B";
const EQUIPMENT_KEY = "fdc-explain-sensor#equipment_row__snsr_id=B";

function seeded() {
  return openAnalysis(EMPTY_WORKBENCH, "CVD-01", "L1", SKILL, { snsr_id: "B" })
    .wb;
}

const RUN = { skill: "fdc-explain-sensor", args: { snsr_id: "B" } };

function row(
  queryKey: string,
  state: DataRequest["state"],
  extra: Partial<DataRequest> = {},
): DataRequest {
  return { queryKey, label: "조회", run: RUN, state, ...extra };
}

function snapshot(id: string): DataSnapshot {
  return {
    id,
    queryKey: SENSOR_KEY,
    label: "센서",
    columns: ["SNSR_ID"],
    rows: [["B"]],
    capturedAt: "2026-08-01T00:00",
  } as DataSnapshot;
}

describe("조달 원장 → 요청 카드", () => {
  it("원장이 없으면 요청 카드도 없다 — 화면이 SQL 을 지어내지 않는다", () => {
    const { groups } = deriveWorkbenchPanel(seeded(), [], []);
    expect(groups[0].requests).toEqual([]);
  });

  it("ready 는 SQL 과 함께 카드로 서고, inactive 는 안 선다", () => {
    const ledger = [
      row(SENSOR_KEY, "ready", { sql: "SELECT 1", label: "센서 기본" }),
      row(EQUIPMENT_KEY, "inactive"),
    ];
    const { groups } = deriveWorkbenchPanel(seeded(), [], [], [], ledger);
    expect(groups[0].requests).toHaveLength(1);
    expect(groups[0].requests[0].request.sql).toBe("SELECT 1");
    expect(groups[0].requests[0].request.label).toBe("센서 기본");
  });

  it("잠긴 줄은 사유와 함께 남는다 — 기다림과 포기가 화면에서 갈린다", () => {
    const ledger = [
      row(SENSOR_KEY, "blocked", { blocked: "sensor_row 결과가 먼저 필요합니다." }),
      row(EQUIPMENT_KEY, "unreachable", { blocked: "0행이라 이어갈 수 없습니다." }),
    ];
    const { groups } = deriveWorkbenchPanel(seeded(), [], [], [], ledger);
    expect(groups[0].requests.map((r) => r.request.state)).toEqual([
      "blocked",
      "unreachable",
    ]);
    expect(groups[0].requests[0].request.sql).toBeUndefined();
  });

  it("도착한 줄은 요청이 아니라 데이터로 선다", () => {
    const wb = fulfillSlot(seeded(), SENSOR_KEY, "snap-1");
    const ledger = [row(SENSOR_KEY, "arrived"), row(EQUIPMENT_KEY, "ready", { sql: "S" })];
    const { groups } = deriveWorkbenchPanel(
      wb,
      [snapshot("snap-1")],
      [],
      [],
      ledger,
    );
    expect(groups[0].snapshots.map((s) => s.id)).toEqual(["snap-1"]);
    expect(groups[0].requests.map((r) => r.request.queryKey)).toEqual([
      EQUIPMENT_KEY,
    ]);
  });

  it("본문이 죽은 참조는 도착이 아니다 — 허상은 세지 않는다", () => {
    const wb = fulfillSlot(seeded(), SENSOR_KEY, "snap-gone");
    const { groups } = deriveWorkbenchPanel(wb, [], [], [], []);
    expect(groups[0].snapshots).toEqual([]);
  });

  it("다른 절차의 원장 줄은 이 카드에 안 붙는다 — 소속은 run 이 정본", () => {
    const other = { skill: "fdc-explain-sensor", args: { snsr_id: "OTHER" } };
    const ledger = [
      {
        queryKey: "fdc-explain-sensor#sensor_row__snsr_id=OTHER",
        label: "남의 것",
        run: other,
        state: "ready" as const,
        sql: "SELECT 2",
      },
    ];
    const { groups } = deriveWorkbenchPanel(seeded(), [], [], [], ledger);
    expect(groups[0].requests).toEqual([]);
  });

  it("설비를 지우면 남은 본문은 미분류로 흐른다 — 데이터는 안 죽는다", () => {
    const wb = fulfillSlot(seeded(), SENSOR_KEY, "snap-1");
    const removed = removeEquipment(wb, "eq-cvd-01");
    const { equipmentCards, groups } = deriveWorkbenchPanel(
      removed,
      [snapshot("snap-1")],
      [snapshot("snap-1")],
    );
    expect(equipmentCards).toEqual([]);
    expect(groups.map((g) => g.key)).toEqual([UNCLASSIFIED_GROUP_KEY]);
    expect(groups[0].snapshots.map((s) => s.id)).toEqual(["snap-1"]);
  });

  it("카드 순서는 트리의 슬롯 순서를 따른다 — 판정마다 자리가 안 바뀐다", () => {
    const ledger = [
      row(EQUIPMENT_KEY, "ready", { sql: "B" }),
      row(SENSOR_KEY, "ready", { sql: "A" }),
    ];
    const { groups } = deriveWorkbenchPanel(seeded(), [], [], [], ledger);
    expect(groups[0].requests.map((r) => r.request.queryKey)).toEqual([
      SENSOR_KEY,
      EQUIPMENT_KEY,
    ]);
  });
});
