import { describe, expect, it } from "vitest";
import {
  addToScope,
  hasEquipment,
  hasLine,
  pruneScope,
  removeFromScope,
  type ScopeItem,
  scopeLabel,
  toChatScope,
  toggleScope,
} from "./query-scope";
import type { Skill, SkillSession } from "./skills";

const EQ_A: ScopeItem = { kind: "equipment", equipment: "CVD-01" };
const EQ_B: ScopeItem = { kind: "equipment", equipment: "CVD-02" };
const LINE_A1: ScopeItem = {
  kind: "analysis",
  equipment: "CVD-01",
  lineKey: "CVD-01||측정 분포",
  category: "측정 분포",
};
const LINE_B1: ScopeItem = {
  kind: "analysis",
  equipment: "CVD-02",
  lineKey: "CVD-02||측정 분포",
  category: "측정 분포",
};

const TRACE: Skill = {
  skill: "fdc_trace_reading",
  name: "fdc-trace-reading",
  unit: "센서",
  focus: "센서 측정값",
  description: "…",
  inputs: [{ key: "equipment", required: true }],
  steps: [
    {
      title: "1단계",
      produces: "측정 분포",
      sql: "SELECT 1",
      argBinds: {},
      priorStepBinds: [],
    },
  ],
};

function session(equipment: string, values: Record<string, string>): SkillSession {
  return { id: `s-${equipment}`, equipment, skill: TRACE, values };
}

describe("addToScope", () => {
  it("같은 것을 두 번 담지 않는다", () => {
    expect(addToScope([EQ_A], EQ_A)).toHaveLength(1);
  });

  it("설비를 담으면 그 설비의 분석 줄은 흡수된다", () => {
    // 둘 다 남기면 담긴 것과 보내는 것이 어긋나 보인다 — 같은 걸 두 번 말하는 셈.
    const next = addToScope([LINE_A1, LINE_B1], EQ_A);
    expect(next).toEqual([LINE_B1, EQ_A]);
  });

  it("설비가 이미 담겼으면 그 아래 줄은 담아도 아무 일 없다", () => {
    expect(addToScope([EQ_A], LINE_A1)).toEqual([EQ_A]);
  });

  it("다른 설비의 줄은 흡수되지 않는다", () => {
    expect(addToScope([EQ_A], LINE_B1)).toEqual([EQ_A, LINE_B1]);
  });
});

describe("hasLine", () => {
  it("설비가 통째로 담기면 그 아래 줄도 담긴 것이다", () => {
    expect(hasLine([EQ_A], "CVD-01", LINE_A1.lineKey)).toBe(true);
  });

  it("줄만 담긴 경우 그 줄만 담긴 것이다", () => {
    expect(hasLine([LINE_A1], "CVD-01", LINE_A1.lineKey)).toBe(true);
    expect(hasEquipment([LINE_A1], "CVD-01")).toBe(false);
  });
});

describe("toggleScope", () => {
  it("담긴 것을 다시 누르면 빠진다", () => {
    expect(toggleScope([EQ_A], EQ_A)).toEqual([]);
  });

  it("설비로 담긴 줄을 끄면 설비가 빠진다", () => {
    // 줄만 빼면 목록에 없는 것을 빼는 셈이라 아무 반응도 없어 보인다.
    expect(toggleScope([EQ_A], LINE_A1)).toEqual([]);
  });
});

describe("removeFromScope", () => {
  it("지정한 것만 뺀다", () => {
    expect(removeFromScope([EQ_A, EQ_B], EQ_A)).toEqual([EQ_B]);
  });
});

describe("pruneScope", () => {
  it("화면에서 사라진 대상은 걷어낸다", () => {
    expect(pruneScope([EQ_A, LINE_B1], ["CVD-01"], [])).toEqual([EQ_A]);
  });

  it("바뀐 게 없으면 같은 배열을 돌려준다", () => {
    // 렌더 중 정리라 참조가 바뀌면 상태 갱신이 끝없이 돈다.
    const scope = [EQ_A];
    expect(pruneScope(scope, ["CVD-01"], [])).toBe(scope);
  });
});

describe("scopeLabel", () => {
  it("분석은 설비 아래 한 단이라 경로로 적는다", () => {
    expect(scopeLabel(EQ_A)).toBe("CVD-01");
    expect(scopeLabel(LINE_A1)).toBe("CVD-01 › 측정 분포");
  });
});

describe("toChatScope", () => {
  it("담긴 게 없으면 필드 자체가 빠진다", () => {
    expect(toChatScope([], [])).toBeUndefined();
  });

  it("설비와 분석이 각자 자리로 나뉜다", () => {
    const out = toChatScope([EQ_A, LINE_B1], []);
    expect(out?.equipments).toEqual(["CVD-01"]);
    expect(out?.analyses?.[0]).toMatchObject({
      id: LINE_B1.lineKey,
      equipment: "CVD-02",
      focus: "측정 분포",
    });
  });

  it("그 줄을 세운 세션의 스킬·조회 키가 붙는다", () => {
    const out = toChatScope(
      [LINE_B1],
      [session("CVD-01", { days: "30" }), session("CVD-02", { days: "7" })],
    );
    expect(out?.analyses?.[0].skill).toBe("fdc_trace_reading");
    // 같은 스킬이어도 설비별로 값이 갈린다 — 그게 이 구조의 이유다.
    expect(out?.analyses?.[0].inputs).toEqual({ days: "7" });
  });

  it("세션 없이 생긴 줄(채팅 요청)은 스킬 없이 나간다", () => {
    const out = toChatScope([LINE_B1], []);
    expect(out?.analyses?.[0].skill).toBeUndefined();
    expect(out?.analyses?.[0].inputs).toBeUndefined();
  });
});
