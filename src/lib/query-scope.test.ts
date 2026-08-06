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
  description: "…",
  inputs: [{ key: "equipment", required: true }],
  needs: [
    {
      id: "reading_stats",
      what: "측정 분포",
      filledBy: [{ query: "reading_stats", column: "CNT" }],
    },
  ],
  queries: [
    {
      id: "reading_stats",
      // 조달 라벨 = 그것이 채우는 need 의 말. 줄 category 와 맞물리는 자리다.
      label: "측정 분포",
      sql: "SELECT 1",
      argBinds: {},
      priorQueryBinds: [],
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
  it("줄 자체가 담겼을 때만 참이다", () => {
    expect(hasLine([LINE_A1], LINE_A1.lineKey)).toBe(true);
    expect(hasEquipment([LINE_A1], "CVD-01")).toBe(false);
  });

  it("설비가 통째로 담긴 것은 여기 안 센다", () => {
    // 흡수는 화면에서 테두리 중첩으로 말한다 — 줄에도 표시하면 담긴 것은
    // 하나인데 표시가 여럿이 되어 트레이 칩 수와 어긋난다.
    expect(hasLine([EQ_A], LINE_A1.lineKey)).toBe(false);
  });
});

describe("toggleScope", () => {
  it("담긴 것을 다시 누르면 빠진다", () => {
    expect(toggleScope([EQ_A], EQ_A)).toEqual([]);
  });

  it("설비가 담긴 상태에서 그 줄을 누르면 그 줄로 좁힌다", () => {
    // "이 분석만 보겠다" — 통째로 빼버리는 것과는 다른 뜻이다.
    expect(toggleScope([EQ_A], LINE_A1)).toEqual([LINE_A1]);
  });

  it("좁힌 뒤 그 줄을 다시 누르면 빠진다", () => {
    expect(toggleScope(toggleScope([EQ_A], LINE_A1), LINE_A1)).toEqual([]);
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
