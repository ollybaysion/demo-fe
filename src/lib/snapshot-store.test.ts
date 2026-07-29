import { describe, expect, it } from "vitest";
import {
  autoLabel,
  emptyResultHash,
  includedSnapshots,
  isEmptyResult,
  migrateSnapshots,
  removeSnapshot,
  setSourceSql,
  toChatPayload,
  toggleIncluded,
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
    warnings: ["INTEGRITY_ABSENT"],
    ...over,
  };
}

describe("autoLabel", () => {
  it("선두 컬럼 둘을 이름으로 쓴다 — 카운트는 칩·미리보기가 말하므로 넣지 않는다", () => {
    expect(autoLabel(["CHAMBER", "SENSOR_ID", "SENSOR_NAME"])).toBe(
      "CHAMBER · SENSOR_ID",
    );
  });

  it("컬럼이 둘 이하면 전부 표기한다", () => {
    expect(autoLabel(["A", "B"])).toBe("A · B");
    expect(autoLabel(["A"])).toBe("A");
  });
});

describe("setSourceSql", () => {
  it("쿼리를 달고, 앞뒤 공백은 접는다", () => {
    const list = [snap()];
    const next = setSourceSql(list, "snap-1", "  SELECT * FROM t  ");
    expect(next[0].sourceSql).toBe("SELECT * FROM t");
  });

  it("빈 값은 필드 자체를 지운다 — '쿼리 없음'의 표현은 부재 하나로", () => {
    const list = setSourceSql([snap()], "snap-1", "SELECT 1 FROM t");
    const cleared = setSourceSql(list, "snap-1", "   ");
    expect("sourceSql" in cleared[0]).toBe(false);
  });

  it("이미 없는데 지우면 참조를 보존한다 — 헛 쓰기를 만들지 않게", () => {
    const list = [snap()];
    expect(setSourceSql(list, "snap-1", undefined)[0]).toBe(list[0]);
  });

  it("다른 항목은 건드리지 않는다", () => {
    const other = snap({ id: "snap-2", contentHash: "b".repeat(64) });
    const next = setSourceSql([snap(), other], "snap-1", "SELECT 1 FROM t");
    expect(next[1]).toBe(other);
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

  it("갱신해도 사용자가 쥔 체크와 항목 id 는 잇는다", () => {
    // 다시 붙여넣는 의도는 "이게 최신"이지 "설정을 초기화해라"가 아니다.
    const list = [snap({ included: true })];
    const out = upsertSnapshot(list, snap({ id: "snap-2", label: "새 이름" }));

    expect(out[0].id).toBe("snap-1");
    expect(out[0].included).toBe(true);
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
  it("새 스냅샷은 체크된 채로 들어온다", () => {
    const out = upsertFulfilling([], snap({ included: false }));
    expect(out[0].included).toBe(true);
  });

  it("이미 체크 해제로 있던 같은 내용도 체크로 바꾼다", () => {
    // 평소엔 사용자 체크를 보존하지만, 여기선 그게 함정이다 — 요청을 채웠는데도
    // 요청에 실리지 않으면 영영 채워지지 않은 것으로 보인다.
    const existing = [snap({ id: "snap-1", included: false })];
    const out = upsertFulfilling(existing, snap({ id: "snap-2" }));
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe("snap-1");
    expect(out[0].included).toBe(true);
  });

  it("다른 항목의 체크 상태는 건드리지 않는다", () => {
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
  it("체크를 뒤집는다", () => {
    const out = toggleIncluded([snap({ included: false })], "snap-1");
    expect(out[0].included).toBe(true);
    expect(toggleIncluded(out, "snap-1")[0].included).toBe(false);
  });

  it("다른 항목은 건드리지 않는다", () => {
    const list = [snap({ id: "snap-1" }), snap({ id: "snap-2" })];
    expect(toggleIncluded(list, "snap-1")[1].included).toBe(false);
  });
});

describe("선택 목록", () => {
  it("체크된 것만 고른다", () => {
    const list = [
      snap({ id: "snap-1", included: false }),
      snap({ id: "snap-2", included: true }),
      snap({ id: "snap-3", included: true }),
    ];
    expect(includedSnapshots(list).map((s) => s.id)).toEqual([
      "snap-2",
      "snap-3",
    ]);
  });
});

describe("removeSnapshot", () => {
  it("id 로 지운다", () => {
    const list = [snap({ id: "snap-1" }), snap({ id: "snap-2" })];
    expect(removeSnapshot(list, "snap-1").map((s) => s.id)).toEqual(["snap-2"]);
  });
});

describe("toChatPayload", () => {
  it("체크가 없으면 undefined — 필드 자체를 요청에서 빼기 위한 것", () => {
    // 빈 배열을 보내면 이 기능을 안 쓰는 요청의 본문이 달라진다.
    expect(toChatPayload([])).toBeUndefined();
    expect(toChatPayload([snap({ included: false })])).toBeUndefined();
  });

  it("체크된 것만, 내용까지 싣는다", () => {
    // 체크했다는 건 근거로 쓰라는 뜻 — 카탈로그-온리 중간 상태는 없다.
    const list = [
      snap({ id: "snap-1", queryKey: "q1", included: false }),
      snap({ id: "snap-2", queryKey: "q2", included: true }),
    ];
    const out = toChatPayload(list);
    expect(out?.map((s) => s.queryKey)).toEqual(["q2"]);
    expect(out?.[0].rows).toEqual([["1", null]]);
    expect(out?.[0]).toMatchObject({
      label: "센서 목록",
      columns: ["A", "B"],
      rowCount: 1,
    });
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

  it("구버전이 남긴 pinned 필드는 조용히 버린다", () => {
    const raw = { ...snap({ included: true }), pinned: true };
    const out = migrateSnapshots([raw]);
    expect(out[0].included).toBe(true);
    expect("pinned" in out[0]).toBe(false);
  });

  it("라벨이 없으면 쿼리 키로 채운다", () => {
    const raw = { ...snap(), label: undefined };
    expect(migrateSnapshots([raw])[0].label).toBe("q1");
  });

  it("출처 쿼리는 살리고, 빈 문자열은 부재로 접는다", () => {
    const withSql = { ...snap(), sourceSql: "SELECT 1 FROM t" };
    const blankSql = { ...snap({ id: "snap-2" }), sourceSql: "  " };
    const out = migrateSnapshots([withSql, blankSql]);
    expect(out[0].sourceSql).toBe("SELECT 1 FROM t");
    expect("sourceSql" in out[1]).toBe(false);
  });
});

describe("결과 없음(0행) 스냅샷", () => {
  /** 요청 카드 [결과 없음] 이 만드는 모양 — 해석할 내용이 없어 rows 가 빈 배열이다. */
  function empty(queryKey: string, over: Partial<DataSnapshot> = {}): DataSnapshot {
    return snap({
      queryKey,
      rows: [],
      contentHash: emptyResultHash(queryKey),
      warnings: ["ZERO_ROWS"],
      ...over,
    });
  }

  it("0행은 '아직 안 받음'이 아니라 '없다는 사실'이다", () => {
    expect(isEmptyResult(empty("q1"))).toBe(true);
    expect(isEmptyResult(snap())).toBe(false);
  });

  it("조회가 다르면 컬럼이 같아도 각각 남는다 — 없음의 정체는 어느 조회인가다", () => {
    // 두 단계가 같은 컬럼을 내는 일은 흔하다(설비 조회는 어느 스킬에서든 같은 SELECT).
    // 내용으로만 접으면 뒤에 등록한 없음이 앞의 것을 덮어써, 한쪽 요청이 영영 안 채워진다.
    const list = upsertSnapshot([empty("skill#0__id=A")], empty("skill#1__id=A"));
    expect(list).toHaveLength(2);
    expect(list.map((s) => s.queryKey)).toEqual(["skill#0__id=A", "skill#1__id=A"]);
  });

  it("같은 조회를 다시 없음으로 등록하면 한 항목으로 접힌다", () => {
    const list = upsertSnapshot(
      [empty("skill#0__id=A", { capturedAt: "2026-07-01T00:00:00.000Z" })],
      empty("skill#0__id=A", { capturedAt: "2026-07-29T00:00:00.000Z" }),
    );
    expect(list).toHaveLength(1);
    expect(list[0].capturedAt).toBe("2026-07-29T00:00:00.000Z");
  });

  it("요청에 rows:[] 와 rowCount:0 으로 실린다 — 백엔드가 미첨부와 구분하는 신호", () => {
    const payload = toChatPayload([empty("skill#0__id=A", { included: true })]);
    expect(payload).toEqual([
      {
        queryKey: "skill#0__id=A",
        label: "센서 목록",
        capturedAt: "2026-07-21T00:00:00.000Z",
        columns: ["A", "B"],
        rowCount: 0,
        rows: [],
      },
    ]);
  });
});
