import { describe, expect, it } from "vitest";
import { mockFormatMessage, sniffMessage } from "./message-mock";

const DUMP =
  "LotProcessResult{eqpId=CVD-01, lotId=LOT-24135, " +
  "recipe=RecipeInfo{recipeId=R-88, version=3}, " +
  "steps=[StepResult{stepNo=1, status=OK}]}";

describe("sniffMessage", () => {
  it("toString 덤프 모양만 후보다 — 표·문장은 즉시 탈락", () => {
    expect(sniffMessage(DUMP)).toBe(true);
    expect(sniffMessage("com.acme.Msg{a=1}")).toBe(true);
    expect(sniffMessage("COL_A\tCOL_B\n1\t2")).toBe(false);
    expect(sniffMessage("그냥 문장")).toBe(false);
    expect(sniffMessage("")).toBe(false);
  });
});

describe("mockFormatMessage", () => {
  it("최상위 k=v 만 평탄 분해하고 중첩 값은 문자열 그대로 둔다", () => {
    const out = mockFormatMessage(DUMP, false);
    expect(out).not.toBeNull();
    const json = out!.json as Record<string, string>;
    expect(json.eqpId).toBe("CVD-01");
    expect(json.lotId).toBe("LOT-24135");
    // 중첩은 문자열 — mock 이 결정론 파서(고도화 #66)를 앞지르지 않는다.
    expect(json.recipe).toBe("RecipeInfo{recipeId=R-88, version=3}");
    expect(json.steps).toBe("[StepResult{stepNo=1, status=OK}]");
    expect(out!.eqpId).toBe("CVD-01");
    expect(out!.className).toBe("LotProcessResult");
  });

  it("비메시지는 null(불가침) — force 면 스니프를 건너뛴다", () => {
    expect(mockFormatMessage("COL_A\tCOL_B\n1\t2", false)).toBeNull();
    const forced = mockFormatMessage("eqpId=CVD-02 alarm=AL-201", true);
    expect(forced).not.toBeNull();
    expect(forced!.json).toEqual({ raw: "eqpId=CVD-02 alarm=AL-201" });
  });
});
