import { describe, expect, it } from "vitest";
import {
  autoLabel,
  includedSnapshots,
  migrateSnapshots,
  pinnedSnapshots,
  removeSnapshot,
  toChatPayload,
  toggleIncluded,
  togglePinned,
  upsertFulfilling,
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

describe("autoLabel", () => {
  it("선두 컬럼과 규모로 알아볼 수 있는 라벨을 만든다", () => {
    expect(autoLabel(["CHAMBER", "SENSOR_ID", "SENSOR_NAME"], 6)).toBe(
      "CHAMBER·SENSOR_ID 외 1컬럼 · 6행",
    );
  });

  it("컬럼이 둘 이하면 전부 표기한다", () => {
    expect(autoLabel(["A", "B"], 1)).toBe("A·B · 1행");
    expect(autoLabel(["A"], 0)).toBe("A · 0행");
  });
});

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

describe("upsertFulfilling — 요청 카드를 채우는 경로", () => {
  it("새 스냅샷은 동봉 + 📌 로 들어온다 — 충족은 내용 푸시다", () => {
    const out = upsertFulfilling([], snap({ included: false }));
    expect(out[0].included).toBe(true);
    expect(out[0].pinned).toBe(true);
  });

  it("이미 동봉 OFF 로 있던 같은 내용도 동봉 + 📌 로 바꾼다", () => {
    // 평소엔 사용자 토글을 보존하지만, 여기선 그게 함정이다 — 요청을 채웠는데도
    // 내용이 실리지 않으면(카탈로그만 가면) 모델은 값을 영영 보지 못한다.
    const existing = [snap({ id: "snap-1", included: false })];
    const out = upsertFulfilling(existing, snap({ id: "snap-2" }));
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe("snap-1");
    expect(out[0].included).toBe(true);
    expect(out[0].pinned).toBe(true);
  });

  it("다른 항목의 동봉 상태는 건드리지 않는다", () => {
    const list = [
      snap({ id: "snap-1", contentHash: "a".repeat(64), included: false }),
      snap({ id: "snap-2", contentHash: "b".repeat(64), included: false }),
    ];
    const out = upsertFulfilling(
      list,
      snap({ id: "snap-9", contentHash: "b".repeat(64) }),
    );
    expect(out.find((s) => s.id === "snap-1")?.included).toBe(false);
    expect(out.find((s) => s.id === "snap-2")?.included).toBe(true);
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

describe("toChatPayload", () => {
  it("동봉이 없으면 undefined — 필드 자체를 요청에서 빼기 위한 것", () => {
    // 빈 배열을 보내면 이 기능을 안 쓰는 요청의 본문이 달라진다.
    expect(toChatPayload([])).toBeUndefined();
    expect(toChatPayload([snap({ included: false })])).toBeUndefined();
  });

  it("동봉된 것만 싣는다", () => {
    const list = [
      snap({ id: "snap-1", queryKey: "q1", included: false }),
      snap({ id: "snap-2", queryKey: "q2", included: true }),
    ];
    const out = toChatPayload(list);
    expect(out?.map((s) => s.queryKey)).toEqual(["q2"]);
  });

  it("고정하지 않은 것은 내용 없이 카탈로그 항목으로만 나간다", () => {
    // 표 하나가 수천 행일 수 있어 기본은 머리말만 보낸다.
    const out = toChatPayload([snap({ included: true, pinned: false })]);
    expect(out?.[0].rows).toBeUndefined();
    expect(out?.[0]).toMatchObject({
      queryKey: "q1",
      label: "센서 목록",
      columns: ["A", "B"],
      rowCount: 1,
    });
  });

  it("📌 는 표 전문을 싣는다", () => {
    const out = toChatPayload([snap({ included: true, pinned: true })]);
    expect(out?.[0].rows).toEqual([["1", null]]);
  });

  it("행 수는 실제 행 배열에서 센다", () => {
    const out = toChatPayload([
      snap({ included: true, rows: [["1", "2"], ["3", "4"], ["5", "6"]] }),
    ]);
    expect(out?.[0].rowCount).toBe(3);
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
