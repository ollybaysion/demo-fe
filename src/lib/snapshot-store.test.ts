import { describe, expect, it } from "vitest";
import {
  includedSnapshots,
  migrateSnapshots,
  pinnedSnapshots,
  removeSnapshot,
  toggleIncluded,
  togglePinned,
  upsertSnapshot,
} from "@/lib/snapshot-store";
import type { DataSnapshot } from "@/lib/types";

function snap(over: Partial<DataSnapshot> = {}): DataSnapshot {
  return {
    id: "snap-1",
    queryKey: "q1",
    label: "센서 목록",
    capturedAt: "2026-07-21T00:00:00.000Z",
    columns: ["A", "B"],
    rows: [["1", null]],
    contentHash: "a".repeat(64),
    included: false,
    pinned: false,
    warnings: ["INTEGRITY_ABSENT"],
    ...over,
  };
}

describe("upsertSnapshot", () => {
  it("새 내용은 뒤에 붙인다", () => {
    const list = [snap()];
    const next = snap({ id: "snap-2", contentHash: "b".repeat(64) });
    expect(upsertSnapshot(list, next).map((s) => s.id)).toEqual([
      "snap-1",
      "snap-2",
    ]);
  });

  it("같은 내용은 항목을 늘리지 않고 갱신한다", () => {
    const list = [snap({ label: "옛 이름", capturedAt: "2026-07-01T00:00:00.000Z" })];
    const next = snap({
      id: "snap-2",
      label: "새 이름",
      capturedAt: "2026-07-21T00:00:00.000Z",
    });
    const out = upsertSnapshot(list, next);

    expect(out).toHaveLength(1);
    expect(out[0].label).toBe("새 이름");
    expect(out[0].capturedAt).toBe("2026-07-21T00:00:00.000Z");
  });

  it("갱신해도 사용자가 쥔 토글과 항목 id 는 잇는다", () => {
    // 다시 붙여넣는 의도는 "이게 최신"이지 "설정을 초기화해라"가 아니다.
    const list = [snap({ included: true, pinned: true })];
    const out = upsertSnapshot(list, snap({ id: "snap-2", label: "새 이름" }));

    expect(out[0].id).toBe("snap-1");
    expect(out[0].included).toBe(true);
    expect(out[0].pinned).toBe(true);
  });

  it("갱신된 항목은 제자리를 지킨다", () => {
    const list = [
      snap({ id: "snap-1", contentHash: "a".repeat(64) }),
      snap({ id: "snap-2", contentHash: "b".repeat(64) }),
      snap({ id: "snap-3", contentHash: "c".repeat(64) }),
    ];
    const out = upsertSnapshot(
      list,
      snap({ id: "snap-9", contentHash: "b".repeat(64) }),
    );
    expect(out.map((s) => s.id)).toEqual(["snap-1", "snap-2", "snap-3"]);
  });
});

describe("토글 규칙", () => {
  it("📌 를 켜면 동봉도 켜진다", () => {
    const out = togglePinned([snap({ included: false })], "snap-1");
    expect(out[0]).toMatchObject({ pinned: true, included: true });
  });

  it("동봉을 끄면 📌 도 풀린다", () => {
    // 내용 푸시는 요청에 실려야 성립한다 — 동봉 없는 📌 는 의미가 없다.
    const out = toggleIncluded([snap({ included: true, pinned: true })], "snap-1");
    expect(out[0]).toMatchObject({ included: false, pinned: false });
  });

  it("동봉을 켜는 것만으로 📌 가 붙지는 않는다", () => {
    const out = toggleIncluded([snap({ included: false })], "snap-1");
    expect(out[0]).toMatchObject({ included: true, pinned: false });
  });

  it("다른 항목은 건드리지 않는다", () => {
    const list = [snap({ id: "snap-1" }), snap({ id: "snap-2" })];
    expect(toggleIncluded(list, "snap-1")[1].included).toBe(false);
  });
});

describe("선택 목록", () => {
  it("동봉된 것과 📌 된 것을 가른다", () => {
    const list = [
      snap({ id: "snap-1", included: false }),
      snap({ id: "snap-2", included: true }),
      snap({ id: "snap-3", included: true, pinned: true }),
    ];
    expect(includedSnapshots(list).map((s) => s.id)).toEqual([
      "snap-2",
      "snap-3",
    ]);
    expect(pinnedSnapshots(list).map((s) => s.id)).toEqual(["snap-3"]);
  });
});

describe("removeSnapshot", () => {
  it("id 로 지운다", () => {
    const list = [snap({ id: "snap-1" }), snap({ id: "snap-2" })];
    expect(removeSnapshot(list, "snap-1").map((s) => s.id)).toEqual(["snap-2"]);
  });
});

describe("migrateSnapshots", () => {
  it("배열이 아니면 빈 목록", () => {
    expect(migrateSnapshots(null)).toEqual([]);
    expect(migrateSnapshots({ nope: 1 })).toEqual([]);
  });

  it("깨진 항목만 버리고 나머지는 살린다", () => {
    // 한 항목의 손상이 사용자의 목록 전체를 날리면 안 된다.
    const out = migrateSnapshots([
      snap({ id: "snap-1" }),
      { id: "snap-2" }, // 필수 필드 없음
      snap({ id: "snap-3" }),
    ]);
    expect(out.map((s) => s.id)).toEqual(["snap-1", "snap-3"]);
  });

  it("셀 타입이 어긋난 행이 있으면 그 항목을 버린다", () => {
    expect(migrateSnapshots([snap({ rows: [[1 as never]] })])).toEqual([]);
  });

  it("동봉 없는 📌 는 읽는 시점에 바로잡는다", () => {
    const out = migrateSnapshots([snap({ included: false, pinned: true })]);
    expect(out[0].pinned).toBe(false);
  });

  it("라벨이 없으면 쿼리 키로 채운다", () => {
    const raw = { ...snap(), label: undefined };
    expect(migrateSnapshots([raw])[0].label).toBe("q1");
  });
});
