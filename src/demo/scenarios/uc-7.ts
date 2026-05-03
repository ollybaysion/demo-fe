/**
 * UC-7: 챔버 압력 이상 분석 (#60)
 *
 * 압력 추세 + 정상 범위 음영 + 임계 교차 마커 + 가설.
 */

import type { Scenario } from "./types";

const PRESSURE_12H: readonly Record<string, unknown>[] = Array.from(
  { length: 72 },
  (_, i) => {
    const h = String(Math.floor(i / 6) + 6).padStart(2, "0");
    const mm = String((i % 6) * 10).padStart(2, "0");
    const baseline = 0.92;
    const drift = i > 12 ? 0.04 : 0;
    const value = baseline + drift + 0.03 * Math.sin(i / 4);
    return { 시간: `${h}:${mm}`, 측정값: Number(value.toFixed(3)) };
  },
);

export const uc7: Scenario = {
  id: "uc-7",
  starter: "챔버 압력이 평소와 달라 분석을 원합니다.",
  contextPanel: [],
  turns: [
    {
      user: "챔버 압력이 평소와 달라 분석을 원합니다.",
      assistant: "분석할 챔버를 알려주세요.",
      recommendQuestion: [
        "예시 챔버 분석",
        "우리 챔버를 직접 입력",
        "정상 범위 기준 출처",
      ],
    },
    {
      user: "예시 챔버 분석",
      assistant:
        "Chamber A 압력 추세입니다. **최근 12시간 평균이 평소 대비 8% 상승** 되어 있습니다.",
      contextPanel: [
        {
          id: "uc7-eq-1",
          equipment: "ETCH-01",
          chambers: [
            {
              id: "uc7-ch-1",
              name: "A",
              sensors: [{ id: "uc7-sn-1", name: "APC_PRESSURE" }],
            },
          ],
        },
      ],
      charts: [
        {
          type: "line",
          data: PRESSURE_12H.slice(),
          options: {
            title: "Chamber A 압력 — 최근 12시간",
            xKey: "시간",
            yKeys: ["측정값"],
            yLabel: "Pressure (Torr)",
            referenceLines: [
              { axis: "y", value: 1.05, label: "상한", dashed: true },
              { axis: "y", value: 0.80, label: "하한", dashed: true },
              { axis: "x", value: "08:20", label: "상한 교차" },
              { axis: "x", value: "11:10", label: "상한 교차" },
              { axis: "x", value: "13:40", label: "압력 이상 알람" },
            ],
            referenceAreas: [
              { axis: "y", from: 0.80, to: 1.05, label: "정상 범위", fill: "rgba(93, 184, 166, 0.10)" },
            ],
          },
        },
      ],
      tables: [
        {
          title: "정상 범위 기준",
          columns: ["구분", "하한", "권장", "상한", "단위"],
          rows: [
            { 구분: "주간(08~20)", 하한: 0.85, 권장: 0.95, 상한: 1.05, 단위: "Torr" },
            { 구분: "야간(20~08)", 하한: 0.80, 권장: 0.92, 상한: 1.02, 단위: "Torr" },
            { 구분: "Peak STEP", 하한: 0.95, 권장: 1.10, 상한: 1.20, 단위: "Torr" },
          ],
        },
      ],
      recommendQuestion: [
        "원인 가설을 알려주세요",
        "다른 챔버와 비교",
        "이전 주와 비교",
      ],
    },
    {
      user: "원인 가설을 알려주세요",
      assistant: "가능 가설과 검증 항목입니다.",
      tables: [
        {
          title: "가설 / 검증",
          columns: ["가설", "근거", "검증 방법", "우선순위"],
          rows: [
            { 가설: "Pump 효율 저하", 근거: "12시간 평균 +8%", 검증: "Pump 회전수 기록 비교", 우선순위: "높음" },
            { 가설: "GasLeak 미세 누설", 근거: "GAS_LEAK 약상승 트렌드", 검증: "He 누설검사", 우선순위: "높음" },
            { 가설: "MFC setpoint 드리프트", 근거: "GAS_FLOW 변동성 +", 검증: "MFC 보정 실행", 우선순위: "중간" },
            { 가설: "센서 보정 오류", 근거: "다른 챔버는 정상", 검증: "Refer 센서 교차 측정", 우선순위: "낮음" },
          ],
        },
      ],
    },
  ],
};
