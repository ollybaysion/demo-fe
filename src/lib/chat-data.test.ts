import { describe, expect, it } from "vitest";
import { toRunDecls } from "./chat-data";
import type { Skill, SkillSession } from "./skills";

const SKILL: Skill = {
  skill: "fdc_trace_reading",
  name: "fdc-trace-reading",
  unit: "센서",
  focus: "측정 분포",
  description: "테스트",
  inputs: [
    { key: "equipment", required: true },
    { key: "param_index", required: true },
  ],
  steps: [],
};

describe("toRunDecls", () => {
  it("세션이 없으면 선언도 없다 — 필드 자체가 빠진다", () => {
    expect(toRunDecls([])).toBeUndefined();
  });

  it("설비명이 채우는 인자를 채워 spec 이름으로 선언한다", () => {
    const session: SkillSession = {
      id: "s1",
      equipment: "CVD-01",
      skill: SKILL,
      values: { param_index: "7" },
    };
    expect(toRunDecls([session])).toEqual([
      {
        skill: "fdc-trace-reading",
        args: { param_index: "7", equipment: "CVD-01" },
      },
    ]);
  });
});
