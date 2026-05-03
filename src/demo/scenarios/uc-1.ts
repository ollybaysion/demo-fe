/**
 * UC-1: 센서 데이터 추세 해석
 *
 * 사용자가 발생한 센서 데이터의 패턴을 보고 "왜 이렇게 발생했는가" 를
 * 해석하는 기본 분석 흐름. 표 세로/가로 overflow + 단일/멀티 series
 * 차트 + 차트 이벤트 마커 검증.
 */

import type { Scenario } from "./types";

const HOURLY_TREND: readonly Record<string, unknown>[] = Array.from(
  { length: 30 },
  (_, i) => {
    const h = String(Math.floor(i / 1.25)).padStart(2, "0");
    const m = String((i % 5) * 12).padStart(2, "0");
    const time = `${h}:${m}`;
    const base = 0.85 + 0.04 * Math.sin(i / 3);
    const value = i === 18 ? 1.42 : Number((base + 0.02 * Math.cos(i)).toFixed(2));
    return { 시간: time, "측정값(Torr)": value, 상한: 1.20, 하한: 0.60 };
  },
);

const MULTI_SENSOR_ROWS: readonly Record<string, unknown>[] = Array.from(
  { length: 20 },
  (_, i) => ({
    시간: `${String(Math.floor(i / 2)).padStart(2, "0")}:${(i % 2) * 30 || "00"}`,
    APC_PRESSURE: 0.85 + 0.05 * Math.sin(i / 2),
    RF_FORWARD: 1700 + 20 * Math.cos(i),
    GAS_FLOW: 200 - 5 * Math.sin(i),
    TEMP: 240 + Math.sin(i),
    PWR: 1500 + 30 * Math.cos(i / 2),
    VOLT: -185 - 2 * Math.sin(i),
    이상여부: i === 9 ? "주의" : "정상",
  }),
);

export const uc1: Scenario = {
  id: "uc-1",
  starter: "데이터가 왜 이렇게 발생했는지 궁금합니다.",
  contextPanel: [],
  turns: [
    {
      user: "데이터가 왜 이렇게 발생했는지 궁금합니다.",
      assistant: [
        "분석할 센서를 알려주세요.",
        "",
        "우측 컨텍스트 패널에서 설비 / 챔버 / 센서를 입력하시면 됩니다.",
        "",
        "또는 아래 추천 중 하나를 선택해 예시 컨텍스트로 바로 시작할 수 있습니다.",
      ].join("\n"),
      recommendQuestion: [
        "예시 컨텍스트로 시작",
        "분석 가능한 센서 종류를 알려주세요",
        "컨텍스트 입력 방법을 알려주세요",
      ],
    },
    {
      user: "예시 컨텍스트로 시작",
      assistant: [
        "ETCH-01 / 챔버 A / APC_PRESSURE 센서를 분석합니다.",
        "",
        "최근 24시간 추세는 다음과 같습니다. **정상 범위 안에서 안정적으로 움직이고 있으며**, 14:20 경 짧은 스파이크 한 건이 관측됩니다.",
      ].join("\n"),
      contextPanel: [
        {
          id: "uc1-eq-1",
          equipment: "ETCH-01",
          chambers: [
            {
              id: "uc1-ch-1",
              name: "A",
              sensors: [{ id: "uc1-sn-1", name: "APC_PRESSURE" }],
            },
          ],
        },
      ],
      timeRange: { start: "2026-05-03T00:00", end: "2026-05-03T23:59" },
      tables: [
        {
          title: "APC_PRESSURE 시간대별 측정",
          columns: ["시간", "측정값(Torr)", "상한", "하한", "이상여부"],
          rows: HOURLY_TREND.map((r) => ({
            ...r,
            이상여부: (r["측정값(Torr)"] as number) > 1.2 ? "초과" : "정상",
          })),
        },
      ],
      charts: [
        {
          type: "line",
          data: HOURLY_TREND.slice(),
          options: {
            title: "APC_PRESSURE — 24시간 추세",
            xKey: "시간",
            yKeys: ["측정값(Torr)"],
            yLabel: "Pressure (Torr)",
            referenceLines: [
              { axis: "x", value: "08:30", label: "Recipe v3 적용" },
              { axis: "x", value: "20:00", label: "정기 점검" },
              { axis: "y", value: 1.20, label: "상한", dashed: true },
            ],
          },
        },
      ],
      recommendQuestion: [
        "다른 센서 데이터도 보여주세요",
        "14:20 스파이크 원인을 알려주세요",
        "동종설비와 비교해주세요",
      ],
    },
    {
      user: "다른 센서 데이터도 보여주세요",
      assistant: "챔버 A의 다른 주요 센서들도 함께 보겠습니다.",
      tables: [
        {
          title: "챔버 A 주요 센서 동시 측정",
          columns: [
            "시간", "APC_PRESSURE", "RF_FORWARD", "GAS_FLOW",
            "TEMP", "PWR", "VOLT", "이상여부",
          ],
          rows: MULTI_SENSOR_ROWS.slice(),
        },
      ],
      charts: [
        {
          type: "line",
          data: MULTI_SENSOR_ROWS.slice(),
          options: {
            title: "주요 센서 6종 동시 추세",
            xKey: "시간",
            yKeys: ["APC_PRESSURE", "RF_FORWARD", "GAS_FLOW", "TEMP", "PWR", "VOLT"],
          },
        },
      ],
    },
  ],
};
