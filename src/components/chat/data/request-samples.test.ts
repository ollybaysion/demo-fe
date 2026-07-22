import { describe, expect, it } from "vitest";
import { parseSnapshot } from "@/lib/snapshot-parse";
import { SNAPSHOT_DEMO_QUESTION, sampleResultFor } from "./request-samples";

/**
 * 예시가 지켜야 하는 계약은 하나다 — **요청 카드의 기대 컬럼 그대로, 엔진을
 * 통과해 등록될 수 있어야** 한다. 예시가 파싱에서 넘어지면 "클릭만으로
 * 왕복"이 그 자리에서 끊긴다.
 *
 * 기대 컬럼은 요청을 만드는 두 곳(백엔드 MockLlm · FE mock route 의
 * REQUESTABLE)에 정의돼 있다 — 그쪽이 바뀌면 여기 예시도 같이 바뀐다.
 */
const EXPECTED_COLUMNS: Record<string, string[]> = {
  sensor_list: ["CHAMBER", "SENSOR_ID", "SENSOR_NAME"],
  recipe_steps: ["RECIPE_ID", "STEP_NO", "STEP_NAME", "DURATION_SEC"],
};

describe("sampleResultFor", () => {
  for (const [queryKey, columns] of Object.entries(EXPECTED_COLUMNS)) {
    it(`${queryKey} 예시가 기대 컬럼 그대로 파싱된다`, () => {
      const sample = sampleResultFor(queryKey);
      expect(sample).not.toBeNull();
      const parsed = parseSnapshot(sample!, { queryKey });
      expect(parsed.ok).toBe(true);
      if (parsed.ok) {
        expect(parsed.columns).toEqual(columns);
        expect(parsed.rowCount).toBeGreaterThan(0);
      }
    });
  }

  it("예시가 없는 queryKey 는 null — 채우기 버튼이 뜨지 않는다", () => {
    expect(sampleResultFor("unknown_key")).toBeNull();
  });
});

describe("SNAPSHOT_DEMO_QUESTION", () => {
  it("sensor_list 트리거('센서 목록')를 포함한다 — 왕복을 확실히 연다", () => {
    // 백엔드 MockLlm 트리거는 "센서 목록", FE mock 은 "센서" — 앞쪽이 더 좁다.
    expect(SNAPSHOT_DEMO_QUESTION).toContain("센서 목록");
  });

  it("설비/센서 ID 패턴이 없다 — 있으면 다른 툴 분기가 요청을 가로챈다", () => {
    expect(SNAPSHOT_DEMO_QUESTION).not.toMatch(/\b[A-Z]{2,4}-\d{2,}\b/);
    expect(SNAPSHOT_DEMO_QUESTION).not.toMatch(/\bS-\d{3,}\b/);
  });
});
