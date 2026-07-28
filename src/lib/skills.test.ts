import { describe, expect, it } from "vitest";
import {
  equipmentInputKey,
  missingArgs,
  renderStepSql,
  skillDataRequests,
  skillExtraInputs,
  skillSummary,
  type Skill,
  type SkillSession,
} from "./skills";

const TRACE: Skill = {
  skill: "fdc_trace_reading",
  name: "fdc-trace-reading",
  unit: "센서",
  focus: "센서 측정값",
  description: "…",
  inputs: [
    { key: "equipment", required: true, description: "설비 ID" },
    { key: "param_index", required: true, description: "파라미터 인덱스" },
    { key: "start", required: true },
    { key: "end", required: true },
    { key: "note", required: false },
  ],
  steps: [
    {
      title: "1단계 — 구간 측정 집계",
      produces: "측정 분포",
      sql: "SELECT * FROM fdc_sensor_reading WHERE eqp_id = :eqp AND param_index = :pidx",
      argBinds: { eqp: "equipment", pidx: "param_index" },
      priorStepBinds: [],
    },
    {
      title: "2단계 — 앞 결과에 매인 조회",
      sql: "SELECT * FROM fdc_equipment WHERE eqp_id = :eqp",
      argBinds: {},
      priorStepBinds: ["eqp"],
    },
  ],
};

const SESSION: SkillSession = {
  id: "s1",
  equipment: "CVD-01",
  skill: TRACE,
  values: { equipment: "CVD-01" },
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
      unit: "센서",
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
  it("인자 괄호와 호출 지시 꼬리를 뗀다", () => {
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

describe("renderStepSql", () => {
  it("아는 값만 메우고 모르는 자리는 그대로 둔다", () => {
    const sql = renderStepSql(TRACE.steps[0], { equipment: "CVD-01" });
    expect(sql).toContain("eqp_id = 'CVD-01'");
    expect(sql).toContain("param_index = :pidx");
  });

  it("숫자는 따옴표 없이, 문자열의 홑따옴표는 이스케이프한다", () => {
    const sql = renderStepSql(TRACE.steps[0], {
      equipment: "O'BRIEN",
      param_index: "7",
    });
    expect(sql).toContain("eqp_id = 'O''BRIEN'");
    expect(sql).toContain("param_index = 7");
  });

  it("빈 값은 채운 것으로 치지 않는다", () => {
    const sql = renderStepSql(TRACE.steps[0], { equipment: "  " });
    expect(sql).toContain("eqp_id = :eqp");
  });
});

describe("missingArgs", () => {
  it("아직 못 채운 인자를 알려준다", () => {
    expect(missingArgs(TRACE.steps[0], { equipment: "CVD-01" })).toEqual([
      "param_index",
    ]);
  });
});

describe("skillDataRequests", () => {
  it("설비명은 등록 즉시 SQL 에 들어간다", () => {
    const [first] = skillDataRequests(SESSION);
    expect(first.sql).toContain("'CVD-01'");
    expect(first.label).toBe("CVD-01 · 측정 분포");
  });

  it("라벨이 '설비 · category' 라 파생이 그 설비 카드로 묶는다", () => {
    const [first] = skillDataRequests(SESSION);
    expect(first.label.startsWith("CVD-01 · ")).toBe(true);
  });

  it("채운 입력이 SQL 에 반영된다", () => {
    const [first] = skillDataRequests({
      ...SESSION,
      values: { ...SESSION.values, param_index: "7" },
    });
    expect(first.sql).toContain("param_index = 7");
  });

  it("앞 스텝 결과에 매인 스텝은 카드로 세우지 않는다", () => {
    // 사용자가 채울 수 없는 요구라, 세워두면 영영 안 걷힌다.
    expect(skillDataRequests(SESSION)).toHaveLength(1);
  });

  it("queryKey 는 설비까지 넣어 다른 설비와 겹치지 않는다", () => {
    const other: SkillSession = { ...SESSION, id: "s2", equipment: "CVD-02" };
    expect(skillDataRequests(SESSION)[0].queryKey).not.toBe(
      skillDataRequests(other)[0].queryKey,
    );
  });

  it("같은 스킬을 두 설비에 걸어도 값이 서로 안 섞인다", () => {
    // 값이 세션 안에 있는 이유 — 스킬로만 네임스페이스된 전역 맵에 두면 나중
    // 등록이 먼저 세워 둔 요청 카드의 SQL 까지 자기 값으로 바꿔 버린다.
    const a: SkillSession = {
      ...SESSION,
      values: { equipment: "CVD-01", param_index: "7" },
    };
    const b: SkillSession = {
      ...SESSION,
      id: "s2",
      equipment: "CVD-02",
      values: { equipment: "CVD-02", param_index: "9" },
    };
    expect(skillDataRequests(a)[0].sql).toContain("param_index = 7");
    expect(skillDataRequests(b)[0].sql).toContain("param_index = 9");
  });
});

