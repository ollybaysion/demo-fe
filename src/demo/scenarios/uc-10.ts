/**
 * UC-10: STEP/레시피 간 비교 (#63)
 *
 * 두 STEP 의 같은 센서 거동 비교 + STEP 영향 평가.
 */

import type { Scenario } from "./types";

const STEP_COMPARE: readonly Record<string, unknown>[] = Array.from(
  { length: 30 },
  (_, i) => {
    const t = `${String(i * 4).padStart(2, "0")}s`;
    return {
      "공정 시간": t,
      STEP1: Number((1.20 + 0.03 * Math.sin(i / 3)).toFixed(3)),
      STEP2: Number((1.20 + 0.05 * Math.sin(i / 2) + 0.04 * Math.cos(i)).toFixed(3)),
    };
  },
);

export const uc10: Scenario = {
  id: "uc-10",
  starter: "STEP 1과 STEP 2의 같은 센서 거동을 비교하고 싶습니다.",
  contextPanel: [],
  turns: [
    {
      user: "STEP 1과 STEP 2의 같은 센서 거동을 비교하고 싶습니다.",
      assistant: "비교할 STEP과 센서를 알려주세요. 예시 STEP 비교로 바로 시작할 수 있습니다.",
      recommendQuestion: [
        "예시 STEP 비교",
        "STEP 정의가 궁금해요",
        "비교 가능한 STEP 조합",
      ],
    },
    {
      user: "예시 STEP 비교",
      assistant: "STEP1 vs STEP2 APC_PRESSURE 거동입니다. **STEP2 에서 변동성이 30% 더 큽니다.**",
      contextPanel: [
        {
          id: "uc10-eq-1",
          equipment: "ETCH-01",
          chambers: [
            {
              id: "uc10-ch-1",
              name: "A",
              sensors: [{ id: "uc10-sn-1", name: "APC_PRESSURE" }],
            },
          ],
        },
      ],
      charts: [
        {
          type: "line",
          data: STEP_COMPARE.slice(),
          options: {
            title: "STEP1 vs STEP2 APC_PRESSURE",
            xKey: "공정 시간",
            yKeys: ["STEP1", "STEP2"],
            yLabel: "Pressure (Torr)",
          },
        },
      ],
      tables: [
        {
          title: "STEP별 통계",
          columns: ["STEP", "평균", "표준편차", "Peak", "공정 시간(s)", "이상 횟수"],
          rows: [
            { STEP: "STEP1", 평균: 1.20, 표준편차: 0.022, Peak: 1.26, "공정 시간(s)": 120, "이상 횟수": 0 },
            { STEP: "STEP2", 평균: 1.21, 표준편차: 0.058, Peak: 1.34, "공정 시간(s)": 120, "이상 횟수": 1 },
          ],
        },
      ],
      recommendQuestion: [
        "공정 영향 평가해주세요",
        "STEP3도 추가 비교",
        "다른 센서도 STEP 비교",
      ],
    },
    {
      user: "공정 영향 평가해주세요",
      assistant: "STEP2 변동성이 결과 품질에 미치는 영향과 권고입니다.",
      tables: [
        {
          title: "영향 평가 / 권고",
          columns: ["영향 항목", "정도", "권고", "우선순위"],
          rows: [
            { "영향 항목": "Etch rate 균일도", 정도: "중간", 권고: "STEP2 RF 매칭 재튜닝", 우선순위: "높음" },
            { "영향 항목": "막질 균일도", 정도: "낮음", 권고: "추가 검사 후 조치", 우선순위: "중간" },
            { "영향 항목": "공정 시간 변동", 정도: "낮음", 권고: "—", 우선순위: "낮음" },
            { "영향 항목": "수율 영향 추정", 정도: "관찰 필요", 권고: "30 lot 추적 후 재평가", 우선순위: "중간" },
          ],
        },
      ],
    },
  ],
};
