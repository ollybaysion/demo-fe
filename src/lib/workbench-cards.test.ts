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
  toRunDecls,
  upsertEquipment,
  type Workbench,
} from "./workbench-cards";

// 실 spec(fdc-explain-sensor)의 골격 — sensor_row 는 인자만, equipment_row 는 앞
// 조회 결과(EQP_ID)로 묶인다. 다만 **그 판정은 여기 없다**: 실행 가능 여부와 SQL 은
// BE 조달 원장이 준다. 트리는 자리와 이름만 안다.
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
    {
      id: "equipment_identity",
      what: "그 설비의 이름과 모델",
      filledBy: [{ query: "equipment_row", column: "EQP_NAME" }],
    },
  ],
  queries: [
    {
      id: "sensor_row",
      label: "무엇을 재는 센서인지",
      sql: "SELECT snsr_id, eqp_id FROM fdc_sensor WHERE snsr_id = :id",
      argBinds: { id: "snsr_id" },
      priorQueryBinds: [],
      binds: { id: { from: "arg", arg: "snsr_id" } },
    },
    {
      id: "equipment_row",
      label: "그 설비의 이름과 모델",
      sql: "SELECT eqp_id, eqp_name FROM fdc_equipment WHERE eqp_id = :eqp",
      argBinds: {},
      priorQueryBinds: ["eqp"],
      binds: { eqp: { from: "query", query: "sensor_row", column: "EQP_ID" } },
    },
  ],
};

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
  it("개설하면 설비 안에 서고, 슬롯은 조달 수단 전량이 미리 만들어진다", () => {
    const { wb } = seeded();
    const an = wb.equipments[0].analyses[0];
    expect(an.args).toEqual({ snsr_id: "B" });
    expect(an.dataList.map((s) => s.queryId)).toEqual([
      "sensor_row",
      "equipment_row",
    ]);
    // 라벨은 조회 이름이 아니라 그 조회가 답에 기여하는 것이다.
    expect(an.dataList.map((s) => s.label)).toEqual([
      "무엇을 재는 센서인지",
      "그 설비의 이름과 모델",
    ]);
    // SQL·배선은 슬롯에 없다 — 실행 판단은 BE 원장 소관이다.
    expect(an.dataList[0]).not.toHaveProperty("sql");
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

  it("슬롯 queryKey 는 BE 표기(조달 id·필수 인자 이름표)와 같다", () => {
    // 가운데가 스텝 인덱스가 아니라 조달 id 다 — 목록 재배열이 남의 조회를
    // 가리키게 하면 안 된다.
    const { wb } = seeded();
    const an = wb.equipments[0].analyses[0];
    expect(slotQueryKey(an, "sensor_row")).toBe(
      "fdc-explain-sensor#sensor_row__snsr_id=B",
    );
    expect(slotQueryKey(an, "equipment_row")).toBe(
      "fdc-explain-sensor#equipment_row__snsr_id=B",
    );
  });

  it("이름표의 구분자는 접는다 — 키가 깨지지 않게", () => {
    const { wb } = openAnalysis(EMPTY_WORKBENCH, "CVD-01", null, SKILL, {
      snsr_id: "A#B&C=D",
    });
    expect(slotQueryKey(wb.equipments[0].analyses[0], "sensor_row")).toBe(
      "fdc-explain-sensor#sensor_row__snsr_id=A_B_C_D",
    );
  });
});

describe("fulfillSlot", () => {
  it("queryKey 가 가리키는 슬롯에 앉고, 재등록은 참조만 갱신된다", () => {
    const { wb } = seeded();
    let next = fulfillSlot(wb, "fdc-explain-sensor#sensor_row__snsr_id=B", "snap-1");
    next = fulfillSlot(next, "fdc-explain-sensor#sensor_row__snsr_id=B", "snap-2");
    const an = next.equipments[0].analyses[0];
    expect(an.dataList[0].snapshotId).toBe("snap-2");
    expect(an.dataList[1].snapshotId).toBeUndefined();
  });

  it("어느 슬롯과도 안 맞는 키는 트리를 건드리지 않는다 — 소속을 지어내지 않는다", () => {
    const { wb } = seeded();
    const next = fulfillSlot(wb, "unknown#nope", "snap-1");
    expect(next).toEqual(wb);
  });
});

describe("cascade 삭제·역인덱스", () => {
  it("분석 삭제는 슬롯 참조도 함께 걷는다", () => {
    const { wb, analysisId } = seeded();
    const filled = fulfillSlot(wb, "fdc-explain-sensor#sensor_row__snsr_id=B", "snap-1");
    const removed = removeAnalysis(filled, analysisId);
    expect(removed.equipments[0].analyses).toHaveLength(0);
    expect(referencedSnapshotIds(removed).size).toBe(0);
  });

  it("설비 삭제는 분석까지 함께 사라진다", () => {
    const { wb } = seeded();
    const filled = fulfillSlot(wb, "fdc-explain-sensor#sensor_row__snsr_id=B", "snap-1");
    const removed = removeEquipment(filled, "eq-cvd-01");
    expect(removed.equipments).toHaveLength(0);
    expect(referencedSnapshotIds(removed).size).toBe(0);
  });

  it("referencedSnapshotIds / ownerOfSnapshot 이 슬롯 참조를 본다", () => {
    const { wb, analysisId } = seeded();
    const filled = fulfillSlot(wb, "fdc-explain-sensor#sensor_row__snsr_id=B", "snap-1");
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
      const filled = fulfillSlot(wb, "fdc-explain-sensor#sensor_row__snsr_id=B", "snap-1");
      saveWorkbench(filled);
      const back = loadWorkbench();
      expect(back).toEqual(filled);
    });
  });

  it("옛 세대 저장분(v1)은 읽지 않는다 — 조회 키가 다른 것을 가리킨다", () => {
    // 스텝 인덱스(`#0`)로 앉힌 참조는 조달 id 세대에서 어느 조회도 아니다.
    // 옮길 대응이 없으므로 버린다 — 새 등록이 곧바로 자리를 채운다.
    const legacy = {
      equipments: [
        {
          id: "eq-cvd-01",
          name: "CVD-01",
          line: "L1",
          analyses: [
            {
              id: "an_old",
              skills: [SKILL],
              args: { snsr_id: "B" },
              dataList: [
                { title: "1단계", sql: "…", binds: {}, snapshotId: "snap-old" },
              ],
            },
          ],
        },
      ],
    };
    withStorage({ "fdc.workbench.v1": JSON.stringify(legacy) }, () => {
      expect(loadWorkbench()).toEqual(EMPTY_WORKBENCH);
    });
  });

  it("모양이 어긋난 슬롯은 버리고 나머지는 산다 — 부분 수용", () => {
    const { wb } = seeded();
    const tampered = {
      equipments: [
        {
          ...wb.equipments[0],
          analyses: [
            {
              ...wb.equipments[0].analyses[0],
              dataList: [
                { queryId: "sensor_row", label: "센서" },
                { label: "id 가 없다" },
              ],
            },
          ],
        },
      ],
    };
    withStorage({ "fdc.workbench.v2": JSON.stringify(tampered) }, () => {
      const back = loadWorkbench();
      expect(back.equipments[0].analyses[0].dataList).toHaveLength(1);
    });
  });

  it("깨진 저장분은 빈 작업판", () => {
    withStorage({ "fdc.workbench.v2": "{broken" }, () => {
      expect(loadWorkbench()).toEqual(EMPTY_WORKBENCH);
    });
  });
});
