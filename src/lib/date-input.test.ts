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
  it("트레이스 스킬의 실제 설명 — '수집 구간 시작 시각'은 datetime", () => {
    expect(inputKind("start", "수집 구간 시작 시각")).toBe("datetime");
    expect(inputKind("end", "수집 구간 끝 시각")).toBe("datetime");
  });

  it("설명의 '일시'도 datetime, '날짜'·'일자'는 date", () => {
    expect(inputKind("occurred", "이벤트 발생 일시")).toBe("datetime");
    expect(inputKind("base", "기준 날짜 (예: 2026-08-01)")).toBe("date");
    expect(inputKind("close", "마감 일자")).toBe("date");
  });

  it("'시간'만으로는 판별하지 않는다 — 길이(duration)로도 읽힌다", () => {
    expect(inputKind("window", "조회 시간 범위(분)")).toBe("text");
  });

  it("설명이 침묵하면 key 꼬리로 — _dt/_time은 datetime, _date/_day는 date", () => {
    expect(inputKind("read_dt")).toBe("datetime");
    expect(inputKind("capture_time")).toBe("datetime");
    expect(inputKind("base_date")).toBe("date");
    expect(inputKind("target_day")).toBe("date");
  });

  it("설명이 key 를 이긴다", () => {
    expect(inputKind("base_date", "기준 시각")).toBe("datetime");
  });

  it("신호가 없으면 text — 오탐이 자유 입력을 막는 게 더 나쁘다", () => {
    expect(inputKind("param_index", "센서를 특정하는 파라미터 인덱스")).toBe("text");
    expect(inputKind("equipment", "측정을 낸 설비 ID (예: CVD-01)")).toBe("text");
    expect(inputKind("start")).toBe("text");
    expect(inputKind("update")).toBe("text");
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
