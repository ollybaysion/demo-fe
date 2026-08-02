import { describe, expect, it } from "vitest";
import {
  clearFulfilled,
  clearOrigin,
  fulfilledForOrigin,
  isFulfilledBy,
  JUDGE_ORIGIN,
  markFulfilled,
  openRequests,
  receiveRequests,
  reconcileRequests,
  tableFromSql,
  type PendingRequest,
} from "@/lib/request-store";
import type { DataRequest, DataSnapshot } from "@/lib/types";

function req(over: Partial<DataRequest> = {}): DataRequest {
  return { queryKey: "sensor_list", label: "챔버별 센서 목록", ...over };
}

function pending(over: Partial<PendingRequest> = {}): PendingRequest {
  return { request: req(), originMessageId: "u1", fulfilled: false, ...over };
}

function snap(over: Partial<DataSnapshot> = {}): DataSnapshot {
  return {
    id: "snap-1",
    queryKey: "sensor_list",
    label: "챔버별 센서 목록",
    capturedAt: "2026-07-21T00:00:00.000Z",
    columns: ["A"],
    rows: [["1"]],
    contentHash: "a".repeat(64),
    included: true,
    warnings: [],
    ...over,
  };
}

describe("receiveRequests", () => {
  it("새 요청은 목록에 붙고 낳은 메시지를 기억한다", () => {
    const next = receiveRequests([], [req()], "u1");
    expect(next).toHaveLength(1);
    expect(next[0]!.originMessageId).toBe("u1");
    expect(next[0]!.fulfilled).toBe(false);
  });

  it("같은 queryKey 재수신은 1건으로 유지한다", () => {
    const list = receiveRequests([], [req()], "u1");
    const next = receiveRequests(list, [req({ label: "다른 라벨" })], "u2");
    expect(next).toHaveLength(1);
    // 기존 것이 살아남는다 — 이미 채워둔 진행 상태를 재수신이 되돌리면 안 된다.
    expect(next[0]!.request.label).toBe("챔버별 센서 목록");
    expect(next[0]!.originMessageId).toBe("u1");
    expect(next).toBe(list);
  });

  it("여러 요청 중 새 것만 추가한다", () => {
    const list = receiveRequests([], [req()], "u1");
    const next = receiveRequests(
      list,
      [req(), req({ queryKey: "recipe_steps", label: "레시피" })],
      "u2",
    );
    expect(next.map((p) => p.request.queryKey)).toEqual([
      "sensor_list",
      "recipe_steps",
    ]);
  });
});

describe("reconcileRequests", () => {
  it("서버가 준 전체 목록으로 바꾼다 — 회귀(사라졌던 카드 부활)도 자연히 된다", () => {
    const prev = [pending()];
    const next = reconcileRequests(prev, [
      req({ queryKey: "other#0", label: "다른 조회" }),
    ]);
    expect(next).toHaveLength(1);
    expect(next[0].request.queryKey).toBe("other#0");
    expect(next[0].originMessageId).toBe(JUDGE_ORIGIN);
  });

  it("내용이 같은 카드는 항목 정체를 유지한다 — 불필요한 다시 그리기 방지", () => {
    const prev = [pending()];
    const next = reconcileRequests(prev, [req()]);
    expect(next).toBe(prev);
  });

  it("같은 키라도 SQL 이 갱신되면 서버 것으로 바꾼다 — additive 가 못 하던 일", () => {
    const prev = [pending({ request: req({ sql: "SELECT 1" }) })];
    const next = reconcileRequests(prev, [req({ sql: "SELECT 2" })]);
    expect(next[0].request.sql).toBe("SELECT 2");
    expect(next[0].originMessageId).toBe(JUDGE_ORIGIN);
  });

  it("빈 목록이면 카드가 전부 걷힌다 — 열려 있어야 할 것이 없다는 판정이다", () => {
    expect(reconcileRequests([pending()], [])).toEqual([]);
  });
});

describe("markFulfilled / openRequests", () => {
  it("채워진 요청은 패널 카드 목록에서 빠진다", () => {
    const list = [pending(), pending({ request: req({ queryKey: "recipe_steps" }) })];
    const next = markFulfilled(list, "sensor_list");
    expect(openRequests(next).map((p) => p.request.queryKey)).toEqual([
      "recipe_steps",
    ]);
  });

  it("모르는 키는 아무것도 바꾸지 않는다", () => {
    const list = [pending()];
    expect(markFulfilled(list, "없는키")).toEqual(list);
  });
});

describe("fulfilledForOrigin", () => {
  it("그 질문에서 비롯돼 채워진 것만 고른다", () => {
    const list = [
      pending({ fulfilled: true }),
      pending({
        request: req({ queryKey: "recipe_steps" }),
        originMessageId: "u2",
        fulfilled: true,
      }),
      pending({ request: req({ queryKey: "alarms" }) }),
    ];
    expect(fulfilledForOrigin(list, "u1").map((p) => p.request.queryKey)).toEqual(
      ["sensor_list"],
    );
  });

  it("아직 안 채워졌으면 다시 분석 버튼이 뜨지 않는다", () => {
    expect(fulfilledForOrigin([pending()], "u1")).toEqual([]);
  });
});

describe("clearOrigin", () => {
  it("다시 분석한 질문의 요청은 전부 걷어낸다", () => {
    const list = [
      pending({ fulfilled: true }),
      pending({ request: req({ queryKey: "recipe_steps" }) }),
      pending({ request: req({ queryKey: "alarms" }), originMessageId: "u2" }),
    ];
    expect(clearOrigin(list, "u1").map((p) => p.request.queryKey)).toEqual([
      "alarms",
    ]);
  });
});

describe("clearFulfilled", () => {
  it("충족된 것만 걷어낸다 — 열린 요청은 발화 후에도 남는다", () => {
    const list = [
      pending({ fulfilled: true }),
      pending({
        request: req({ queryKey: "recipe_steps" }),
        originMessageId: "u2",
      }),
    ];
    expect(clearFulfilled(list).map((p) => p.request.queryKey)).toEqual([
      "recipe_steps",
    ]);
  });
});

describe("isFulfilledBy", () => {
  it("같은 queryKey 가 동봉돼 있으면 충족", () => {
    expect(isFulfilledBy([snap()], "sensor_list")).toBe(true);
  });

  it("보관만 하고 동봉을 끄면 충족이 아니다", () => {
    expect(isFulfilledBy([snap({ included: false })], "sensor_list")).toBe(false);
  });

  it("다른 키는 충족이 아니다", () => {
    expect(isFulfilledBy([snap()], "recipe_steps")).toBe(false);
  });
});

describe("tableFromSql", () => {
  it("첫 FROM 의 테이블명을 대문자로 뽑는다", () => {
    expect(
      tableFromSql("SELECT a, b\n  FROM fdc_sensor_master\n WHERE x = 1"),
    ).toBe("FDC_SENSOR_MASTER");
  });

  it("스키마 접두사는 남긴다 — 그대로가 정보다", () => {
    expect(tableFromSql("select * from FDC.SENSOR_MASTER")).toBe(
      "FDC.SENSOR_MASTER",
    );
  });

  it("서브쿼리는 추측하지 않는다", () => {
    expect(tableFromSql("SELECT * FROM (SELECT 1 FROM dual)")).toBeUndefined();
  });

  it("SQL 이 없으면 없다", () => {
    expect(tableFromSql(undefined)).toBeUndefined();
    expect(tableFromSql("")).toBeUndefined();
  });
});
