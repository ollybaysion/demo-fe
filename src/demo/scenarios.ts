/**
 * 데모 시나리오 — 발표/녹화에서 동일 흐름을 안정적으로 재생하기 위한
 * 정의된 대화 스크립트.
 *
 * 클릭 → starter 가 첫 user 메시지로 보내지고, 컨텍스트 패널이
 * contextPanel 행으로 자동 채워지며, assistant가 turns[0].assistant
 * 를 스트리밍 응답으로 돌려준다. 이후 turn마다 다음 user 메시지가
 * ghost text로 입력창에 노출, Enter 만으로 전송.
 *
 * #31 마크다운 렌더링 검증을 위해 분석 답변 턴들에 헤딩 / 리스트 /
 * 표 / 인용 / 코드 블럭 / 인라인 코드 / 강조·취소선 / 외부 링크 등이
 * 한 번씩 등장하도록 분포시켜 둠.
 */

import type { ContextRow, MessageChart, MessageTable } from "@/lib/types";

export type ScenarioTurn = {
  user: string;
  assistant: string;
  /**
   * 이 턴의 user 메시지가 전송될 때 컨텍스트 패널을 이 행들로 교체.
   * 시나리오 도중 사용자가 설비를 명시하면 패널이 채워지는 흐름을
   * 시연할 때 사용.
   */
  contextPanel?: ContextRow[];
  /** 이 턴 user 메시지 전송 시 발생 시간을 함께 갱신. */
  timeRange?: { start: string; end: string };
  /**
   * Paired data table (#34). 백엔드 페이로드 구조를 그대로 모킹 —
   * 어시스턴트 메시지의 좌측 gutter 에 표로 paired 되어 보임.
   */
  table?: MessageTable;
  /**
   * Paired chart (#37). 어시스턴트 메시지의 우측 gutter 에 차트로 paired.
   */
  chart?: MessageChart;
};

export type Scenario = {
  id: string;
  /** 시작 박스 라벨이자 첫 사용자 메시지로 그대로 전송됨. */
  starter: string;
  /** 시나리오 시작(starter 클릭) 시 컨텍스트 패널에 자동 채워지는 설비 행들. */
  contextPanel: ContextRow[];
  /** 시나리오 시작 시 적용할 발생 시간 (선택). 비우면 패널 기본값(오늘) 유지. */
  timeRange?: { start: string; end: string };
  /**
   * turns[0]: starter 에 대한 첫 assistant 응답
   * turns[1..]: ghost text(user) + assistant
   * 각 턴마다 추가로 contextPanel / timeRange 를 가질 수 있음.
   */
  turns: ScenarioTurn[];
};

// data-shape 시나리오의 APC_PRESSURE 시계열 — 표(#34) 와 차트(#37) 가
// 같은 데이터를 공유해 시각적 일관성 유지.
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

