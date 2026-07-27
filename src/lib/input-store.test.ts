import { describe, expect, it } from "vitest";
import {
  isFilled,
  openInputs,
  type PendingInput,
  receiveInputs,
  setInput,
  toChatInputs,
} from "@/lib/input-store";
import type { InputRequest } from "@/lib/types";

function req(over: Partial<InputRequest> = {}): InputRequest {
  return {
    skill: "fdc_trace_reading",
    key: "param_index",
    label: "PARAM_INDEX",
    ...over,
  };
}

function pending(over: Partial<InputRequest> = {}): PendingInput {
  return { request: req(over) };
}

describe("receiveInputs", () => {
  it("새 입력 요청은 목록에 붙는다", () => {
    const next = receiveInputs([], [req()]);
    expect(next).toHaveLength(1);
    expect(next[0].request.key).toBe("param_index");
  });

  it("같은 (skill,key) 는 다시 붙지 않는다", () => {
    const next = receiveInputs([pending()], [req()]);
    expect(next).toHaveLength(1);
  });

  it("스킬이 다르면 같은 key 여도 별개로 붙는다", () => {
    const next = receiveInputs([pending()], [req({ skill: "fdc_other" })]);
    expect(next).toHaveLength(2);
  });
});

describe("setInput / isFilled", () => {
  it("스킬 네임스페이스로 값을 넣고 채움 여부를 판정한다", () => {
    const values = setInput({}, "fdc_trace_reading", "param_index", "7");
    expect(isFilled(values, "fdc_trace_reading", "param_index")).toBe(true);
    expect(isFilled(values, "fdc_trace_reading", "start")).toBe(false);
  });

  it("공백은 안 채운 것으로 본다", () => {
    const values = setInput({}, "s", "k", "   ");
    expect(isFilled(values, "s", "k")).toBe(false);
  });

  it("같은 스킬의 다른 key 를 넣어도 기존 값은 보존된다", () => {
    const a = setInput({}, "s", "k1", "1");
    const b = setInput(a, "s", "k2", "2");
    expect(b.s.k1).toBe("1");
    expect(b.s.k2).toBe("2");
  });
});

describe("openInputs", () => {
  it("채워진 카드는 열린 목록에서 빠진다", () => {
    const list = [pending(), pending({ key: "start" })];
    const values = setInput({}, "fdc_trace_reading", "param_index", "7");
    const open = openInputs(list, values);
    expect(open).toHaveLength(1);
    expect(open[0].request.key).toBe("start");
  });
});

describe("toChatInputs", () => {
  it("담을 게 없으면 undefined", () => {
    expect(toChatInputs({})).toBeUndefined();
    expect(toChatInputs({ s: { k: "  " } })).toBeUndefined();
  });

  it("공백 값은 떨어내고 나머지만 남긴다", () => {
    const out = toChatInputs({ s: { k1: "1", k2: "" } });
    expect(out).toEqual({ s: { k1: "1" } });
  });
});
