/**
 * UC-12: 알람 threshold 조정 가이드
 */

import type { Scenario } from "./types";

export const uc12: Scenario = {
  id: "uc-12",
  starter: "알람 threshold는 어떻게 조정하나요?",
  contextPanel: [],
  turns: [
    {
      user: "알람 threshold는 어떻게 조정하나요?",
      assistant:
        "threshold 종류와 권장 범위입니다. 조정 시 **false alarm 비율** 과 **누락 알람** 사이의 트레이드오프를 고려해야 합니다.",
      tables: [
        {
          title: "threshold 종류 / 권장 범위",
          columns: ["threshold 종류", "용도", "권장 하한", "권장 상한", "주의"],
          rows: [
            { "threshold 종류": "절대값", 용도: "센서별 안전 한계", "권장 하한": "spec −5%", "권장 상한": "spec +5%", 주의: "spec 출처 명확화" },
            { "threshold 종류": "이동평균 편차", 용도: "트렌드 변화 감지", "권장 하한": "−2σ", "권장 상한": "+2σ", 주의: "이동창 길이 균형" },
            { "threshold 종류": "Z-score", 용도: "통계적 이상 감지", "권장 하한": "−3", "권장 상한": "+3", 주의: "비정규 분포 시 부적합" },
            { "threshold 종류": "변화율", 용도: "급변 감지", "권장 하한": "−10%/min", "권장 상한": "+10%/min", 주의: "센서 노이즈 고려" },
            { "threshold 종류": "조합", 용도: "복합 조건", "권장 하한": "—", "권장 상한": "—", 주의: "AND/OR 명확히" },
          ],
        },
      ],
      recommendQuestion: [
        "false alarm을 줄이는 방법",
        "현재 설정 확인 방법",
        "권장값 출처",
      ],
    },
    {
      user: "false alarm을 줄이는 방법",
      assistant: "false alarm 을 줄이는 흔한 조정 패턴입니다.",
      tables: [
        {
          title: "false alarm 감소 패턴",
          columns: ["패턴", "조정 방향", "예상 효과", "주의"],
          rows: [
            { 패턴: "hysteresis 적용", "조정 방향": "임계 이상 ON, 임계−Δ 이하 OFF", "예상 효과": "경계값 진동 감소", 주의: "진짜 이상도 OFF 될 수 있음" },
            { 패턴: "min duration", "조정 방향": "초과 N초 이상 지속 시 발화", "예상 효과": "순간 노이즈 무시", 주의: "긴급 케이스 대응 지연" },
            { 패턴: "rate-of-change 추가", "조정 방향": "변화율 + 절대값 조합", "예상 효과": "정적 잡음 무시", 주의: "급변 케이스도 무시 가능" },
            { 패턴: "센서별 분리", "조정 방향": "센서마다 별도 임계", "예상 효과": "기준 정밀도 ↑", 주의: "운영 복잡도 증가" },
          ],
        },
      ],
    },
  ],
};
