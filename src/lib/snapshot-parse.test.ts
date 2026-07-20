import { describe, expect, it } from "vitest";
import { parseSnapshot, toQueryKey } from "@/lib/snapshot-parse";

/**
 * 여기서 검증하는 건 **어댑터 경계**다 — 엔진 결과를 FE 모양으로 옮기는 부분,
 * 그리고 자유형 모드에서 FE 가 지는 책임(쿼리 id 를 스키마에 맞춰 넘기기).
 *
 * 파싱 자체의 정확성(구분자 판별·인코딩·NULL 구분·NUMBER 원문 보존)은
 * `data-provisioning` 골든이 지킨다. 그걸 여기서 다시 검증하면 같은 계약을 두
 * 곳에서 관리하게 된다.
 */

const GRID = "SENSOR_ID\tNAME\tVALUE\nS-0004\t온도\t123.45\nS-0005\t압력\t\n";

describe("toQueryKey", () => {
  it("엔진 모델 스키마의 쿼리 id 패턴을 만족시킨다", () => {
    const pattern = /^[A-Za-z0-9_][A-Za-z0-9_.-]*$/;
    expect(toQueryKey("sensor list", "snap-x")).toMatch(pattern);
    expect(toQueryKey("2026 chamber/A", "snap-x")).toMatch(pattern);
    expect(toQueryKey("  ", "snap-x")).toMatch(pattern);
  });

  it("슬러그로 접을 수 없는 라벨은 fallback 을 쓴다", () => {
    // 라벨이 전부 한글이면 ASCII 슬러그가 비어 버린다.
    expect(toQueryKey("센서 목록", "snap-abc")).toBe("snap-abc");
  });

  it("접을 수 있으면 라벨에서 읽히는 키를 만든다", () => {
    expect(toQueryKey("sensor list", "snap-abc")).toBe("sensor-list");
  });
});

describe("parseSnapshot", () => {
  it("그리드 붙여넣기를 표로 옮긴다", () => {
    const result = parseSnapshot(GRID, { queryKey: "q1" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.columns).toEqual(["SENSOR_ID", "NAME", "VALUE"]);
    expect(result.rows).toEqual([
      ["S-0004", "온도", "123.45"],
      ["S-0005", "압력", null],
    ]);
    expect(result.rowCount).toBe(2);
    expect(result.contentHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("무결성 봉투 없음은 실패가 아니라 경고다", () => {
    // 자유형 입력(그리드·CSV)에는 마커도 논스도 없다. 이걸 실패로 다루면
    // 정상 경로가 전부 에러로 보인다.
    const result = parseSnapshot(GRID, { queryKey: "q1" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.warnings).toContain("INTEGRITY_ABSENT");
  });

  it("치명적 입력은 표 대신 코드를 돌려준다", () => {
    // 마커가 있는데 논스가 안 맞으면 엔진은 CSV 로 흘러내리지 않고 하드 실패한다.
    const forged = "==BEGIN q1 deadbeef==\nA,B\n1,2\n==END q1 ROWS:1 deadbeef==\n";
    const result = parseSnapshot(forged, { queryKey: "q1" });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("PARTIAL_MARKING");
    expect(result.message.length).toBeGreaterThan(0);
  });

  it("요청한 쿼리 id 로 결과를 찾는다", () => {
    const result = parseSnapshot(GRID, { queryKey: "custom.key-1" });
    expect(result.ok).toBe(true);
  });

  it("같은 내용은 라벨이 달라도 같은 해시다 — 중복 판정의 근거", () => {
    const a = parseSnapshot(GRID, { queryKey: "q1" });
    const b = parseSnapshot(GRID, { queryKey: "q1" });
    expect(a.ok && b.ok && a.contentHash === b.contentHash).toBe(true);
  });
});
