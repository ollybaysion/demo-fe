/**
 * data-shape — 설비 데이터 발생 패턴 분석.
 *
 * APC_PRESSURE 시계열을 STEP 구간(PRE_HEAT / MAIN_ETCH / POST_PURGE) 으로
 * 구분해 추세·통계·동종설비 비교까지 보여주는 풍부한 다중 paired item
 * (#45) 시나리오. 표 2 + 차트 2 + 이벤트 타임라인 1 등 거의 모든 paired
 * 위젯 검증 가능.
 */

import type { Scenario } from "./types";

const APC_PRESSURE_TREND: readonly Record<string, unknown>[] = [
  { timestamp: "09:00:00", step: "PRE_HEAT", "APC_PRESSURE (mTorr)": 0.30 },
  { timestamp: "09:00:15", step: "PRE_HEAT", "APC_PRESSURE (mTorr)": 0.35 },
  { timestamp: "09:00:30", step: "PRE_HEAT", "APC_PRESSURE (mTorr)": 0.42 },
  { timestamp: "09:00:45", step: "PRE_HEAT", "APC_PRESSURE (mTorr)": 0.51 },
  { timestamp: "09:01:00", step: "PRE_HEAT", "APC_PRESSURE (mTorr)": 0.55 },
  { timestamp: "09:01:15", step: "PRE_HEAT", "APC_PRESSURE (mTorr)": 0.58 },
  { timestamp: "09:01:30", step: "PRE_HEAT", "APC_PRESSURE (mTorr)": 0.60 },
  { timestamp: "09:01:45", step: "PRE_HEAT", "APC_PRESSURE (mTorr)": 0.65 },
  { timestamp: "09:02:00", step: "MAIN_ETCH", "APC_PRESSURE (mTorr)": 1.20 },
  { timestamp: "09:02:15", step: "MAIN_ETCH", "APC_PRESSURE (mTorr)": 1.55 },
  { timestamp: "09:02:30", step: "MAIN_ETCH", "APC_PRESSURE (mTorr)": 1.78 },
  { timestamp: "09:02:45", step: "MAIN_ETCH", "APC_PRESSURE (mTorr)": 2.05 },
  { timestamp: "09:03:00", step: "MAIN_ETCH", "APC_PRESSURE (mTorr)": 2.25 },
  { timestamp: "09:03:15", step: "MAIN_ETCH", "APC_PRESSURE (mTorr)": 2.40 },
  { timestamp: "09:03:30", step: "MAIN_ETCH", "APC_PRESSURE (mTorr)": 2.55 },
  { timestamp: "09:03:45", step: "MAIN_ETCH", "APC_PRESSURE (mTorr)": 2.65 },
  { timestamp: "09:04:00", step: "MAIN_ETCH", "APC_PRESSURE (mTorr)": 2.72 },
  { timestamp: "09:04:15", step: "MAIN_ETCH", "APC_PRESSURE (mTorr)": 2.80 },
  { timestamp: "09:04:30", step: "MAIN_ETCH", "APC_PRESSURE (mTorr)": 2.85 },
  { timestamp: "09:04:45", step: "MAIN_ETCH", "APC_PRESSURE (mTorr)": 2.90 },
  { timestamp: "09:05:00", step: "MAIN_ETCH", "APC_PRESSURE (mTorr)": 2.92 },
  { timestamp: "09:05:15", step: "MAIN_ETCH", "APC_PRESSURE (mTorr)": 2.95 },
  { timestamp: "09:05:30", step: "MAIN_ETCH", "APC_PRESSURE (mTorr)": 2.98 },
  { timestamp: "09:05:45", step: "MAIN_ETCH", "APC_PRESSURE (mTorr)": 2.99 },
  { timestamp: "09:06:00", step: "MAIN_ETCH", "APC_PRESSURE (mTorr)": 3.00 },
  { timestamp: "09:06:15", step: "MAIN_ETCH", "APC_PRESSURE (mTorr)": 2.98 },
  { timestamp: "09:06:30", step: "MAIN_ETCH", "APC_PRESSURE (mTorr)": 2.92 },
  { timestamp: "09:06:45", step: "MAIN_ETCH", "APC_PRESSURE (mTorr)": 2.85 },
  { timestamp: "09:07:00", step: "MAIN_ETCH", "APC_PRESSURE (mTorr)": 2.78 },
  { timestamp: "09:07:15", step: "MAIN_ETCH", "APC_PRESSURE (mTorr)": 2.65 },
  { timestamp: "09:07:30", step: "MAIN_ETCH", "APC_PRESSURE (mTorr)": 2.55 },
  { timestamp: "09:07:45", step: "MAIN_ETCH", "APC_PRESSURE (mTorr)": 2.45 },
  { timestamp: "09:08:00", step: "MAIN_ETCH", "APC_PRESSURE (mTorr)": 2.30 },
  { timestamp: "09:08:15", step: "MAIN_ETCH", "APC_PRESSURE (mTorr)": 2.10 },
  { timestamp: "09:08:30", step: "MAIN_ETCH", "APC_PRESSURE (mTorr)": 1.85 },
  { timestamp: "09:08:45", step: "MAIN_ETCH", "APC_PRESSURE (mTorr)": 1.55 },
  { timestamp: "09:09:00", step: "POST_PURGE", "APC_PRESSURE (mTorr)": 1.20 },
  { timestamp: "09:09:15", step: "POST_PURGE", "APC_PRESSURE (mTorr)": 0.95 },
  { timestamp: "09:09:30", step: "POST_PURGE", "APC_PRESSURE (mTorr)": 0.80 },
  { timestamp: "09:09:45", step: "POST_PURGE", "APC_PRESSURE (mTorr)": 0.70 },
  { timestamp: "09:10:00", step: "POST_PURGE", "APC_PRESSURE (mTorr)": 0.60 },
];

