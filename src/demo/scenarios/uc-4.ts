/**
 * UC-4: 다중 센서 동시 분석
 *
 * 4개 센서의 동시 추세 + 상관계수 매트릭스.
 */

import type { Scenario } from "./types";

const MULTI_TREND: readonly Record<string, unknown>[] = Array.from(
  { length: 60 },
  (_, i) => ({
    시간: `${String(Math.floor(i / 10)).padStart(2, "0")}:${String((i % 10) * 6).padStart(2, "0")}`,
    APC_PRESSURE: Number((0.85 + 0.05 * Math.sin(i / 4)).toFixed(3)),
    RF_FORWARD: Math.round(1700 + 30 * Math.sin(i / 4)),
    GAS_FLOW: Math.round(200 - 4 * Math.sin(i / 4)),
    TEMP: Math.round(240 + Math.cos(i / 5)),
  }),
);

export const uc4: Scenario = {
  id: "uc-4",
  starter: "여러 센서를 동시에 비교하고 싶습니다.",
  contextPanel: [],
  turns: [
    {
      user: "여러 센서를 동시에 비교하고 싶습니다.",
      assistant: "비교할 센서들을 컨텍스트 패널에 추가하시면 됩니다. 예시 다중 센서로 바로 시작할 수도 있습니다.",
      recommendQuestion: [
        "예시 다중 센서로 시작",
        "센서 추가 방법 알려주세요",
        "비교 가능한 센서 조합 추천",
      ],
    },
    {
      user: "예시 다중 센서로 시작",
      assistant:
        "4개 센서의 동시 추세입니다. **APC_PRESSURE** 와 **RF_FORWARD** 는 동시성을 보이며, **GAS_FLOW** 는 약한 역상관 패턴입니다.",
      contextPanel: [
        {
          id: "uc4-eq-1",
          equipment: "ETCH-01",
          chambers: [
            {
              id: "uc4-ch-1",
              name: "A",
              sensors: [
                { id: "uc4-sn-1", name: "APC_PRESSURE" },
                { id: "uc4-sn-2", name: "RF_FORWARD" },
                { id: "uc4-sn-3", name: "GAS_FLOW" },
                { id: "uc4-sn-4", name: "TEMP" },
              ],
            },
          ],
        },
      ],
      charts: [
        {
          type: "line",
          data: MULTI_TREND.slice(),
          options: {
            title: "4개 센서 동시 추세",
            xKey: "시간",
            yKeys: ["APC_PRESSURE", "RF_FORWARD", "GAS_FLOW", "TEMP"],
          },
        },
      ],
      recommendQuestion: [
        "상관관계 수치를 알려주세요",
        "이상 센서만 강조",
        "시점별 비교 보기",
      ],
    },
    {
      user: "상관관계 수치를 알려주세요",
      assistant: "센서 간 상관계수 매트릭스입니다. 1.0 에 가까울수록 강한 양의 상관, -1.0 에 가까울수록 강한 역상관입니다.",
      tables: [
        {
          title: "상관계수 매트릭스",
          columns: ["센서", "APC_PRESSURE", "RF_FORWARD", "GAS_FLOW", "TEMP"],
          rows: [
            { 센서: "APC_PRESSURE", APC_PRESSURE: 1.00, RF_FORWARD: 0.82, GAS_FLOW: -0.41, TEMP: 0.18 },
            { 센서: "RF_FORWARD",   APC_PRESSURE: 0.82, RF_FORWARD: 1.00, GAS_FLOW: -0.35, TEMP: 0.22 },
            { 센서: "GAS_FLOW",     APC_PRESSURE: -0.41, RF_FORWARD: -0.35, GAS_FLOW: 1.00, TEMP: -0.08 },
            { 센서: "TEMP",         APC_PRESSURE: 0.18, RF_FORWARD: 0.22, GAS_FLOW: -0.08, TEMP: 1.00 },
          ],
        },
      ],
    },
  ],
};
