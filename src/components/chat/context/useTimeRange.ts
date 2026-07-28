"use client";

import { useCallback, useEffect, useState } from "react";
import { readJson, writeJson } from "@/lib/storage";

const TIME_RANGE_KEY = "fdc-agent:context-time-range";

export type TimeRange = { start: string; end: string };

const EMPTY_RANGE: TimeRange = { start: "", end: "" };

/**
 * 발생 시간 범위 — 질문이 걸린 구간.
 *
 * <p>예전에는 이 옆에 설비·챔버·센서를 손으로 채우는 폼이 같이 있었다(폼
 * 컨텍스트). 그 폼은 화면에서 사라졌는데 시드값(ETCH-01)만 남아 매 요청에
 * 실려 나가고 있었다 — 사용자가 담은 질의 대상과 다른 설비를 프롬프트에 같이
 * 넣는 셈이라 걷어냈다. 이 대화가 무엇을 놓고 있는지는 이제 질의 대상 트레이가
 * 말한다.
 *
 * <p>구간은 남는다. 설비와 달리 어느 대상에도 매이지 않는 축이고, 데모
 * 시나리오도 이걸로 시점을 고정한다.
 */
export function useTimeRange() {
  const [timeRange, setTimeRange] = useState<TimeRange>(EMPTY_RANGE);

  useEffect(() => {
    const stored = readJson<unknown>(TIME_RANGE_KEY, null);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTimeRange(isValidRange(stored) ? stored : todayRange());
  }, []);

  useEffect(() => {
    if (timeRange.start === "" && timeRange.end === "") return;
    writeJson(TIME_RANGE_KEY, timeRange);
  }, [timeRange]);

  const replaceTimeRange = useCallback((next: TimeRange) => {
    setTimeRange(next);
  }, []);

  const reset = useCallback(() => {
    setTimeRange(todayRange());
  }, []);

  return { timeRange, replaceTimeRange, reset };
}

function todayRange(): TimeRange {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return {
    start: `${yyyy}-${mm}-${dd}T00:00`,
    end: `${yyyy}-${mm}-${dd}T23:59`,
  };
}

function isValidRange(v: unknown): v is TimeRange {
  return (
    !!v &&
    typeof v === "object" &&
    typeof (v as TimeRange).start === "string" &&
    typeof (v as TimeRange).end === "string"
  );
}
