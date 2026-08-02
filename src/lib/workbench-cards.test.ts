import { describe, expect, it } from "vitest";

import type { Skill } from "./skills";
import {
  EMPTY_WORKBENCH,
  fulfillSlot,
  loadWorkbench,
  openAnalysis,
  ownerOfSnapshot,
  referencedSnapshotIds,
  removeAnalysis,
  removeEquipment,
  runRefOf,
  sameRun,
  saveWorkbench,
  slotQueryKey,
  slotViews,
  toRunDecls,
  upsertEquipment,
  type SnapshotLookup,
  type Workbench,
} from "./workbench-cards";

// 실 spec(fdc-explain-sensor)의 골격 — 1단계는 인자만, 2·3단계는 앞 단계
// 결과(EQP_ID)로 묶인다. queryKey·SQL 골든은 slot-resolve.test 가 진다.
const SKILL: Skill = {
  skill: "fdc_explain_sensor",
  name: "fdc-explain-sensor",
  unit: "센서",
  focus: "상태",
  description: "센서 설명",
  inputs: [{ key: "snsr_id", required: true }],
  steps: [
    {
      title: "1단계 — 센서 기본 정보",
      sql: "SELECT snsr_id, eqp_id FROM fdc_sensor WHERE snsr_id = :id",
      argBinds: { id: "snsr_id" },
      priorStepBinds: [],
      binds: { id: { from: "arg", arg: "snsr_id" } },
    },
    {
      title: "2단계 — 소속 설비",
      sql: "SELECT eqp_id, eqp_name FROM fdc_equipment WHERE eqp_id = :eqp",
      argBinds: {},
      priorStepBinds: ["eqp"],
      binds: { eqp: { from: "step", step: 0, column: "EQP_ID" } },
    },
  ],
} as Skill;

const STEP0_ROWS = { columns: ["SNSR_ID", "EQP_ID"], rows: [["B", "CVD-01"]] };

function lookupOf(map: Record<string, { columns: string[]; rows: (string | null)[][] }>): SnapshotLookup {
  return (id) => map[id];
}

function seeded(): { wb: Workbench; analysisId: string } {
  const { wb, analysis } = openAnalysis(
    EMPTY_WORKBENCH,
    "CVD-01",
    "L1",
    SKILL,
    { snsr_id: "B" },
  );
  return { wb, analysisId: analysis.id };
}

describe("설비 카드", () => {
  it("같은 이름은 같은 설비로 병합된다 — id 는 이름에서 결정적", () => {
    let wb = upsertEquipment(EMPTY_WORKBENCH, "CVD-01", null);
    wb = upsertEquipment(wb, "CVD-01", "L2");
    expect(wb.equipments).toHaveLength(1);
    expect(wb.equipments[0].line).toBe("L2");
  });

  it("라인을 안 고른 재등록이 앞서 고른 라인을 지우지 않는다", () => {
    let wb = upsertEquipment(EMPTY_WORKBENCH, "CVD-01", "L1");
    wb = upsertEquipment(wb, "CVD-01", null);
    expect(wb.equipments[0].line).toBe("L1");
  });
});

