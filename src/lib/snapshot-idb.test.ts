import { describe, expect, it } from "vitest";
import { applyOrder, computePersistPlan } from "@/lib/snapshot-idb";
import {
  removeSnapshot,
  setLabel,
  toggleIncluded,
  upsertSnapshot,
} from "@/lib/snapshot-store";
import type { DataSnapshot } from "@/lib/types";

function snap(id: string, overrides: Partial<DataSnapshot> = {}): DataSnapshot {
  return {
    id,
    queryKey: id,
    label: id,
    capturedAt: "2026-07-22T00:00:00.000Z",
    columns: ["A"],
    rows: [["1"]],
    contentHash: `hash-${id}`,
    included: true,
    warnings: [],
    ...overrides,
  };
}

describe("computePersistPlan", () => {
  it("변화 없음 → dirty 아님(쓰기 0)", () => {
    const list = [snap("a"), snap("b")];
    const plan = computePersistPlan(list, list);
    expect(plan.dirty).toBe(false);
    expect(plan.puts).toEqual([]);
    expect(plan.deletes).toEqual([]);
  });

  it("토글 하나 → 그 레코드만 put, 순서는 그대로", () => {
    const prev = [snap("a"), snap("b")];
    const next = toggleIncluded(prev, "b");
    const plan = computePersistPlan(prev, next);
    expect(plan.puts.map((s) => s.id)).toEqual(["b"]);
    expect(plan.deletes).toEqual([]);
    expect(plan.orderChanged).toBe(false);
    expect(plan.dirty).toBe(true);
  });

  it("라벨 변경 → 그 레코드만 put", () => {
    const prev = [snap("a"), snap("b"), snap("c")];
    const next = setLabel(prev, "b", "새 이름");
    expect(computePersistPlan(prev, next).puts.map((s) => s.id)).toEqual(["b"]);
  });

  it("삭제 → delete 만, 순서 변경으로 dirty", () => {
    const prev = [snap("a"), snap("b")];
    const next = removeSnapshot(prev, "a");
    const plan = computePersistPlan(prev, next);
    expect(plan.puts).toEqual([]);
    expect(plan.deletes).toEqual(["a"]);
    expect(plan.orderChanged).toBe(true);
  });

  it("추가 → 새 레코드만 put", () => {
    const prev = [snap("a")];
    const next = upsertSnapshot(prev, snap("b"));
    const plan = computePersistPlan(prev, next);
    expect(plan.puts.map((s) => s.id)).toEqual(["b"]);
    expect(plan.deletes).toEqual([]);
  });

  it("같은 내용 재등록(제자리 갱신) → 그 레코드만 put, 순서 그대로", () => {
    const prev = [snap("a"), snap("b")];
    const next = upsertSnapshot(
      prev,
      snap("a2", { contentHash: "hash-a", label: "다시 붙여넣음" }),
    );
    const plan = computePersistPlan(prev, next);
    // upsert 는 기존 id 를 잇는다 — put 대상도 기존 id 하나.
    expect(plan.puts.map((s) => s.id)).toEqual(["a"]);
    expect(plan.orderChanged).toBe(false);
  });

  it("전체 비우기 → 전부 delete", () => {
    const prev = [snap("a"), snap("b")];
    const plan = computePersistPlan(prev, []);
    expect(plan.deletes).toEqual(["a", "b"]);
    expect(plan.puts).toEqual([]);
    expect(plan.dirty).toBe(true);
  });
});

describe("applyOrder", () => {
  it("저장된 id 순서를 복원한다", () => {
    const list = [snap("a"), snap("b"), snap("c")];
    const out = applyOrder(list, ["c", "a", "b"]);
    expect(out.map((s) => s.id)).toEqual(["c", "a", "b"]);
  });

  it("순서 메타에 없는 항목은 뒤에 붙는다(데이터를 잃지 않는다)", () => {
    const list = [snap("a"), snap("b")];
    const out = applyOrder(list, ["b"]);
    expect(out.map((s) => s.id)).toEqual(["b", "a"]);
  });

  it("모르는 id·문자열 아닌 값은 무시한다", () => {
    const list = [snap("a")];
    const out = applyOrder(list, ["ghost", 7, null, "a"]);
    expect(out.map((s) => s.id)).toEqual(["a"]);
  });

  it("순서 메타가 없거나 손상이면 읽은 순서 그대로", () => {
    const list = [snap("a"), snap("b")];
    expect(applyOrder(list, undefined)).toEqual(list);
    expect(applyOrder(list, "corrupt")).toEqual(list);
  });
});
