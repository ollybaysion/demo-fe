import { describe, expect, it } from "vitest";
import {
  queryKeyOf,
  renderSql,
  resolveSlot,
  sqlLiteral,
} from "./slot-resolve";

// 골든은 실 BE(:8094) 응답에서 채취했다 — ~/repo/chat-data-judge-request-example.json.
// 이 값들이 어긋나면 FE 로컬 판정과 BE 채팅 경로가 서로 다른 진행을 본다.

describe("queryKeyOf — BE QueryKey.of 패리티", () => {
  it("골든: skill#step(0-기반)__필수인자", () => {
    expect(queryKeyOf("fdc-explain-sensor", 0, { snsr_id: "B" }, ["snsr_id"]))
      .toBe("fdc-explain-sensor#0__snsr_id=B");
    expect(queryKeyOf("fdc-explain-sensor", 1, { snsr_id: "B" }, ["snsr_id"]))
      .toBe("fdc-explain-sensor#1__snsr_id=B");
  });

  it("이름표는 필수 인자 전량 — 그 단계가 안 쓰는 인자도 들어간다", () => {
    // 2단계 바인드는 eqp(앞 단계 결과)뿐이지만 이름표는 snsr_id 를 단다.
    expect(queryKeyOf("s", 2, { a: "1", b: "2" }, ["a", "b"]))
      .toBe("s#2__a=1&b=2");
  });

  it("값 없는 이름은 건너뛰고, 인자가 하나도 없으면 __ 도 없다", () => {
    expect(queryKeyOf("s", 0, { a: "1" }, ["a", "b"])).toBe("s#0__a=1");
    expect(queryKeyOf("s", 0, {}, [])).toBe("s#0");
  });

  it("구분자 # & = 는 값에서 _ 로 접는다", () => {
    expect(queryKeyOf("s", 0, { a: "x#y&z=w" }, ["a"])).toBe("s#0__a=x_y_z_w");
  });
});

describe("sqlLiteral / renderSql — BE SqlRender 패리티", () => {
  it("숫자꼴은 맨값, 문자열은 인용 + '' 이스케이프", () => {
    expect(sqlLiteral("42")).toBe("42");
    expect(sqlLiteral("-3.5")).toBe("-3.5");
    expect(sqlLiteral("CVD-01")).toBe("'CVD-01'");
    expect(sqlLiteral("O'Brien")).toBe("'O''Brien'");
  });

  it("ISO 날짜꼴은 TO_DATE — 초·분·일 마스크, T 는 공백으로", () => {
    expect(sqlLiteral("2026-08-02")).toBe("TO_DATE('2026-08-02', 'YYYY-MM-DD')");
    expect(sqlLiteral("2026-08-02T09:30")).toBe(
      "TO_DATE('2026-08-02 09:30', 'YYYY-MM-DD HH24:MI')",
    );
    expect(sqlLiteral("2026-08-02 09:30:15")).toBe(
      "TO_DATE('2026-08-02 09:30:15', 'YYYY-MM-DD HH24:MI:SS')",
    );
  });

  it("골든: 2단계 SQL 렌더가 실 BE 발급 SQL 과 일치한다", () => {
    const spec = `SELECT eqp_id, eqp_name, model_cd, vendor, use_yn
  FROM fdc_equipment WHERE eqp_id = :eqp`;
    const out = renderSql(spec, { eqp: "CVD-01" });
    expect(out).toEqual({
      ok: true,
      sql: `SELECT eqp_id, eqp_name, model_cd, vendor, use_yn
  FROM fdc_equipment WHERE eqp_id = 'CVD-01'`,
    });
  });

  it("작은따옴표 리터럴 안의 :ident 는 바인드가 아니다", () => {
    const out = renderSql("SELECT ':x' AS c FROM t WHERE a = :x", { x: "1" });
    expect(out).toEqual({ ok: true, sql: "SELECT ':x' AS c FROM t WHERE a = 1" });
  });

  it("값 없는 바인드는 이름을 모아 돌려준다", () => {
    expect(renderSql("WHERE a = :a AND b = :b", {})).toEqual({
      ok: false,
      missing: ["a", "b"],
    });
  });
});

describe("resolveSlot — 미정/요청 파생", () => {
  const BINDS = {
    eqp: { from: "step", step: 0, column: "EQP_ID" } as const,
  };
  const SQL = "SELECT * FROM fdc_equipment WHERE eqp_id = :eqp";

  it("인자 바인드가 비면 미정(missing-arg)", () => {
    const r = resolveSlot(":id 조회", { id: { from: "arg", arg: "snsr_id" } }, {}, () => null);
    expect(r).toEqual({ kind: "pending", reason: "missing-arg" });
  });

  it("앞 슬롯 미도착 → upstream, 0행 → empty-upstream", () => {
    expect(resolveSlot(SQL, BINDS, {}, () => null)).toEqual({
      kind: "pending",
      reason: "upstream",
    });
    expect(
      resolveSlot(SQL, BINDS, {}, () => ({ columns: ["EQP_ID"], rows: [] })),
    ).toEqual({ kind: "pending", reason: "empty-upstream" });
  });

  it("컬럼 값 1개면 확정 — 컬럼 이름 대조는 대소문자 무시", () => {
    const r = resolveSlot(SQL, BINDS, {}, () => ({
      columns: ["snsr_id", "eqp_id"],
      rows: [["B", "CVD-01"]],
    }));
    expect(r).toEqual({
      kind: "ready",
      sql: "SELECT * FROM fdc_equipment WHERE eqp_id = 'CVD-01'",
    });
  });

  it("후보가 여러 개면 고르지 않는다 — 미정(ambiguous, BE #50)", () => {
    const r = resolveSlot(SQL, BINDS, {}, () => ({
      columns: ["EQP_ID"],
      rows: [["CVD-01"], ["CVD-02"]],
    }));
    expect(r).toEqual({ kind: "pending", reason: "ambiguous" });
  });

  it("같은 값 반복은 갈림길이 아니다 — 1개로 접혀 확정", () => {
    const r = resolveSlot(SQL, BINDS, {}, () => ({
      columns: ["EQP_ID"],
      rows: [["CVD-01"], ["CVD-01"], [null]],
    }));
    expect(r).toEqual({
      kind: "ready",
      sql: "SELECT * FROM fdc_equipment WHERE eqp_id = 'CVD-01'",
    });
  });
});
