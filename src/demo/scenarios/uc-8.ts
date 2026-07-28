/**
 * UC-8: 동종설비 baseline 대비 차이 확인
 *
 * 두 설비 비교 표 + 차이 원인 가설.
 */

import type { Scenario } from "./types";

export const uc8: Scenario = {
  id: "uc-8",
  starter: "동종설비와 비교 분석을 원합니다.",
  turns: [
    {
      user: "동종설비와 비교 분석을 원합니다.",
      assistant:
        "컨텍스트 패널 안쪽 슬라이드 핸들로 설비 상세 패널을 여시면 동종설비를 비교할 수 있습니다. 예시 비교를 바로 보여드릴 수 있습니다.",
      recommendQuestion: [
        "예시 비교를 보여주세요",
        "동종설비 정의가 궁금합니다",
        "baseline 기준 출처",
      ],
    },
    {
      user: "예시 비교를 보여주세요",
      assistant:
        "ETCH-01과 ETCH-02 비교입니다. 주요 차이는 **챔버 A의 APC_PRESSURE** 에서 발견됩니다.",
      tables: [
        {
          title: "두 설비 주요 센서 비교",
          columns: ["센서", "ETCH-01 평균", "ETCH-02(baseline) 평균", "차이(%)", "이상 여부"],
          rows: [
            { 센서: "APC_PRESSURE",  "ETCH-01 평균": 1.02, "ETCH-02(baseline) 평균": 0.94, "차이(%)": "+8.5", "이상 여부": "주의" },
            { 센서: "RF_FORWARD",    "ETCH-01 평균": 1740, "ETCH-02(baseline) 평균": 1720, "차이(%)": "+1.2", "이상 여부": "정상" },
            { 센서: "RF_REFLECTED",  "ETCH-01 평균": 18,   "ETCH-02(baseline) 평균": 14,   "차이(%)": "+28.6", "이상 여부": "주의" },
            { 센서: "TEMP_TC1",      "ETCH-01 평균": 244,  "ETCH-02(baseline) 평균": 243,  "차이(%)": "+0.4", "이상 여부": "정상" },
            { 센서: "TEMP_TC2",      "ETCH-01 평균": 242,  "ETCH-02(baseline) 평균": 241,  "차이(%)": "+0.4", "이상 여부": "정상" },
            { 센서: "GAS_FLOW_SiH4", "ETCH-01 평균": 198,  "ETCH-02(baseline) 평균": 200,  "차이(%)": "-1.0", "이상 여부": "정상" },
            { 센서: "GAS_FLOW_NH3",  "ETCH-01 평균": 49,   "ETCH-02(baseline) 평균": 50,   "차이(%)": "-2.0", "이상 여부": "정상" },
            { 센서: "EPD_INTENSITY", "ETCH-01 평균": 1640, "ETCH-02(baseline) 평균": 1700, "차이(%)": "-3.5", "이상 여부": "정상" },
          ],
        },
      ],
      recommendQuestion: [
        "차이 원인을 알려주세요",
        "다른 동종설비도 비교",
        "baseline 기준 시점 확인",
      ],
    },
    {
      user: "차이 원인을 알려주세요",
      assistant: "APC_PRESSURE 차이의 가능 원인 가설입니다.",
      tables: [
        {
          title: "가설 / 검증",
          columns: ["가설", "근거", "검증", "우선순위"],
          rows: [
            { 가설: "Pump 효율 저하", 근거: "RF reflected +28% 동반", 검증: "Pump 압력 차 측정", 우선순위: "높음" },
            { 가설: "최근 PM 미실시", 근거: "ETCH-02 는 2주 전 PM, ETCH-01 는 6주 전", 검증: "PM 일정 확인", 우선순위: "중간" },
            { 가설: "센서 캘리브레이션 차이", 근거: "—", 검증: "교차 측정", 우선순위: "낮음" },
          ],
        },
      ],
    },
  ],
};
