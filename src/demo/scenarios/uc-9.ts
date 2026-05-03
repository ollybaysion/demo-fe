/**
 * UC-9: 시점 간 비교 — 지난주 vs 이번주 (#62)
 *
 * 두 시점 겹침 라인 차트 + 기간 통계.
 */

import type { Scenario } from "./types";

const WEEK_COMPARE: readonly Record<string, unknown>[] = Array.from(
  { length: 24 },
  (_, i) => {
    const time = `${String(i).padStart(2, "0")}:00`;
    const last = 0.92 + 0.05 * Math.sin(i / 3);
    const curr = last * 1.05 + 0.02 * Math.cos(i / 2);
    return {
      "요일·시간": time,
      지난주: Number(last.toFixed(3)),
      이번주: Number(curr.toFixed(3)),
    };
  },
);

export const uc9: Scenario = {
  id: "uc-9",
  starter: "지난주와 이번주 추세를 비교하고 싶습니다.",
  contextPanel: [],
  turns: [
    {
      user: "지난주와 이번주 추세를 비교하고 싶습니다.",
      assistant: "비교할 센서를 알려주세요. 예시 시점 비교를 바로 보여드릴 수 있습니다.",
      recommendQuestion: [
        "예시 시점 비교",
        "센서 직접 입력",
        "비교 가능한 기간 단위",
      ],
    },
    {
      user: "예시 시점 비교",
      assistant: "지난주 vs 이번주 APC_PRESSURE 비교입니다. **이번주 평균이 5% 상승** 했습니다.",
      contextPanel: [
        {
          id: "uc9-eq-1",
          equipment: "ETCH-01",
          chambers: [
            {
              id: "uc9-ch-1",
              name: "A",
              sensors: [{ id: "uc9-sn-1", name: "APC_PRESSURE" }],
            },
          ],
        },
      ],
      charts: [
        {
          type: "line",
          data: WEEK_COMPARE.slice(),
          options: {
            title: "APC_PRESSURE — 지난주 vs 이번주",
            xKey: "요일·시간",
            yKeys: ["지난주", "이번주"],
            yLabel: "Pressure (Torr)",
          },
        },
      ],
      tables: [
        {
          title: "기간 통계",
          columns: ["기간", "평균", "표준편차", "최대", "최소", "이상 횟수"],
          rows: [
            { 기간: "지난주", 평균: 0.94, 표준편차: 0.04, 최대: 1.02, 최소: 0.86, "이상 횟수": 0 },
            { 기간: "이번주", 평균: 0.99, 표준편차: 0.05, 최대: 1.08, 최소: 0.90, "이상 횟수": 2 },
          ],
        },
      ],
      recommendQuestion: [
        "차이 원인을 알려주세요",
        "다른 센서도 동일 비교",
        "지난달과 추가 비교",
      ],
    },
    {
      user: "차이 원인을 알려주세요",
      assistant: "가능 가설과 검증 항목입니다.",
      tables: [
        {
          title: "가설 / 검증",
          columns: ["가설", "근거", "검증 방법", "우선순위"],
          rows: [
            { 가설: "Pump 효율 저하", 근거: "이번주 평균 +5%, 변동성 +", 검증: "Pump 회전수 비교", 우선순위: "높음" },
            { 가설: "Recipe 변경", 근거: "이번주 화요일 v3.2 반영", 검증: "변경 전후 평균 비교", 우선순위: "중간" },
            { 가설: "주변 챔버 영향", 근거: "—", 검증: "동시점 옆 챔버 추세", 우선순위: "낮음" },
          ],
        },
      ],
    },
  ],
};
