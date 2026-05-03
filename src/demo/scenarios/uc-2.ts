/**
 * UC-2: 스파이크/딥 원인 추적
 *
 * 이상 피크 시점의 인접 이벤트와 가설을 추적.
 */

import type { Scenario } from "./types";

export const uc2: Scenario = {
  id: "uc-2",
  starter: "특정 시점의 스파이크 원인이 궁금합니다.",
  contextPanel: [],
  turns: [
    {
      user: "특정 시점의 스파이크 원인이 궁금합니다.",
      assistant: "분석할 시점과 센서를 알려주세요. 추천을 통해 예시 데이터로 바로 시작할 수 있습니다.",
      recommendQuestion: [
        "예시 스파이크 데이터로 시작",
        "특정 시간대를 직접 입력하겠습니다",
        "스파이크 판단 기준이 궁금해요",
      ],
    },
    {
      user: "예시 스파이크 데이터로 시작",
      assistant: "14:20 경 평소 대비 1.8배 높은 스파이크가 관측됩니다. 직전·직후 5분 이벤트는 다음과 같습니다.",
      contextPanel: [
        {
          id: "uc2-eq-1",
          equipment: "ETCH-01",
          chambers: [
            {
              id: "uc2-ch-1",
              name: "A",
              sensors: [{ id: "uc2-sn-1", name: "APC_PRESSURE" }],
            },
          ],
        },
      ],
      timeRange: { start: "2026-05-03T14:00", end: "2026-05-03T15:00" },
      charts: [
        {
          type: "line",
          data: Array.from({ length: 60 }, (_, i) => {
            const m = String(i).padStart(2, "0");
            const baseline = 0.85;
            const isSpike = i >= 19 && i <= 21;
            return {
              시간: `14:${m}`,
              "측정값(Torr)": Number(
                (isSpike ? baseline * 1.8 : baseline + 0.04 * Math.sin(i / 3)).toFixed(2),
              ),
            };
          }),
          options: {
            title: "APC_PRESSURE — 14:00~15:00 스파이크",
            xKey: "시간",
            yKeys: ["측정값(Torr)"],
            yLabel: "Pressure (Torr)",
            referenceLines: [
              { axis: "x", value: "14:18", label: "RF_FORWARD 경고" },
              { axis: "x", value: "14:20", label: "스파이크 감지" },
              { axis: "x", value: "14:22", label: "Recipe step 변경" },
            ],
          },
        },
      ],
      tables: [
        {
          title: "스파이크 ±5분 인접 이벤트",
          columns: ["시간", "이벤트", "타입", "심각도"],
          rows: [
            { 시간: "14:15", 이벤트: "이전 STEP 종료", 타입: "step_end", 심각도: "info" },
            { 시간: "14:16", 이벤트: "PMC 안정화", 타입: "system", 심각도: "info" },
            { 시간: "14:17", 이벤트: "MFC 재조정", 타입: "system", 심각도: "info" },
            { 시간: "14:18", 이벤트: "RF_FORWARD 경고", 타입: "alarm", 심각도: "warning" },
            { 시간: "14:19", 이벤트: "TEMP 상승 트렌드", 타입: "trend", 심각도: "warning" },
            { 시간: "14:20", 이벤트: "APC_PRESSURE 스파이크", 타입: "spike", 심각도: "critical" },
            { 시간: "14:21", 이벤트: "RF reflected 증가", 타입: "trend", 심각도: "warning" },
            { 시간: "14:22", 이벤트: "Recipe step 변경", 타입: "recipe_change", 심각도: "info" },
            { 시간: "14:23", 이벤트: "MFC 재조정", 타입: "system", 심각도: "info" },
            { 시간: "14:25", 이벤트: "안정화 완료", 타입: "system", 심각도: "info" },
          ],
        },
      ],
      recommendQuestion: [
        "원인 가설을 알려주세요",
        "동시점 다른 센서도 확인",
        "동종설비 동시점 비교",
      ],
    },
    {
      user: "원인 가설을 알려주세요",
      assistant: "가능성 높은 가설은 다음 3가지입니다. 각 가설별 검증 항목을 함께 보여드립니다.",
      tables: [
        {
          title: "가설 및 검증 항목",
          columns: ["가설", "근거", "검증 방법", "우선순위"],
          rows: [
            {
              가설: "RF 매칭 불안정 → 압력 응답 변동",
              근거: "스파이크 2분 전 RF_FORWARD 경고, 이후 reflected 증가",
              검증: "RF tuner 점검 + reflected 추세 재측정",
              우선순위: "높음",
            },
            {
              가설: "MFC setpoint 응답 지연",
              근거: "스파이크 시점 GAS_FLOW 미세 진동",
              검증: "MFC 응답 시정수 측정",
              우선순위: "중간",
            },
            {
              가설: "이전 STEP 잔여 가스 영향",
              근거: "step_end ~ spike 5분 간격",
              검증: "POST_PURGE 시간 연장 시뮬레이션",
              우선순위: "낮음",
            },
          ],
        },
      ],
    },
  ],
};
