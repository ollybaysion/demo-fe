import { describe, expect, it } from "vitest";
import {
  equipmentInputKey,
  missingArgs,
  skillExtraInputs,
  skillSummary,
  type Skill,
} from "./skills";

const TRACE: Skill = {
  skill: "fdc_trace_reading",
  name: "fdc-trace-reading",
  description: "…",
  inputs: [
    { key: "equipment", required: true, description: "설비 ID" },
    { key: "param_index", required: true, description: "파라미터 인덱스" },
    { key: "start", required: true },
    { key: "end", required: true },
    { key: "note", required: false },
  ],
  needs: [
    {
      id: "reading_stats",
      what: "측정 분포",
      filledBy: [{ query: "reading_stats", column: "CNT" }],
    },
    {
      id: "source_equipment",
      what: "측정을 낸 설비",
      filledBy: [{ query: "equipment_row", column: "EQP_NAME" }],
    },
  ],
  queries: [
    {
      id: "reading_stats",
      label: "측정 분포",
      sql: "SELECT * FROM fdc_sensor_reading WHERE eqp_id = :eqp AND param_index = :pidx",
      argBinds: { eqp: "equipment", pidx: "param_index" },
      priorQueryBinds: [],
    },
    {
      id: "equipment_row",
      label: "측정을 낸 설비",
      sql: "SELECT * FROM fdc_equipment WHERE eqp_id = :eqp",
      argBinds: {},
      priorQueryBinds: ["eqp"],
    },
  ],
};

describe("equipmentInputKey", () => {
  it("설비명이 채울 인자를 찾는다", () => {
    expect(equipmentInputKey(TRACE)).toBe("equipment");
  });

  it("설비가 인자가 아닌 스킬은 null", () => {
    const sensorOnly: Skill = {
      ...TRACE,
      inputs: [{ key: "snsr_id", required: true }],
    };
    expect(equipmentInputKey(sensorOnly)).toBeNull();
  });
});

describe("skillExtraInputs", () => {
  it("설비명이 채우는 인자와 선택 인자는 빠진다", () => {
    expect(skillExtraInputs(TRACE).map((i) => i.key)).toEqual([
      "param_index",
      "start",
      "end",
    ]);
  });

  it("설비가 인자가 아닌 스킬은 필수 인자를 전부 묻는다", () => {
    // 대상은 언제나 설비다 — 센서 단위 스킬이라도 센서 키는 진입이 아니라
    // [시작] 뒤 2단에서 받는다.
    const sensorSkill: Skill = {
      ...TRACE,
      inputs: [
        { key: "snsr_id", required: true, description: "센서 키" },
        { key: "days", required: true },
        { key: "note", required: false },
      ],
    };
    expect(skillExtraInputs(sensorSkill).map((i) => i.key)).toEqual([
      "snsr_id",
      "days",
    ]);
  });
});

describe("skillSummary", () => {
  it("rephrasing 이 있으면 그것을 쓴다", () => {
    // 저자가 사람에게 쓴 문장이다 — 합성 description 보다 이 자리에 맞다.
    const skill: Skill = {
      ...TRACE,
      rephrasing: "이 센서의 측정이 어떤 분포로 나왔는지.",
      description: "특정 센서 측정값을 묻는 상황에서 호출한다 (equipment 필요).",
    };
    expect(skillSummary(skill)).toBe("이 센서의 측정이 어떤 분포로 나왔는지.");
  });

  it("rephrasing 이 없으면 인자 괄호와 호출 지시 꼬리를 뗀다", () => {
    const skill: Skill = {
      ...TRACE,
      description:
        "특정 센서 측정값이 어떻게 만들어졌는지 묻는 상황에서 호출한다 (equipment·param_index 필요).",
    };
    expect(skillSummary(skill)).toBe("특정 센서 측정값이 어떻게 만들어졌는지");
  });

  it("꼬리 앞의 목적격 조사도 같이 뗀다", () => {
    const skill: Skill = {
      ...TRACE,
      description: "특정 센서의 알람 발생 이력를 묻는 상황에서 호출한다 (snsr_id 필요).",
    };
    expect(skillSummary(skill)).toBe("특정 센서의 알람 발생 이력");
  });

  it("형식이 다르면 설명을 그대로 쓴다", () => {
    expect(skillSummary({ ...TRACE, description: "설명 한 줄" })).toBe(
      "설명 한 줄",
    );
  });
});

describe("missingArgs", () => {
  it("아직 못 채운 인자를 알려준다", () => {
    expect(missingArgs(TRACE.queries[0], { equipment: "CVD-01" })).toEqual([
      "param_index",
    ]);
  });

  it("빈 값은 채운 것으로 치지 않는다", () => {
    expect(missingArgs(TRACE.queries[0], { equipment: "  ", param_index: "7" }))
      .toEqual(["equipment"]);
  });
});