describe("분석 카드 — dataList 선생성", () => {
  it("개설하면 설비 안에 서고, 슬롯은 스킬 스텝 전량이 미리 만들어진다", () => {
    const { wb } = seeded();
    const an = wb.equipments[0].analyses[0];
    expect(an.args).toEqual({ snsr_id: "B" });
    expect(an.dataList.map((s) => s.title)).toEqual([
      "1단계 — 센서 기본 정보",
      "2단계 — 소속 설비",
    ]);
    expect(an.dataList.every((s) => s.snapshotId === undefined)).toBe(true);
    expect(an.attachments).toEqual([]);
  });

  it("같은 설비에 같은 run 을 다시 열면 기존 카드를 돌려준다", () => {
    const first = seeded();
    const again = openAnalysis(first.wb, "CVD-01", null, SKILL, {
      snsr_id: "B",
    });
    expect(again.analysis.id).toBe(first.analysisId);
    expect(again.wb.equipments[0].analyses).toHaveLength(1);
  });

  it("run 선언은 skills[0] 이름 + 시작 인자", () => {
    const { wb } = seeded();
    expect(toRunDecls(wb)).toEqual([
      { skill: "fdc-explain-sensor", args: { snsr_id: "B" } },
    ]);
    expect(toRunDecls(EMPTY_WORKBENCH)).toBeUndefined();
    const an = wb.equipments[0].analyses[0];
    expect(sameRun(runRefOf(an), { skill: "fdc-explain-sensor", args: { snsr_id: "B" } })).toBe(true);
    expect(sameRun(runRefOf(an), { skill: "fdc-explain-sensor", args: { snsr_id: "C" } })).toBe(false);
  });

  it("슬롯 queryKey 는 BE 표기(0-기반·필수 인자 이름표)와 같다", () => {
    const { wb } = seeded();
    const an = wb.equipments[0].analyses[0];
    expect(slotQueryKey(an, 0)).toBe("fdc-explain-sensor#0__snsr_id=B");
    expect(slotQueryKey(an, 1)).toBe("fdc-explain-sensor#1__snsr_id=B");
  });
});

describe("slotViews — 미정/요청/도착 파생", () => {
  it("개설 직후: 1단계는 요청(SQL 확정), 2단계는 미정(앞 단계 미도착)", () => {
    const { wb } = seeded();
    const views = slotViews(wb.equipments[0].analyses[0], lookupOf({}));
    expect(views[0]).toMatchObject({
      kind: "request",
      queryKey: "fdc-explain-sensor#0__snsr_id=B",
      sql: "SELECT snsr_id, eqp_id FROM fdc_sensor WHERE snsr_id = 'B'",
    });
    expect(views[1]).toMatchObject({ kind: "pending", reason: "upstream" });
  });

  it("1단계 도착 후: 1단계는 데이터, 2단계는 요청으로 파생된다", () => {
    const { wb } = seeded();
    const filled = fulfillSlot(wb, "fdc-explain-sensor#0__snsr_id=B", "snap-1");
    const views = slotViews(
      filled.equipments[0].analyses[0],
      lookupOf({ "snap-1": STEP0_ROWS }),
    );
    expect(views[0]).toMatchObject({ kind: "data", snapshotId: "snap-1" });
    expect(views[1]).toMatchObject({
      kind: "request",
      sql: "SELECT eqp_id, eqp_name FROM fdc_equipment WHERE eqp_id = 'CVD-01'",
    });
  });

  it("본문이 죽은 참조는 도착이 아니다 — 요청으로 되돌아간다(허상 정리 공짜)", () => {
    const { wb } = seeded();
    const filled = fulfillSlot(wb, "fdc-explain-sensor#0__snsr_id=B", "snap-1");
    // IDB 에서 완전 삭제됨 — lookup 이 못 찾는다.
    const views = slotViews(filled.equipments[0].analyses[0], lookupOf({}));
    expect(views[0]).toMatchObject({ kind: "request" });
    expect(views[1]).toMatchObject({ kind: "pending", reason: "upstream" });
  });

  it("1단계가 0행이면 2단계는 미정(empty-upstream) — 절차가 거기서 멈춘다", () => {
    const { wb } = seeded();
    const filled = fulfillSlot(wb, "fdc-explain-sensor#0__snsr_id=B", "snap-1");
    const views = slotViews(
      filled.equipments[0].analyses[0],
      lookupOf({ "snap-1": { columns: ["SNSR_ID", "EQP_ID"], rows: [] } }),
    );
    expect(views[0]).toMatchObject({ kind: "data" });
    expect(views[1]).toMatchObject({ kind: "pending", reason: "empty-upstream" });
  });
});

describe("fulfillSlot", () => {
  it("queryKey 가 가리키는 슬롯에 앉고, 재등록은 참조만 갱신된다", () => {
    const { wb } = seeded();
    let next = fulfillSlot(wb, "fdc-explain-sensor#0__snsr_id=B", "snap-1");
    next = fulfillSlot(next, "fdc-explain-sensor#0__snsr_id=B", "snap-2");
    const an = next.equipments[0].analyses[0];
    expect(an.dataList[0].snapshotId).toBe("snap-2");
    expect(an.dataList[1].snapshotId).toBeUndefined();
  });

  it("어느 슬롯과도 안 맞는 키는 트리를 건드리지 않는다 — 소속을 지어내지 않는다", () => {
    const { wb } = seeded();
    const next = fulfillSlot(wb, "unknown#0", "snap-1");
    expect(next).toEqual(wb);
  });
});

