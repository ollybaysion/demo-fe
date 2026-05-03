/**
 * UC-5: 설비 멈춤(EMO) 원인 진단 (#58)
 *
 * 직전 알람 시퀀스 + 멀티 센서 추세 + 알람·EMO 시점 마커 + 권고 점검.
 */

import type { Scenario } from "./types";

const EMO_TREND: readonly Record<string, unknown>[] = Array.from(
  { length: 60 },
  (_, i) => {
    const m = String(i).padStart(2, "0");
    const isLate = i >= 32;
    return {
      시간: `13:${m}`,
      APC_PRESSURE: Number((0.85 + (isLate ? 0.02 * (i - 32) : 0.04 * Math.sin(i / 3))).toFixed(3)),
      RF_FORWARD: Math.round(1720 + (isLate ? 15 * (i - 32) : 25 * Math.sin(i / 3))),
      TEMP: Math.round(240 + (i >= 32 ? 0.4 * (i - 32) : 0)),
    };
  },
);

export const uc5: Scenario = {
  id: "uc-5",
  starter: "설비가 갑자기 멈췄습니다. 원인이 궁금합니다.",
  contextPanel: [],
  turns: [
    {
      user: "설비가 갑자기 멈췄습니다. 원인이 궁금합니다.",
      assistant: "멈춘 설비를 알려주세요. 예시 설비로 바로 분석할 수 있습니다.",
      recommendQuestion: [
        "예시 설비로 분석",
        "우리 설비를 직접 입력하겠습니다",
        "멈춤 일반 원인 카탈로그",
      ],
    },
    {
      user: "예시 설비로 분석",
      assistant: "ETCH-01의 EMO 트리거 시점은 **13:45** 입니다. 직전 30분 알람 시퀀스와 주요 센서 추세입니다.",
      contextPanel: [
        {
          id: "uc5-eq-1",
          equipment: "ETCH-01",
          chambers: [
            {
              id: "uc5-ch-1",
              name: "A",
              sensors: [
                { id: "uc5-sn-1", name: "APC_PRESSURE" },
                { id: "uc5-sn-2", name: "RF_FORWARD" },
                { id: "uc5-sn-3", name: "TEMP" },
              ],
            },
          ],
        },
      ],
      tables: [
        {
          title: "직전 알람 시퀀스",
          columns: ["시간", "알람 코드", "내용", "심각도", "확인"],
          rows: [
            { 시간: "13:18", "알람 코드": "TEMP_TREND", 내용: "TEMP 점진적 상승", 심각도: "info", 확인: "—" },
            { 시간: "13:25", "알람 코드": "RF_VAR", 내용: "RF_FORWARD 변동성 증가", 심각도: "info", 확인: "—" },
            { 시간: "13:32", "알람 코드": "TEMP_HI", 내용: "TEMP 상승 경고", 심각도: "warning", 확인: "조치 중" },
            { 시간: "13:35", "알람 코드": "APC_DRIFT", 내용: "압력 드리프트 시작", 심각도: "warning", 확인: "—" },
            { 시간: "13:38", "알람 코드": "RF_REFL", 내용: "RF_REFLECTED 비정상", 심각도: "warning", 확인: "—" },
            { 시간: "13:43", "알람 코드": "RF_FW_HI", 내용: "RF_FORWARD 임계 초과", 심각도: "critical", 확인: "—" },
            { 시간: "13:44", "알람 코드": "GAS_FLOW", 내용: "GAS_FLOW 급변", 심각도: "critical", 확인: "—" },
            { 시간: "13:45", "알람 코드": "EMO", 내용: "Emergency Off 트리거", 심각도: "critical", 확인: "—" },
          ],
        },
      ],
      charts: [
        {
          type: "line",
          data: EMO_TREND.slice(),
          options: {
            title: "EMO 직전 1시간 주요 센서",
            xKey: "시간",
            yKeys: ["APC_PRESSURE", "RF_FORWARD", "TEMP"],
            referenceLines: [
              { axis: "x", value: "13:32", label: "TEMP 상승 경고" },
              { axis: "x", value: "13:38", label: "RF_REFLECTED 비정상" },
              { axis: "x", value: "13:43", label: "RF_FORWARD 임계" },
              { axis: "x", value: "13:44", label: "GAS_FLOW 급변" },
              { axis: "x", value: "13:45", label: "EMO 트리거" },
            ],
          },
        },
      ],
      recommendQuestion: [
        "가장 가능성 높은 원인을 알려주세요",
        "알람 코드 의미 설명",
        "복구 절차 안내",
      ],
    },
    {
      user: "가장 가능성 높은 원인을 알려주세요",
      assistant:
        "**13:43 RF_FORWARD 비정상** + **13:44 GAS_FLOW 급변** 이 EMO 직접 트리거로 보입니다. 권고 점검 항목입니다.",
      tables: [
        {
          title: "권고 점검 항목",
          columns: ["순서", "점검 대상", "방법", "예상 소요"],
          rows: [
            { 순서: 1, "점검 대상": "RF Generator 출력단", 방법: "전류·전압 파형 측정", "예상 소요": "30 분" },
            { 순서: 2, "점검 대상": "RF Match Tuner", 방법: "튜너 위치·반사파 확인", "예상 소요": "20 분" },
            { 순서: 3, "점검 대상": "GAS_FLOW MFC", 방법: "응답 시정수·setpoint 비교", "예상 소요": "30 분" },
            { 순서: 4, "점검 대상": "TEMP TC1/TC2", 방법: "센서 보정 확인", "예상 소요": "15 분" },
            { 순서: 5, "점검 대상": "안전 인터록 로그", 방법: "PLC 인터록 시퀀스 dump", "예상 소요": "10 분" },
          ],
        },
      ],
    },
  ],
};
