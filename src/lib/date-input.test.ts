import { describe, expect, it } from "vitest";

import {
  buildDateValue,
  fmtDate,
  inputKind,
  isValidTime,
  monthCells,
  parseDateValue,
} from "./date-input";

describe("inputKind", () => {
  it("spec 이 선언한 type 을 그대로 읽는다", () => {
    expect(inputKind("datetime")).toBe("datetime");
    expect(inputKind("date")).toBe("date");
  });

  it("신호가 없으면 자유 텍스트", () => {
    expect(inputKind(undefined)).toBe("text");
  });

  it("닫힌 enum 밖의 값은 text 로 물러난다 — 모르는 신호로 달력을 띄우지 않는다", () => {
    expect(inputKind("time")).toBe("text");
    expect(inputKind("DATETIME")).toBe("text");
    expect(inputKind("")).toBe("text");
  });
});

describe("parseDateValue / buildDateValue", () => {
  it("datetime 왕복 — 'YYYY-MM-DD HH:mm'", () => {
    const parsed = parseDateValue("2026-08-09 13:30");
    expect(parsed).not.toBeNull();
    expect(fmtDate(parsed!.date)).toBe("2026-08-09");
    expect(parsed!.time).toBe("13:30");
    expect(buildDateValue("datetime", parsed!.date, parsed!.time)).toBe(
      "2026-08-09 13:30",
    );
  });

  it("date 왕복 — 시각 없이 날짜만", () => {
    const parsed = parseDateValue("2026-08-09");
    expect(parsed).not.toBeNull();
    expect(parsed!.time).toBe("");
    expect(buildDateValue("date", parsed!.date, "13:30")).toBe("2026-08-09");
  });

  it("시각이 비거나 깨졌으면 00:00 으로 나간다", () => {
    const d = new Date(2026, 7, 9);
    expect(buildDateValue("datetime", d, "")).toBe("2026-08-09 00:00");
    expect(buildDateValue("datetime", d, "25:99")).toBe("2026-08-09 00:00");
  });

  it("못 읽는 값은 null — 빈 문자열, 자유 텍스트, 달력에 없는 날짜", () => {
    expect(parseDateValue("")).toBeNull();
    expect(parseDateValue("어제부터")).toBeNull();
    expect(parseDateValue("2026-02-31")).toBeNull();
    expect(parseDateValue("2026-13-01")).toBeNull();
  });
});

describe("isValidTime", () => {
  it("00:00~23:59 만 유효", () => {
    expect(isValidTime("00:00")).toBe(true);
    expect(isValidTime("23:59")).toBe(true);
    expect(isValidTime("24:00")).toBe(false);
    expect(isValidTime("9:00")).toBe(false);
    expect(isValidTime("13:5")).toBe(false);
  });
});

describe("monthCells", () => {
  it("항상 42칸, 일요일 시작 — 2026년 8월은 토요일(8/1)로 시작한다", () => {
    const cells = monthCells(2026, 7);
    expect(cells).toHaveLength(42);
    expect(cells[0].getDay()).toBe(0);
    expect(fmtDate(cells[0])).toBe("2026-07-26");
    expect(fmtDate(cells[6])).toBe("2026-08-01");
    expect(fmtDate(cells[41])).toBe("2026-09-05");
  });
});