describe("cascade 삭제·역인덱스", () => {
  it("분석 삭제는 슬롯 참조도 함께 걷는다", () => {
    const { wb, analysisId } = seeded();
    const filled = fulfillSlot(wb, "fdc-explain-sensor#0__snsr_id=B", "snap-1");
    const removed = removeAnalysis(filled, analysisId);
    expect(removed.equipments[0].analyses).toHaveLength(0);
    expect(referencedSnapshotIds(removed).size).toBe(0);
  });

  it("설비 삭제는 분석까지 함께 사라진다", () => {
    const { wb } = seeded();
    const removed = removeEquipment(wb, "eq-cvd-01");
    expect(removed.equipments).toHaveLength(0);
  });

  it("referencedSnapshotIds / ownerOfSnapshot 이 슬롯 참조를 본다", () => {
    const { wb, analysisId } = seeded();
    const filled = fulfillSlot(wb, "fdc-explain-sensor#0__snsr_id=B", "snap-1");
    expect([...referencedSnapshotIds(filled)]).toEqual(["snap-1"]);
    const owner = ownerOfSnapshot(filled, "snap-1");
    expect(owner?.equipment.name).toBe("CVD-01");
    expect(owner?.analysis.id).toBe(analysisId);
    expect(ownerOfSnapshot(filled, "snap-x")).toBeNull();
  });
});

describe("영속", () => {
  function withStorage(seed: Record<string, string>, run: () => void) {
    const store = new Map(Object.entries(seed));
    const shim = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    };
    const prev = (globalThis as { localStorage?: unknown }).localStorage;
    Object.defineProperty(globalThis, "localStorage", {
      value: shim,
      configurable: true,
    });
    try {
      run();
    } finally {
      Object.defineProperty(globalThis, "localStorage", {
        value: prev,
        configurable: true,
      });
    }
  }

  it("저장 → 복원 왕복이 트리를 보존한다", () => {
    withStorage({}, () => {
      const { wb } = seeded();
      const filled = fulfillSlot(wb, "fdc-explain-sensor#0__snsr_id=B", "snap-1");
      saveWorkbench(filled);
      const back = loadWorkbench();
      expect(back).toEqual(filled);
    });
  });

  it("구식 저장분(skill 단수 + cards 세대)은 슬롯 세대로 이관된다", () => {
    const legacy = {
      equipments: [
        {
          id: "eq-cvd-01",
          name: "CVD-01",
          line: "L1",
          analyses: [
            {
              id: "an_old",
              skill: SKILL,
              args: { snsr_id: "B" },
              cards: [
                {
                  type: "data",
                  id: "card-1",
                  queryKey: "fdc-explain-sensor#0__snsr_id=B",
                  label: "1단계",
                  snapshotId: "snap-old",
                },
                {
                  type: "request",
                  id: "card-2",
                  queryKey: "fdc-explain-sensor#1__snsr_id=B",
                  label: "2단계",
                },
              ],
            },
          ],
        },
      ],
    };
    withStorage({ "fdc.workbench.v1": JSON.stringify(legacy) }, () => {
      const back = loadWorkbench();
      const an = back.equipments[0].analyses[0];
      expect(an.skills[0].name).toBe("fdc-explain-sensor");
      // data 카드 참조는 스텝 자리로 옮겨 앉고, request 카드는 파생이라 버린다.
      expect(an.dataList[0].snapshotId).toBe("snap-old");
      expect(an.dataList[1].snapshotId).toBeUndefined();
    });
  });

  it("깨진 저장분은 빈 작업판 — 부분 수용", () => {
    withStorage({ "fdc.workbench.v1": "{broken" }, () => {
      expect(loadWorkbench()).toEqual(EMPTY_WORKBENCH);
    });
  });
});
