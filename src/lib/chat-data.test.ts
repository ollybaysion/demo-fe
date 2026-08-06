import { describe, expect, it } from "vitest";
import type { Skill } from "./skills";
import { EMPTY_WORKBENCH, openAnalysis, toRunDecls } from "./workbench-cards";

const SKILL: Skill = {
  skill: "fdc_trace_reading",
  name: "fdc-trace-reading",
  description: "테스트",
  inputs: [
    { key: "equipment", required: true },
    { key: "param_index", required: true },
  ],
  needs: [],
  queries: [],
};

describe("toRunDecls (작업판 트리)", () => {
  it("분석 카드가 없으면 선언도 없다 — 필드 자체가 빠진다", () => {
    expect(toRunDecls(EMPTY_WORKBENCH)).toBeUndefined();
  });

  it("설비명이 채우는 인자를 채워 spec 이름으로 선언한다", () => {
    const { wb } = openAnalysis(EMPTY_WORKBENCH, "CVD-01", null, SKILL, {
      param_index: "7",
    });
    expect(toRunDecls(wb)).toEqual([
      {
        skill: "fdc-trace-reading",
        args: { equipment: "CVD-01", param_index: "7" },
      },
    ]);
  });
});
