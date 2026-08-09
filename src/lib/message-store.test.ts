import { describe, expect, it } from "vitest";
import {
  groupMessagesByEquipment,
  labelFromRaw,
  migrateMessages,
  removeMessage,
  upsertMessage,
} from "./message-store";
import type { DataMessage } from "./types";

function msg(over: Partial<DataMessage>): DataMessage {
  return {
    id: "dmsg-1",
    label: "LotProcessResult",
    createdAt: "2026-08-09T00:00:00.000Z",
    raw: "LotProcessResult{eqpId=CVD-01}",
    json: { eqpId: "CVD-01" },
    ...over,
  };
}

describe("upsertMessage", () => {
  it("같은 원문 재판정은 정체를 유지한 채 본문만 갈아끼운다", () => {
    const first = msg({ id: "dmsg-1" });
    const list = [first];
    const again = msg({ id: "dmsg-2", comment: "새 코멘트" });
    const result = upsertMessage(list, again);
    expect(result.replacedExisting).toBe(true);
    expect(result.list).toHaveLength(1);
    // id·등록 시각은 기존 것 — 화면·저장소 참조가 끊기지 않는다.
    expect(result.stored.id).toBe("dmsg-1");
    expect(result.stored.comment).toBe("새 코멘트");
  });

  it("다른 원문은 새 항목이다", () => {
    const result = upsertMessage([msg({})], msg({ id: "dmsg-2", raw: "Other{a=1}" }));
    expect(result.replacedExisting).toBe(false);
    expect(result.list).toHaveLength(2);
  });
});

describe("groupMessagesByEquipment", () => {
  it("eqpId 로 묶고 없는 것은 미분류(빈 키) 한 묶음이다", () => {
    const groups = groupMessagesByEquipment([
      msg({ id: "a", eqpId: "CVD-01" }),
      msg({ id: "b", raw: "r2" }),
      msg({ id: "c", eqpId: "CVD-01", raw: "r3" }),
      msg({ id: "d", eqpId: "ETCH-02", raw: "r4" }),
    ]);
    expect(groups.map((g) => g.equipment)).toEqual(["CVD-01", "", "ETCH-02"]);
    expect(groups[0].messages.map((m) => m.id)).toEqual(["a", "c"]);
  });
});

describe("removeMessage", () => {
  it("id 로 지운다", () => {
    expect(removeMessage([msg({})], "dmsg-1")).toHaveLength(0);
  });
});

describe("labelFromRaw", () => {
  it("첫 줄 머리 40자 — 비면 '메시지'", () => {
    expect(labelFromRaw("Abc{x=1}\n2행")).toBe("Abc{x=1}");
    expect(labelFromRaw("   ")).toBe("메시지");
  });
});

describe("migrateMessages", () => {
  it("모양이 어긋난 항목은 조용히 버린다(부분 수용)", () => {
    const ok = msg({});
    const out = migrateMessages([ok, { id: "x" }, null, "junk"]);
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe("dmsg-1");
  });

  it("label 이 없으면 원문에서 만든다", () => {
    const out = migrateMessages([
      { id: "a", raw: "Kryo{q=1}", json: {}, createdAt: "t", label: "" },
    ]);
    expect(out[0].label).toBe("Kryo{q=1}");
  });
});
