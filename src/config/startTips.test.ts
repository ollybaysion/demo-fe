import { describe, expect, it } from "vitest";
import {
  START_TIP_INTERVAL_MS,
  START_TIPS,
  TIP_MAX_LENGTH,
} from "./startTips";

/**
 * 팁은 나중에 문장만 덧붙이는 자리다 — 그래서 지켜야 할 규칙을 사람 기억이
 * 아니라 여기에 둔다. 추가하다 규칙을 놓치면 이 테스트가 먼저 말한다.
 */
describe("START_TIPS", () => {
  it("비어 있지 않다 — 빈 화면의 안내가 통째로 사라진다", () => {
    expect(START_TIPS.length).toBeGreaterThan(0);
  });

  it("한 줄에 들어가는 길이다", () => {
    for (const tip of START_TIPS) {
      expect(tip.length, tip).toBeLessThanOrEqual(TIP_MAX_LENGTH);
    }
  });

  it("중복이 없다 — 같은 문구가 두 번 돌면 회전이 멈춘 것처럼 보인다", () => {
    expect(new Set(START_TIPS).size).toBe(START_TIPS.length);
  });

  it("앞뒤 공백이 없다", () => {
    for (const tip of START_TIPS) {
      expect(tip, tip).toBe(tip.trim());
    }
  });
});

describe("START_TIP_INTERVAL_MS", () => {
  it("읽을 시간은 준다 — 3초보다 짧으면 읽는 중에 바뀐다", () => {
    expect(START_TIP_INTERVAL_MS).toBeGreaterThanOrEqual(3000);
  });
});