export const SCENARIOS: readonly Scenario[] = [
  {
    id: "data-shape",
    starter: "설비 데이터가 왜 이렇게 발생했는지 궁금합니다.",
    contextPanel: [],
    turns: [
      {
        user: "설비 데이터가 왜 이렇게 발생했는지 궁금합니다.",
        assistant:
          "설비 정보와 발생 시간을 입력해주세요. 메시지로 입력하거나 오른쪽 패널을 활용해주세요. 이미지도 가능합니다.",
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
        // 좌측 paired 표(#34) + 우측 paired 차트(#37) 가 같은 시계열을
        // 공유. STEP 종료 시점인 09:06:00 부근에서 최댓값 3.00 으로 피크.
        table: {
          columns: ["timestamp", "step", "APC_PRESSURE (mTorr)"],
          rows: APC_PRESSURE_TREND.slice(),
        },
        chart: {
          type: "line",
          data: APC_PRESSURE_TREND.slice(),
          options: {
            title: "APC_PRESSURE (mTorr) — 09:00~09:10 트렌드",
            xKey: "timestamp",
            yKeys: ["APC_PRESSURE (mTorr)"],
            xLabel: "시각",
            yLabel: "mTorr",
            referenceLines: [
              // 수평선: 임계값 (점선)
              { axis: "y", value: 3.0, label: "Max 3.0", dashed: true },
              // 수직선: 피크 시각 (실선)
              { axis: "x", value: "09:06:00", label: "Peak" },
            ],
          },
        },
        contextPanel: [
          {
            id: "demo-shape-eq-1",
            equipment: "ETCH-02",
            chambers: [
              {
                id: "demo-shape-ch-1",
                name: "A",
                sensors: [
                  { id: "demo-shape-sn-1", name: "APC_PRESSURE" },
                ],
              },
            ],
          },
        ],
        timeRange: {
          start: "2026-05-02T09:00",
          end: "2026-05-02T09:10",
        },
      },
    ],
  },
  {
    id: "no-data",
    starter: "설비 데이터가 발생하지 않았는데 그 이유가 궁금합니다.",
    contextPanel: [],
    turns: [
      {
        user: "설비 데이터가 발생하지 않았는데 그 이유가 궁금합니다.",
        assistant:
          "설비 정보와 발생 시간을 입력해주세요. 메시지로 입력하거나 오른쪽 패널을 활용해주세요. 이미지도 가능합니다.",
      },
      {
        user: "ETCH-03 설비 B 챔버 TEMP_TC1 센서 14:00부터 14:30까지 입니다.",
        assistant: [
          "### TEMP_TC1 센서 분석",
          "",
          "이 센서는 **BAKE STEP 진행 중 최댓값**입니다. 먼저 데이터 수집 기준 정보를 조회했습니다.",
          "",
          "트리거 조건이 잘못 설정되어 있습니다:",
          "",
          "1. 입력되어야 할 값: `BAKE STEP 종료 시점`",
          "2. 실제 입력된 값: ~~`NEXT STEP 시작 시점`~~",
          "",
          "따라서 트리거를 `STEP_END` 로 수정해야 합니다:",
          "",
          "```yaml",
          "trigger:",
          "  type: STEP_END",
          "  step_name: BAKE",
          "```",
          "",
          "수정 후 BAKE STEP 종료 시점부터 데이터가 정상적으로 발생합니다.",
        ].join("\n"),
        contextPanel: [
          {
            id: "demo-nodata-eq-1",
            equipment: "ETCH-03",
            chambers: [
              {
                id: "demo-nodata-ch-1",
                name: "B",
                sensors: [{ id: "demo-nodata-sn-1", name: "TEMP_TC1" }],
              },
            ],
          },
        ],
        timeRange: {
          start: "2026-05-02T14:00",
          end: "2026-05-02T14:30",
        },
      },
    ],
  },
  {
    id: "stopped",
    starter: "설비가 멈췄는데 그 이유가 궁금합니다.",
    contextPanel: [
      {
        id: "demo-stopped-eq-1",
        equipment: "CVD-03",
        chambers: [
          {
            id: "demo-stopped-ch-1",
            name: "B",
            sensors: [
              { id: "demo-stopped-sn-1", name: "TEMP_TC1" },
              { id: "demo-stopped-sn-2", name: "GAS_FLOW_SiH4" },
            ],
          },
        ],
      },
    ],
    turns: [
      {
        user: "설비가 멈췄는데 그 이유가 궁금합니다.",
        assistant: [
          "### CVD-03 챔버 B 알람 이력",
          "",
          "발생 시간 ±10분 내 알람 기록입니다.",
          "",
          "| 시각 | 알람 | 비고 |",
          "| --- | --- | --- |",
          "| 14:23:11 | `GasLeak` | SiH4 라인 |",
          "| 14:25:47 | `GasLeak` | SiH4 라인 (재발) |",
          "| 14:26:02 | **`EMO`** (Emergency Off) | 자동 차단 |",
          "",
          "EMO 직전의 *GasLeak* 가 멈춤의 직접 원인일 가능성이 높습니다.",
        ].join("\n"),
        table: {
          columns: ["timestamp", "alarm", "severity", "note"],
          rows: [
            { timestamp: "14:23:11", alarm: "GasLeak", severity: "warning", note: "SiH4 line" },
            { timestamp: "14:25:47", alarm: "GasLeak", severity: "warning", note: "SiH4 line (recur)" },
            { timestamp: "14:26:02", alarm: "EMO", severity: "critical", note: "Emergency Off — auto interlock" },
          ],
        },
      },
      {
        user: "GasLeak 알람의 원인 센서가 무엇인가요?",
        assistant: [
          "### MFC 측정 결과",
          "",
          "| 라인 | setpoint | 측정값 | 편차 |",
          "| --- | --- | --- | --- |",
          "| `GAS_FLOW_SiH4` | 200 sccm | 156 sccm | **−22%** |",
          "| `TEMP_TC1` | 850 ℃ | 851 ℃ | +0.1% |",
          "",
          "`GAS_FLOW_SiH4` 라인의 MFC 출력값이 setpoint 대비 22% 낮게 나와 GasLeak threshold 를 초과했습니다. 동일 시점 `TEMP_TC1` 은 정상 범위였습니다.",
          "",
          "> **권장:** MFC 자체 결함 또는 SiH4 라인 누설 가능성이 있어 [정비 점검 가이드](https://example.com/sih4-line-runbook)를 따라 점검 권장합니다.",
        ].join("\n"),
      },
    ],
  },
  {
    id: "config-help",
    starter: "설정 방법이 궁금합니다.",
    contextPanel: [],
    turns: [
      {
        user: "설정 방법이 궁금합니다.",
        assistant: [
          "## FDC Agent 기본 설정",
          "",
          "1. 우측 패널의 **설비 정보** 에 분석 대상 설비/챔버/센서를 입력",
          "2. **발생 시간** 범위를 지정 (또는 패널 하단 빠른 칩 사용)",
          "3. 채팅창에 자유롭게 질문 입력",
          "",
          "더 자세한 안내는 [공식 문서](https://example.com/docs)를 참고하세요. 더 알아볼 항목 있으신가요?",
        ].join("\n"),
      },
      {
        user: "발생 시간은 어떤 단위로 입력하나요?",
        assistant: [
          "### 발생 시간 입력 안내",
          "",
          "시작 / 종료 두 값을 다음 형식으로 입력합니다:",
          "",
          "```",
          "YYYY-MM-DDTHH:MM",
          "```",
          "",
          "예시: `2026-05-02T09:00`",
          "",
          "패널 하단 빠른 칩으로 자동 계산도 가능합니다:",
          "",
          "| 칩 | 결과 |",
          "| --- | --- |",
          "| `10분` | start + 10분 |",
          "| `30분` | start + 30분 |",
          "| `1시간` | start + 1시간 |",
          "| `하루` | start + 24시간 |",
          "",
          "기본값은 *오늘 00:00 ~ 23:59* 입니다.",
        ].join("\n"),
      },
    ],
  },
] as const;