export const dataShape: Scenario = {
  id: "data-shape",
  starter: "설비 데이터가 왜 이렇게 발생했는지 궁금합니다.",
  contextPanel: [],
  turns: [
    {
      user: "설비 데이터가 왜 이렇게 발생했는지 궁금합니다.",
      assistant:
        "설비 정보와 발생 시간을 입력해주세요. 메시지로 입력하거나 오른쪽 패널을 활용해주세요. 이미지도 가능합니다.",
      recommendQuestion: [
        "ETCH-02 설비 A 챔버 APC_PRESSURE 센서 09:00부터 09:10까지 입니다.",
        "오른쪽 패널에 직접 입력하기",
        "이미지로 첨부하기",
      ],
    },
    {
      user: "ETCH-02 설비 A 챔버 APC_PRESSURE 센서 09:00부터 09:10까지 입니다.",
      assistant: [
        "### APC_PRESSURE 센서 분석",
        "",
        "이 센서는 **MAIN_ETCH STEP** 진행 중의 최댓값입니다.",
        "",
        "| 항목 | 값 |",
        "| --- | --- |",
        "| 분석 기간 | 09:00 ~ 09:10 |",
        "| MAIN_ETCH STEP | 정상 |",
        "| APC_PRESSURE 최댓값 | `3 mTorr` |",
        "| 데이터 발생 시점 | 09:10 |",
        "",
        "> STEP 종료 시점 기준으로 데이터가 발생하기 때문에 09:10에 센서값 3으로 데이터가 발생했습니다.",
      ].join("\n"),
      tables: [
        {
          title: "APC_PRESSURE 시계열",
          columns: ["timestamp", "step", "APC_PRESSURE (mTorr)"],
          rows: APC_PRESSURE_TREND.slice(),
        },
        {
          title: "STEP별 APC_PRESSURE 통계",
          columns: ["step", "duration", "min", "avg", "max"],
          rows: [
            { step: "PRE_HEAT", duration: "2 분", min: 0.30, avg: 0.49, max: 0.65 },
            { step: "MAIN_ETCH", duration: "7 분", min: 1.20, avg: 2.49, max: 3.00 },
            { step: "POST_PURGE", duration: "2 분", min: 0.60, avg: 0.85, max: 1.20 },
          ],
        },
      ],
      charts: [
        {
          type: "line",
          data: APC_PRESSURE_TREND.slice(),
          options: {
            title: "APC_PRESSURE (mTorr) — 09:00~09:10 트렌드",
            xKey: "timestamp",
            yKeys: ["APC_PRESSURE (mTorr)"],
            xLabel: "시각",
            yLabel: "mTorr",
            referenceLines: [
              { axis: "y", value: 3.0, label: "Max 3.0", dashed: true },
              { axis: "x", value: "09:06:00", label: "Peak" },
            ],
            referenceAreas: [
              { axis: "x", from: "09:00:00", to: "09:01:45", label: "PRE_HEAT" },
              { axis: "x", from: "09:02:00", to: "09:08:45", label: "MAIN_ETCH", fill: "rgba(20,20,19,0.08)" },
              { axis: "x", from: "09:09:00", to: "09:10:00", label: "POST_PURGE" },
            ],
          },
        },
        {
          type: "bar",
          data: [
            { step: "PRE_HEAT", avg: 0.49, max: 0.65 },
            { step: "MAIN_ETCH", avg: 2.49, max: 3.00 },
            { step: "POST_PURGE", avg: 0.85, max: 1.20 },
          ],
          options: {
            title: "STEP별 APC_PRESSURE — 평균 / 최대",
            xKey: "step",
            yKeys: ["avg", "max"],
            yLabel: "mTorr",
          },
        },
      ],
      eventTimelines: [
        {
          title: "공정 / STEP 타임라인",
          range: { start: "09:00:00", end: "09:10:00" },
          events: [
            { track: "공정", level: "process", start: "09:00:00", end: "09:10:00", label: "Recipe-2 batch" },
            { track: "챔버 A", level: "step", start: "09:00:00", end: "09:01:45", label: "PRE_HEAT" },
            { track: "챔버 A", level: "step", start: "09:02:00", end: "09:08:45", label: "MAIN_ETCH" },
            { track: "챔버 A", level: "step", start: "09:03:00", end: "09:04:30", label: "RF Tune" },
            { track: "챔버 A", level: "step", start: "09:04:00", end: "09:07:30", label: "EPD 측정" },
            { track: "챔버 A", level: "step", start: "09:09:00", end: "09:10:00", label: "POST_PURGE" },
            { track: "챔버 B", level: "step", start: "09:00:30", end: "09:02:15", label: "PRE_HEAT" },
            { track: "챔버 B", level: "step", start: "09:02:30", end: "09:09:00", label: "MAIN_ETCH" },
            { track: "챔버 B", level: "step", start: "09:09:15", end: "09:10:00", label: "POST_PURGE" },
            { track: "이상 감지", level: "step", start: "09:03:00", end: "09:05:00", label: "Pressure spike" },
            { track: "이상 감지", level: "step", start: "09:04:00", end: "09:06:30", label: "Temp warning" },
            { track: "이상 감지", level: "step", start: "09:05:30", end: "09:07:00", label: "RF reflected" },
          ],
        },
      ],
      contextPanel: [
        {
          id: "demo-shape-eq-1",
          equipment: "ETCH-02",
          chambers: [
            {
              id: "demo-shape-ch-1",
              name: "A",
              sensors: [{ id: "demo-shape-sn-1", name: "APC_PRESSURE" }],
            },
          ],
        },
      ],
      timeRange: { start: "2026-05-02T09:00", end: "2026-05-02T09:10" },
      recommendQuestion: [
        "다른 주요 센서들도 모두 표로 같이 보여줘",
        "동종설비와 비교해줘",
        "최근 1시간 추세는?",
      ],
    },
    {
      user: "다른 주요 센서들도 모두 표로 같이 보여줘",
      assistant: [
        "### 챔버 A 주요 센서 16개 스냅샷",
        "",
        "09:00:00 ~ 09:10:00 구간의 1분 단위 값입니다. 칼럼이 많아 좌측 영역을 넘어가면 표 액션 그룹의 **확장** 토글로 펼쳐 보세요.",
      ].join("\n"),
      tables: [
        {
          title: "주요 센서 16종 스냅샷",
          columns: [
            "timestamp", "step", "APC_PRESSURE", "RF_FORWARD", "RF_REFLECTED",
            "TEMP_TC1", "TEMP_TC2", "GAS_FLOW_SiH4", "GAS_FLOW_NH3", "GAS_FLOW_Ar",
            "MFC_OPEN_RATE", "CHAMBER_PRESSURE", "ESC_CURRENT", "EPD_INTENSITY",
            "BIAS_VOLTAGE", "COIL_TEMP",
          ],
          rows: [
            { timestamp: "09:00", step: "PRE_HEAT",   APC_PRESSURE: 0.30, RF_FORWARD: 0,    RF_REFLECTED: 0,  TEMP_TC1: 180, TEMP_TC2: 175, GAS_FLOW_SiH4: 0,   GAS_FLOW_NH3: 0,  GAS_FLOW_Ar: 100, MFC_OPEN_RATE: 30, CHAMBER_PRESSURE: 0.32, ESC_CURRENT: 0.0, EPD_INTENSITY: 0,    BIAS_VOLTAGE: 0,    COIL_TEMP: 25 },
            { timestamp: "09:01", step: "PRE_HEAT",   APC_PRESSURE: 0.55, RF_FORWARD: 0,    RF_REFLECTED: 0,  TEMP_TC1: 220, TEMP_TC2: 218, GAS_FLOW_SiH4: 0,   GAS_FLOW_NH3: 0,  GAS_FLOW_Ar: 120, MFC_OPEN_RATE: 35, CHAMBER_PRESSURE: 0.58, ESC_CURRENT: 0.0, EPD_INTENSITY: 0,    BIAS_VOLTAGE: 0,    COIL_TEMP: 27 },
            { timestamp: "09:02", step: "MAIN_ETCH", APC_PRESSURE: 1.20, RF_FORWARD: 1500, RF_REFLECTED: 22, TEMP_TC1: 235, TEMP_TC2: 232, GAS_FLOW_SiH4: 200, GAS_FLOW_NH3: 50, GAS_FLOW_Ar: 100, MFC_OPEN_RATE: 62, CHAMBER_PRESSURE: 1.25, ESC_CURRENT: 1.8, EPD_INTENSITY: 1200, BIAS_VOLTAGE: -180, COIL_TEMP: 32 },
            { timestamp: "09:03", step: "MAIN_ETCH", APC_PRESSURE: 2.25, RF_FORWARD: 1620, RF_REFLECTED: 18, TEMP_TC1: 240, TEMP_TC2: 238, GAS_FLOW_SiH4: 200, GAS_FLOW_NH3: 50, GAS_FLOW_Ar: 100, MFC_OPEN_RATE: 70, CHAMBER_PRESSURE: 2.28, ESC_CURRENT: 1.9, EPD_INTENSITY: 1450, BIAS_VOLTAGE: -185, COIL_TEMP: 35 },
            { timestamp: "09:04", step: "MAIN_ETCH", APC_PRESSURE: 2.72, RF_FORWARD: 1720, RF_REFLECTED: 15, TEMP_TC1: 244, TEMP_TC2: 242, GAS_FLOW_SiH4: 200, GAS_FLOW_NH3: 50, GAS_FLOW_Ar: 100, MFC_OPEN_RATE: 76, CHAMBER_PRESSURE: 2.75, ESC_CURRENT: 2.0, EPD_INTENSITY: 1620, BIAS_VOLTAGE: -190, COIL_TEMP: 37 },
            { timestamp: "09:05", step: "MAIN_ETCH", APC_PRESSURE: 2.92, RF_FORWARD: 1810, RF_REFLECTED: 14, TEMP_TC1: 246, TEMP_TC2: 244, GAS_FLOW_SiH4: 200, GAS_FLOW_NH3: 50, GAS_FLOW_Ar: 100, MFC_OPEN_RATE: 80, CHAMBER_PRESSURE: 2.95, ESC_CURRENT: 2.1, EPD_INTENSITY: 1740, BIAS_VOLTAGE: -192, COIL_TEMP: 38 },
            { timestamp: "09:06", step: "MAIN_ETCH", APC_PRESSURE: 3.00, RF_FORWARD: 1820, RF_REFLECTED: 14, TEMP_TC1: 248, TEMP_TC2: 246, GAS_FLOW_SiH4: 200, GAS_FLOW_NH3: 50, GAS_FLOW_Ar: 100, MFC_OPEN_RATE: 82, CHAMBER_PRESSURE: 3.02, ESC_CURRENT: 2.1, EPD_INTENSITY: 1780, BIAS_VOLTAGE: -193, COIL_TEMP: 38 },
            { timestamp: "09:07", step: "MAIN_ETCH", APC_PRESSURE: 2.78, RF_FORWARD: 1780, RF_REFLECTED: 16, TEMP_TC1: 245, TEMP_TC2: 243, GAS_FLOW_SiH4: 200, GAS_FLOW_NH3: 50, GAS_FLOW_Ar: 100, MFC_OPEN_RATE: 78, CHAMBER_PRESSURE: 2.81, ESC_CURRENT: 2.0, EPD_INTENSITY: 1660, BIAS_VOLTAGE: -188, COIL_TEMP: 37 },
            { timestamp: "09:08", step: "MAIN_ETCH", APC_PRESSURE: 2.30, RF_FORWARD: 1640, RF_REFLECTED: 19, TEMP_TC1: 240, TEMP_TC2: 239, GAS_FLOW_SiH4: 200, GAS_FLOW_NH3: 50, GAS_FLOW_Ar: 100, MFC_OPEN_RATE: 71, CHAMBER_PRESSURE: 2.33, ESC_CURRENT: 1.9, EPD_INTENSITY: 1480, BIAS_VOLTAGE: -185, COIL_TEMP: 36 },
            { timestamp: "09:09", step: "POST_PURGE", APC_PRESSURE: 1.20, RF_FORWARD: 0,    RF_REFLECTED: 0,  TEMP_TC1: 232, TEMP_TC2: 231, GAS_FLOW_SiH4: 0,   GAS_FLOW_NH3: 0,  GAS_FLOW_Ar: 150, MFC_OPEN_RATE: 50, CHAMBER_PRESSURE: 1.24, ESC_CURRENT: 0.0, EPD_INTENSITY: 0,    BIAS_VOLTAGE: 0,    COIL_TEMP: 33 },
            { timestamp: "09:10", step: "POST_PURGE", APC_PRESSURE: 0.60, RF_FORWARD: 0,    RF_REFLECTED: 0,  TEMP_TC1: 215, TEMP_TC2: 214, GAS_FLOW_SiH4: 0,   GAS_FLOW_NH3: 0,  GAS_FLOW_Ar: 130, MFC_OPEN_RATE: 38, CHAMBER_PRESSURE: 0.63, ESC_CURRENT: 0.0, EPD_INTENSITY: 0,    BIAS_VOLTAGE: 0,    COIL_TEMP: 30 },
          ],
        },
      ],
      recommendQuestion: [
        "동종설비와 비교해줘",
        "이상치 칼럼만 강조해줘",
        "주요 센서별 상관관계 보여줘",
      ],
    },
    {
      user: "동종설비와 비교해줘",
      assistant: [
        "### 동종설비 비교 — ETCH-02 vs ETCH-01 / ETCH-03",
        "",
        "같은 모델(EtcherX-2000)의 다른 두 설비와 MAIN_ETCH STEP 핵심 지표를 비교했습니다.",
        "",
        "ETCH-02 가 동종설비 평균 대비 APC_PRESSURE 피크가 약간 높은 편이지만 모두 정상 범위 내.",
      ].join("\n"),
      tables: [
        {
          title: "MAIN_ETCH 지표 — 현재 설비",
          columns: ["metric", "value"],
          rows: [
            { metric: "APC_PRESSURE 최댓값", value: "3.00 mTorr" },
            { metric: "RF_FORWARD 평균", value: "1,720 W" },
            { metric: "STEP 지속 시간", value: "6 분 45 초" },
            { metric: "EPD 종료 신호", value: "정상 (1,780)" },
          ],
        },
        {
          title: "MAIN_ETCH 지표 — 동종설비 평균",
          columns: ["metric", "ETCH-01", "ETCH-03"],
          rows: [
            { metric: "APC_PRESSURE 최댓값", "ETCH-01": "2.85 mTorr", "ETCH-03": "2.92 mTorr" },
            { metric: "RF_FORWARD 평균", "ETCH-01": "1,680 W", "ETCH-03": "1,710 W" },
            { metric: "STEP 지속 시간", "ETCH-01": "6 분 50 초", "ETCH-03": "6 분 40 초" },
            { metric: "EPD 종료 신호", "ETCH-01": "정상 (1,690)", "ETCH-03": "정상 (1,750)" },
          ],
        },
      ],
      charts: [
        {
          type: "line",
          data: [
            { t: "09:02", "ETCH-02": 1.20, "ETCH-01": 1.10, "ETCH-03": 1.18 },
            { t: "09:03", "ETCH-02": 2.25, "ETCH-01": 2.05, "ETCH-03": 2.18 },
            { t: "09:04", "ETCH-02": 2.72, "ETCH-01": 2.55, "ETCH-03": 2.65 },
            { t: "09:05", "ETCH-02": 2.92, "ETCH-01": 2.78, "ETCH-03": 2.84 },
            { t: "09:06", "ETCH-02": 3.00, "ETCH-01": 2.85, "ETCH-03": 2.92 },
            { t: "09:07", "ETCH-02": 2.78, "ETCH-01": 2.65, "ETCH-03": 2.71 },
            { t: "09:08", "ETCH-02": 2.30, "ETCH-01": 2.15, "ETCH-03": 2.22 },
          ],
          options: {
            title: "APC_PRESSURE 비교 (mTorr)",
            xKey: "t",
            yKeys: ["ETCH-02", "ETCH-01", "ETCH-03"],
            xLabel: "시각",
            yLabel: "mTorr",
          },
        },
        {
          type: "bar",
          data: [
            { metric: "APC_PRESSURE 최댓값", "ETCH-02": 3.0, "ETCH-01": 2.85, "ETCH-03": 2.92 },
            { metric: "RF_FORWARD 평균", "ETCH-02": 1.72, "ETCH-01": 1.68, "ETCH-03": 1.71 },
            { metric: "EPD 종료 신호", "ETCH-02": 1.78, "ETCH-01": 1.69, "ETCH-03": 1.75 },
          ],
          options: {
            title: "MAIN_ETCH 핵심 지표 (정규화)",
            xKey: "metric",
            yKeys: ["ETCH-02", "ETCH-01", "ETCH-03"],
          },
        },
      ],
    },
  ],
};
