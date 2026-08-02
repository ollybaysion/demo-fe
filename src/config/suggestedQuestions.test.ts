import { describe, expect, it } from "vitest";
import { SUGGESTED_MAX_LENGTH, SUGGESTED_QUESTIONS } from "./suggestedQuestions";

/**
 * chip 은 입력창 위 한 줄에 셋이 나란히 서야 한다 — 두 줄로 접히면 그만큼
 * 입력창 위 영역이 통째로 높아진다. 문구를 고칠 때 이 규칙을 잊기 쉬워서
 * 여기 둔다.
 */
describe("SUGGESTED_QUESTIONS", () => {
  it("셋뿐이다 — 늘리면 줄이 접힌다", () => {
    expect(SUGGESTED_QUESTIONS.length).toBe(3);
  });

  it("한 줄에 들어가는 길이다", () => {
    for (const q of SUGGESTED_QUESTIONS) {
      expect(q.length, q).toBeLessThanOrEqual(SUGGESTED_MAX_LENGTH);
    }
  });

  it("세 개를 합쳐도 한 줄 폭 안이다", () => {
    // chip 하나 = 좌우 패딩 32px + 글자당 약 14px(body-sm), 사이 간격 8px.
    const width = SUGGESTED_QUESTIONS.reduce((sum, q) => sum + 32 + q.length * 14, 0) + 16;
    expect(width).toBeLessThanOrEqual(720);
  });

  it("중복이 없다", () => {
    expect(new Set(SUGGESTED_QUESTIONS).size).toBe(SUGGESTED_QUESTIONS.length);
  });
});
