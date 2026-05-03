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

import type {
  ContextRow,
  MessageChartEntry,
  MessageEventTimelineEntry,
  MessageTableEntry,
} from "@/lib/types";

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
   * Paired tables (#34, #45). 좌·우 gutter 분배는 FE 가 균형 분배 +
   * 각 entry 의 `side?` 힌트 (P4). 백엔드 페이로드 구조를 그대로 모킹.
   */
  tables?: MessageTableEntry[];
  /**
   * Paired charts (#37, #45). 좌·우 분배는 tables 와 같이 처리.
   */
  charts?: MessageChartEntry[];
  /**
   * Paired event timelines (#49). Gantt 식 — 트랙별 row + 시간 구간 bars.
   */
  eventTimelines?: MessageEventTimelineEntry[];
  /**
   * 추천 후속 질문 (#40). 어시스턴트 응답 후 ChatInput 위에 chip 으로
   * 노출. 클릭 시 즉시 user 메시지로 전송.
   */
  recommendQuestion?: string[];
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
        // 다중 paired 항목 (#45) — 표 2 + 차트 2. 같은 데이터를 다른
        // 관점(시계열 / STEP별 통계)으로 두 번씩.
        tables: [
          {
            title: "APC_PRESSURE 시계열",
            columns: ["timestamp", "step", "APC_PRESSURE (mTorr)"],
            rows: APC_PRESSURE_TREND.slice(),
          },
          {
            title: "STEP별 APC_PRESSURE 통계",
            columns: ["step", "duration", "min", "avg", "max"],
            rows: [
              { step: "PRE_HEAT",   duration: "2 분", min: 0.30, avg: 0.49, max: 0.65 },
              { step: "MAIN_ETCH",  duration: "7 분", min: 1.20, avg: 2.49, max: 3.00 },
              { step: "POST_PURGE", duration: "2 분", min: 0.60, avg: 0.85, max: 1.20 },
            ],
          },
        ],
        charts: [
          {
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
              // 수직선: 피크 시각 (실선, amber default 으로 강조)
              { axis: "x", value: "09:06:00", label: "Peak" },
            ],
            // STEP 구간 — 경계 수직선 대신 영역에 라벨. MAIN_ETCH 만 옅은
            // 음영으로 구분, 양옆은 음영 없이 라벨만.
            referenceAreas: [
              {
                axis: "x",
                from: "09:00:00",
                to: "09:01:45",
                label: "PRE_HEAT",
              },
              {
                axis: "x",
                from: "09:02:00",
                to: "09:08:45",
                label: "MAIN_ETCH",
                fill: "rgba(20,20,19,0.08)",
              },
              {
                axis: "x",
                from: "09:09:00",
                to: "09:10:00",
                label: "POST_PURGE",
              },
            ],
          },
        },
          {
            type: "bar",
            data: [
              { step: "PRE_HEAT",   avg: 0.49, max: 0.65 },
              { step: "MAIN_ETCH",  avg: 2.49, max: 3.00 },
              { step: "POST_PURGE", avg: 0.85, max: 1.20 },
            ],
            options: {
              title: "STEP별 APC_PRESSURE — 평균 / 최대",
              xKey: "step",
              yKeys: ["avg", "max"],
              yLabel: "mTorr",
            },
          },
        ],
        // 공정 / STEP 타임라인 (#49). Gantt 식 — 공정 1개 + 챔버 2개의
        // STEP 시퀀스. 챔버 B 는 같은 흐름이지만 약간 offset 으로 진행.
        // 챔버 A 의 EPD 측정 / RF Tune 은 MAIN_ETCH 와 시간 겹침 →
        // sub-row stacking 동작 확인용. "이상 감지" 트랙은 cascade 형태
        // (3개 이벤트 연쇄 overlap) 으로 sub-row 가 2~3 단까지 쌓이는
        // 케이스 시각 검증.
        eventTimelines: [
          {
            title: "공정 / STEP 타임라인",
            range: { start: "09:00:00", end: "09:10:00" },
            events: [
              { track: "공정",   level: "process", start: "09:00:00", end: "09:10:00", label: "Recipe-2 batch" },
              { track: "챔버 A", level: "step",    start: "09:00:00", end: "09:01:45", label: "PRE_HEAT" },
              { track: "챔버 A", level: "step",    start: "09:02:00", end: "09:08:45", label: "MAIN_ETCH" },
              // 아래 두 개는 MAIN_ETCH 와 겹침 → 챔버 A 가 sub-row 3단으로 쌓임
              { track: "챔버 A", level: "step",    start: "09:03:00", end: "09:04:30", label: "RF Tune" },
              { track: "챔버 A", level: "step",    start: "09:04:00", end: "09:07:30", label: "EPD 측정" },
              { track: "챔버 A", level: "step",    start: "09:09:00", end: "09:10:00", label: "POST_PURGE" },
              { track: "챔버 B", level: "step",    start: "09:00:30", end: "09:02:15", label: "PRE_HEAT" },
              { track: "챔버 B", level: "step",    start: "09:02:30", end: "09:09:00", label: "MAIN_ETCH" },
              { track: "챔버 B", level: "step",    start: "09:09:15", end: "09:10:00", label: "POST_PURGE" },
              // 별도 트랙 — 연쇄 overlap (sub-row 2단)
              { track: "이상 감지", level: "step", start: "09:03:00", end: "09:05:00", label: "Pressure spike" },
              { track: "이상 감지", level: "step", start: "09:04:00", end: "09:06:30", label: "Temp warning" },
              { track: "이상 감지", level: "step", start: "09:05:30", end: "09:07:00", label: "RF reflected" },
            ],
          },
        ],
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
        recommendQuestion: [
          // 첫 chip 은 turn 2 의 user 와 동일 — ghost text / chip 클릭 흐름이
          // 동일하게 turn 2 로 자연스럽게 이어지도록 정렬 (#52)
          "다른 주요 센서들도 모두 표로 같이 보여줘",
          "동종설비와 비교해줘",
          "최근 1시간 추세는?",
        ],
      },
      // Turn 2 — wide-table edge case (#42 검증용). 16개 칼럼의 센서
      // 스냅샷 표를 반환해 좌측 gutter 폭을 초과하는 경우의 동작을
      // 시각 확인할 수 있게.
      {
        user: "다른 주요 센서들도 모두 표로 같이 보여줘",
        assistant: [
          "### 챔버 A 주요 센서 16개 스냅샷",
          "",
          "09:00:00 ~ 09:10:00 구간의 1분 단위 값입니다. 칼럼이 많아 좌측 영역을 넘어가면 표 액션 그룹의 **확장** 토글로 펼쳐 보세요.",
        ].join("\n"),
        tables: [{
          title: "주요 센서 16종 스냅샷",
          columns: [
            "timestamp",
            "step",
            "APC_PRESSURE",
            "RF_FORWARD",
            "RF_REFLECTED",
            "TEMP_TC1",
            "TEMP_TC2",
            "GAS_FLOW_SiH4",
            "GAS_FLOW_NH3",
            "GAS_FLOW_Ar",
            "MFC_OPEN_RATE",
            "CHAMBER_PRESSURE",
            "ESC_CURRENT",
            "EPD_INTENSITY",
            "BIAS_VOLTAGE",
            "COIL_TEMP",
          ],
          rows: [
            { timestamp: "09:00", step: "PRE_HEAT",   APC_PRESSURE: 0.30, RF_FORWARD: 0,    RF_REFLECTED: 0,  TEMP_TC1: 180, TEMP_TC2: 175, GAS_FLOW_SiH4: 0,   GAS_FLOW_NH3: 0,  GAS_FLOW_Ar: 100, MFC_OPEN_RATE: 30, CHAMBER_PRESSURE: 0.32, ESC_CURRENT: 0.0, EPD_INTENSITY: 0,    BIAS_VOLTAGE: 0,    COIL_TEMP: 25 },
            { timestamp: "09:01", step: "PRE_HEAT",   APC_PRESSURE: 0.55, RF_FORWARD: 0,    RF_REFLECTED: 0,  TEMP_TC1: 220, TEMP_TC2: 218, GAS_FLOW_SiH4: 0,   GAS_FLOW_NH3: 0,  GAS_FLOW_Ar: 120, MFC_OPEN_RATE: 35, CHAMBER_PRESSURE: 0.58, ESC_CURRENT: 0.0, EPD_INTENSITY: 0,    BIAS_VOLTAGE: 0,    COIL_TEMP: 27 },
            { timestamp: "09:02", step: "MAIN_ETCH", APC_PRESSURE: 1.20, RF_FORWARD: 1500, RF_REFLECTED: 22, TEMP_TC1: 235, TEMP_TC2: 232, GAS_FLOW_SiH4: 200, GAS_FLOW_NH3: 50, GAS_FLOW_Ar: 100, MFC_OPEN_RATE: 62, CHAMBER_PRESSURE: 1.25, ESC_CURRENT: 1.8, EPD_INTENSITY: 1200, BIAS_VOLTAGE: -180, COIL_TEMP: 32 },
            { timestamp: "09:03", step: "MAIN_ETCH", APC_PRESSURE: 2.25, RF_FORWARD: 1620, RF_REFLECTED: 18, TEMP_TC1: 240, TEMP_TC2: 238, GAS_FLOW_SiH4: 200, GAS_FLOW_NH3: 50, GAS_FLOW_Ar: 100, MFC_OPEN_RATE: 70, CHAMBER_PRESSURE: 2.28, ESC_CURRENT: 1.9, EPD_INTENSITY: 1450, BIAS_VOLTAGE: -185, COIL_TEMP: 35 },
            { timestamp: "09:04", step: "MAIN_ETCH", APC_PRESSURE: 2.72, RF_FORWARD: 1720, RF_REFLECTED: 15, TEMP_TC1: 244, TEMP_TC2: 242, GAS_FLOW_SiH4: 200, GAS_FLOW_NH3: 50, GAS_FLOW_Ar: 100, MFC_OPEN_RATE: 76, CHAMBER_PRESSURE: 2.75, ESC_CURRENT: 2.0, EPD_INTENSITY: 1620, BIAS_VOLTAGE: -190, COIL_TEMP: 37 },
            { timestamp: "09:05", step: "MAIN_ETCH", APC_PRESSURE: 2.92, RF_FORWARD: 1810, RF_REFLECTED: 14, TEMP_TC1: 246, TEMP_TC2: 244, GAS_FLOW_SiH4: 200, GAS_FLOW_NH3: 50, GAS_FLOW_Ar: 100, MFC_OPEN_RATE: 80, CHAMBER_PRESSURE: 2.95, ESC_CURRENT: 2.1, EPD_INTENSITY: 1740, BIAS_VOLTAGE: -192, COIL_TEMP: 38 },
            { timestamp: "09:06", step: "MAIN_ETCH", APC_PRESSURE: 3.00, RF_FORWARD: 1820, RF_REFLECTED: 14, TEMP_TC1: 248, TEMP_TC2: 246, GAS_FLOW_SiH4: 200, GAS_FLOW_NH3: 50, GAS_FLOW_Ar: 100, MFC_OPEN_RATE: 82, CHAMBER_PRESSURE: 3.02, ESC_CURRENT: 2.1, EPD_INTENSITY: 1780, BIAS_VOLTAGE: -193, COIL_TEMP: 38 },
            { timestamp: "09:07", step: "MAIN_ETCH", APC_PRESSURE: 2.78, RF_FORWARD: 1780, RF_REFLECTED: 16, TEMP_TC1: 245, TEMP_TC2: 243, GAS_FLOW_SiH4: 200, GAS_FLOW_NH3: 50, GAS_FLOW_Ar: 100, MFC_OPEN_RATE: 78, CHAMBER_PRESSURE: 2.81, ESC_CURRENT: 2.0, EPD_INTENSITY: 1660, BIAS_VOLTAGE: -188, COIL_TEMP: 37 },
            { timestamp: "09:08", step: "MAIN_ETCH", APC_PRESSURE: 2.30, RF_FORWARD: 1640, RF_REFLECTED: 19, TEMP_TC1: 240, TEMP_TC2: 239, GAS_FLOW_SiH4: 200, GAS_FLOW_NH3: 50, GAS_FLOW_Ar: 100, MFC_OPEN_RATE: 71, CHAMBER_PRESSURE: 2.33, ESC_CURRENT: 1.9, EPD_INTENSITY: 1480, BIAS_VOLTAGE: -185, COIL_TEMP: 36 },
            { timestamp: "09:09", step: "POST_PURGE", APC_PRESSURE: 1.20, RF_FORWARD: 0,    RF_REFLECTED: 0,  TEMP_TC1: 232, TEMP_TC2: 231, GAS_FLOW_SiH4: 0,   GAS_FLOW_NH3: 0,  GAS_FLOW_Ar: 150, MFC_OPEN_RATE: 50, CHAMBER_PRESSURE: 1.24, ESC_CURRENT: 0.0, EPD_INTENSITY: 0,    BIAS_VOLTAGE: 0,    COIL_TEMP: 33 },
            { timestamp: "09:10", step: "POST_PURGE", APC_PRESSURE: 0.60, RF_FORWARD: 0,    RF_REFLECTED: 0,  TEMP_TC1: 215, TEMP_TC2: 214, GAS_FLOW_SiH4: 0,   GAS_FLOW_NH3: 0,  GAS_FLOW_Ar: 130, MFC_OPEN_RATE: 38, CHAMBER_PRESSURE: 0.63, ESC_CURRENT: 0.0, EPD_INTENSITY: 0,    BIAS_VOLTAGE: 0,    COIL_TEMP: 30 },
          ],
        }],
      },
      // Turn 3 — 다중 paired 항목 검증용 (#45). 표 2 + 차트 2 = 4개를
      // 한 메시지에 담아 좌·우 분배 / collapsible 카드 / 디폴트 펼침
      // 정책을 시각 확인할 수 있게.
      {
        user: "동종설비와 비교해줘",
        assistant: [
          "### 동종설비 비교 — ETCH-02 vs ETCH-01 / ETCH-03",
          "",
          "같은 모델(EtcherX-2000)의 다른 두 설비와 MAIN_ETCH STEP 핵심 지표를 비교했습니다.",
          "",
          "ETCH-02 가 동종설비 평균 대비 APC_PRESSURE 피크가 약간 높은 편이지만 모두 정상 범위 내.",
        ].join("\n"),
        tables: [
          {
            title: "MAIN_ETCH 지표 — 현재 설비",
            columns: ["metric", "value"],
            rows: [
              { metric: "APC_PRESSURE 최댓값", value: "3.00 mTorr" },
              { metric: "RF_FORWARD 평균", value: "1,720 W" },
              { metric: "STEP 지속 시간", value: "6 분 45 초" },
              { metric: "EPD 종료 신호", value: "정상 (1,780)" },
            ],
          },
          {
            title: "MAIN_ETCH 지표 — 동종설비 평균",
            columns: ["metric", "ETCH-01", "ETCH-03"],
            rows: [
              { metric: "APC_PRESSURE 최댓값", "ETCH-01": "2.85 mTorr", "ETCH-03": "2.92 mTorr" },
              { metric: "RF_FORWARD 평균", "ETCH-01": "1,680 W", "ETCH-03": "1,710 W" },
              { metric: "STEP 지속 시간", "ETCH-01": "6 분 50 초", "ETCH-03": "6 분 40 초" },
              { metric: "EPD 종료 신호", "ETCH-01": "정상 (1,690)", "ETCH-03": "정상 (1,750)" },
            ],
          },
        ],
        charts: [
          {
            type: "line",
            data: [
              { t: "09:02", "ETCH-02": 1.20, "ETCH-01": 1.10, "ETCH-03": 1.18 },
              { t: "09:03", "ETCH-02": 2.25, "ETCH-01": 2.05, "ETCH-03": 2.18 },
              { t: "09:04", "ETCH-02": 2.72, "ETCH-01": 2.55, "ETCH-03": 2.65 },
              { t: "09:05", "ETCH-02": 2.92, "ETCH-01": 2.78, "ETCH-03": 2.84 },
              { t: "09:06", "ETCH-02": 3.00, "ETCH-01": 2.85, "ETCH-03": 2.92 },
              { t: "09:07", "ETCH-02": 2.78, "ETCH-01": 2.65, "ETCH-03": 2.71 },
              { t: "09:08", "ETCH-02": 2.30, "ETCH-01": 2.15, "ETCH-03": 2.22 },
            ],
            options: {
              title: "APC_PRESSURE 비교 (mTorr)",
              xKey: "t",
              yKeys: ["ETCH-02", "ETCH-01", "ETCH-03"],
              xLabel: "시각",
              yLabel: "mTorr",
            },
          },
          {
            type: "bar",
            data: [
              { metric: "APC_PRESSURE 최댓값", "ETCH-02": 3.0, "ETCH-01": 2.85, "ETCH-03": 2.92 },
              { metric: "RF_FORWARD 평균", "ETCH-02": 1.72, "ETCH-01": 1.68, "ETCH-03": 1.71 },
              { metric: "EPD 종료 신호", "ETCH-02": 1.78, "ETCH-01": 1.69, "ETCH-03": 1.75 },
            ],
            options: {
              title: "MAIN_ETCH 핵심 지표 (정규화)",
              xKey: "metric",
              yKeys: ["ETCH-02", "ETCH-01", "ETCH-03"],
            },
          },
        ],
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
        recommendQuestion: [
          // 첫 chip 은 turn 2 의 user 와 동일 — ghost text / chip 클릭 흐름이
          // 동일하게 turn 2 로 자연스럽게 이어지도록 정렬 (#52)
          "수정 후 정상 발생 여부 확인해줘",
          "다른 STEP 의 트리거 조건도 점검해줘",
          "비슷한 케이스가 더 있는지 알려줘",
        ],
      },
      // Turn 2 (#52) — 첫 chip 흐름 이어가기. 트리거 수정 후 5분 단위로
      // 데이터가 다시 발생하는 검증 표.
      {
        user: "수정 후 정상 발생 여부 확인해줘",
        assistant: [
          "### 트리거 수정 후 데이터 재발생 확인",
          "",
          "`STEP_END` 트리거 적용 이후 14:00~14:30 구간에서 BAKE STEP 종료 시점마다 정상 수집되었습니다.",
          "",
          "5건 모두 `TEMP_TC1` 값이 spec 범위(`830~870 ℃`) 안이며 누락 없습니다.",
        ].join("\n"),
        tables: [{
          title: "BAKE STEP 종료 시점 수집 결과",
          columns: ["batch", "step_end", "TEMP_TC1 (℃)", "status"],
          rows: [
            { batch: "B-2031", step_end: "14:04:12", "TEMP_TC1 (℃)": 851, status: "OK" },
            { batch: "B-2032", step_end: "14:09:38", "TEMP_TC1 (℃)": 853, status: "OK" },
            { batch: "B-2033", step_end: "14:15:02", "TEMP_TC1 (℃)": 850, status: "OK" },
            { batch: "B-2034", step_end: "14:20:27", "TEMP_TC1 (℃)": 854, status: "OK" },
            { batch: "B-2035", step_end: "14:25:51", "TEMP_TC1 (℃)": 852, status: "OK" },
          ],
        }],
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
        tables: [{
          title: "알람 이력",
          columns: ["timestamp", "alarm", "severity", "note"],
          rows: [
            { timestamp: "14:23:11", alarm: "GasLeak", severity: "warning", note: "SiH4 line" },
            { timestamp: "14:25:47", alarm: "GasLeak", severity: "warning", note: "SiH4 line (recur)" },
            { timestamp: "14:26:02", alarm: "EMO", severity: "critical", note: "Emergency Off — auto interlock" },
          ],
        }],
        recommendQuestion: [
          "GasLeak 알람의 원인 센서가 무엇인가요?",
          "EMO 발생 직전 다른 챔버 상태는?",
          "재발 방지를 위한 점검 항목 알려줘",
        ],
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
        recommendQuestion: [
          // 첫 chip 은 turn 3 의 user 와 동일 — ghost text / chip 클릭 흐름이
          // 동일하게 turn 3 로 자연스럽게 이어지도록 정렬 (#52)
          "다른 라인의 MFC 상태는?",
          "최근 정비 이력 조회해줘",
          "유사 케이스 권장 조치 정리해줘",
        ],
      },
      // Turn 3 (#52) — 첫 chip 흐름 이어가기. 같은 챔버의 다른 가스 라인
      // MFC 상태를 비교한 표.
      {
        user: "다른 라인의 MFC 상태는?",
        assistant: [
          "### 같은 챔버의 다른 가스 라인 MFC 상태",
          "",
          "동일 시점 `14:25:00` 의 MFC 출력을 라인별로 비교했습니다.",
          "",
          "| 라인 | setpoint | 측정값 | 편차 | 판정 |",
          "| --- | --- | --- | --- | --- |",
          "| `GAS_FLOW_SiH4` | 200 sccm | 156 sccm | **−22%** | 이상 |",
          "| `GAS_FLOW_NH3` | 50 sccm | 49.6 sccm | −0.8% | 정상 |",
          "| `GAS_FLOW_Ar` | 100 sccm | 100.4 sccm | +0.4% | 정상 |",
          "",
          "이상 편차는 `GAS_FLOW_SiH4` 한 라인에서만 관측되어, 라인 단위 결함(MFC 또는 SiH4 라인 누설) 가능성이 높습니다.",
        ].join("\n"),
        tables: [{
          title: "MFC 라인별 상태 (14:25:00)",
          columns: ["line", "setpoint", "measured", "deviation_pct", "status"],
          rows: [
            { line: "GAS_FLOW_SiH4", setpoint: "200 sccm", measured: "156 sccm", deviation_pct: -22.0, status: "abnormal" },
            { line: "GAS_FLOW_NH3", setpoint: "50 sccm", measured: "49.6 sccm", deviation_pct: -0.8, status: "ok" },
            { line: "GAS_FLOW_Ar", setpoint: "100 sccm", measured: "100.4 sccm", deviation_pct: 0.4, status: "ok" },
          ],
        }],
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
        recommendQuestion: [
          "발생 시간은 어떤 단위로 입력하나요?",
          "여러 설비를 동시에 분석할 수 있나요?",
          "분석 결과를 운영자에게 어떻게 전달하나요?",
        ],
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
        recommendQuestion: [
          // 첫 chip 은 turn 3 의 user 와 동일 — ghost text / chip 클릭 흐름이
          // 동일하게 turn 3 로 자연스럽게 이어지도록 정렬 (#52)
          "설정값을 저장할 수 있나요?",
          "기본값을 변경할 수 있나요?",
          "시간대(timezone) 처리는 어떻게 되나요?",
        ],
      },
      // Turn 3 (#52) — 첫 chip 흐름 이어가기. 설정값 저장 정책 안내.
      {
        user: "설정값을 저장할 수 있나요?",
        assistant: [
          "### 설정값 저장 안내",
          "",
          "별도 *저장* 버튼 없이, 입력하신 값은 **브라우저에 자동 저장**됩니다.",
          "",
          "- **설비 정보 패널** — 행/챔버/센서 입력이 변경될 때마다 즉시 저장",
          "- **발생 시간** — 시작/종료 시각 변경 시 즉시 저장",
          "- **대화 이력** — 메시지가 추가될 때마다 저장 (좌측 사이드바에서 다시 열기 가능)",
          "",
          "다음 접속 때 같은 브라우저라면 마지막 상태가 그대로 복원됩니다.",
          "",
          "| 항목 | 저장 위치 | 비고 |",
          "| --- | --- | --- |",
          "| 설비 정보 | `localStorage` | 브라우저별 |",
          "| 발생 시간 | `localStorage` | 브라우저별 |",
          "| 대화 이력 | `localStorage` | 브라우저별 |",
          "",
          "> 다른 기기/브라우저로의 동기화는 현재 지원하지 않으며, 추후 계정 기반 동기화를 검토 중입니다.",
        ].join("\n"),
      },
    ],
  },
] as const;
