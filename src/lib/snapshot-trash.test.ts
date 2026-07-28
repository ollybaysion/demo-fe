import { describe, expect, it } from "vitest";
import {
  includedSnapshots,
  liveSnapshots,
  migrateSnapshots,
  restoreSnapshot,
  trashSnapshot,
  trashedSnapshots,
} from "@/lib/snapshot-store";
import type { DataSnapshot } from "@/lib/types";

function snap(id: string, included = true): DataSnapshot {
  return {
    id,
    queryKey: id,
    label: `표 ${id}`,
    capturedAt: "2026-07-29T00:00:00.000Z",
    columns: ["A"],
    rows: [["1"]],
    contentHash: id.repeat(4),
    included,
    warnings: [],
  };
}

const AT = "2026-07-29T01:00:00.000Z";

describe("휴지통", () => {
  it("버리면 목록에서 빠지고 휴지통에 남는다", () => {
    const after = trashSnapshot([snap("a"), snap("b")], "a", AT);
    expect(liveSnapshots(after).map((s) => s.id)).toEqual(["b"]);
    expect(trashedSnapshots(after).map((s) => s.id)).toEqual(["a"]);
  });

  it("버린 것은 요청에 실리지 않는다 — 체크돼 있었더라도", () => {
    const after = trashSnapshot([snap("a"), snap("b")], "a", AT);
    // 지운 데이터가 계속 동봉되면 "지웠는데 답이 그걸 근거로 말하는" 일이 난다.
    expect(includedSnapshots(after).map((s) => s.id)).toEqual(["b"]);
  });

  it("되돌리면 목록으로 돌아온다 — 동봉은 꺼진 채로", () => {
    const back = restoreSnapshot(trashSnapshot([snap("a")], "a", AT), "a");
    expect(liveSnapshots(back).map((s) => s.id)).toEqual(["a"]);
    expect(back[0].deletedAt).toBeUndefined();
    expect(back[0].included).toBe(false);
  });

  it("휴지통은 새로고침을 넘긴다 — deletedAt 이 저장소에서 살아 온다", () => {
    const stored = JSON.parse(
      JSON.stringify(trashSnapshot([snap("a")], "a", AT)),
    ) as unknown;
    // 접기가 deletedAt 을 떨어뜨리면 버린 것이 전부 목록으로 돌아온다.
    expect(trashedSnapshots(migrateSnapshots(stored)).map((s) => s.id)).toEqual([
      "a",
    ]);
  });

  it("최근에 버린 것이 위로 온다", () => {
    const one = trashSnapshot([snap("a"), snap("b")], "a", AT);
    const two = trashSnapshot(one, "b", "2026-07-29T02:00:00.000Z");
    expect(trashedSnapshots(two).map((s) => s.id)).toEqual(["b", "a"]);
  });
});
