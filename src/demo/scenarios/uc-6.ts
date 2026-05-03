/**
 * UC-6: GasLeak / RF 과부하 알람 대응
 *
 * 대응 체크리스트 + 누설량 area 차트.
 */

import type { Scenario } from "./types";

const LEAK_TREND: readonly Record<string, unknown>[] = Array.from(
  { length: 30 },
  (_, i) => {
    const m = String(i).padStart(2, "0");
    const ppm = i < 12 ? 8 + i * 0.3 : i < 18 ? 12 + (i - 12) * 4 : 36 + (i - 18) * 1.2;
    return { 시간: `13:${m}`, "누설량(ppm)": Number(ppm.toFixed(1)) };
  },
);

export const uc6: Scenario = {
  id: "uc-6",
  starter: "GasLeak 알람이 발생했습니다. 어떻게 대응해야 하나요?",
  contextPanel: [],
  turns: [
    {
      user: "GasLeak 알람이 발생했습니다. 어떻게 대응해야 하나요?",
      assistant: "GasLeak 알람의 즉시 대응 절차입니다. 단계 순서대로 진행해주세요.",
      tables: [
        {
          title: "GasLeak 대응 체크리스트",
          columns: ["순서", "대응 항목", "담당", "소요 시간", "보고 대상"],
          rows: [
            { 순서: 1, "대응 항목": "공정 정지 (chamber pump down)", 담당: "운영자", "소요 시간": "1 분", "보고 대상": "—" },
            { 순서: 2, "대응 항목": "가스 라인 메인 밸브 차단", 담당: "운영자", "소요 시간": "1 분", "보고 대상": "—" },
            { 순서: 3, "대응 항목": "주변 인원 대피 안내", 담당: "운영자", "소요 시간": "2 분", "보고 대상": "라인장" },
            { 순서: 4, "대응 항목": "FDC 누설량 추세 확인 (본 채팅)", 담당: "엔지니어", "소요 시간": "5 분", "보고 대상": "—" },
            { 순서: 5, "대응 항목": "MOC 보고 + 점검 의뢰", 담당: "엔지니어", "소요 시간": "10 분", "보고 대상": "MOC 안전팀" },
            { 순서: 6, "대응 항목": "재가동 전 누설 검사 결과 확인", 담당: "엔지니어", "소요 시간": "30 분", "보고 대상": "라인장 + MOC" },
          ],
        },
      ],
      recommendQuestion: [
        "현재 누설량 추세를 보여주세요",
        "긴급 정지 절차",
        "보고 양식",
      ],
    },
    {
      user: "현재 누설량 추세를 보여주세요",
      assistant: "최근 30분 누설량 추세입니다. **13:42 임계치 초과** 후 상승 중입니다.",
      contextPanel: [
        {
          id: "uc6-eq-1",
          equipment: "ETCH-01",
          chambers: [
            {
              id: "uc6-ch-1",
              name: "A",
              sensors: [{ id: "uc6-sn-1", name: "GAS_LEAK" }],
            },
          ],
        },
      ],
      charts: [
        {
          type: "area",
          data: LEAK_TREND.slice(),
          options: {
            title: "누설량 추세",
            xKey: "시간",
            yKeys: ["누설량(ppm)"],
            yLabel: "GasLeak (ppm)",
            referenceLines: [
              { axis: "y", value: 10, label: "임계치 (10 ppm)", dashed: true },
              { axis: "x", value: "13:12", label: "GasLeak 임계 초과" },
              { axis: "x", value: "13:20", label: "GasLeak 추가 상승" },
            ],
          },
        },
      ],
    },
  ],
};
