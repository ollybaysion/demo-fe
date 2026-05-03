export type MessageRole = "user" | "assistant" | "error";

/**
 * 어시스턴트 응답에 paired 되는 표 데이터 (#34).
 *
 * 백엔드(/api/fdc/v1/chat) 페이로드 구조와 호환:
 *   { content, table?: { rows, columns? } }
 * `columns` 가 비면 첫 row 의 키에서 자동 추출.
 */
export type MessageTable = {
  rows: Record<string, unknown>[];
  columns?: string[];
  /** Card 헤더에 노출되는 제목. 비면 fallback (예: "표"). */
  title?: string;
};

/**
 * 어시스턴트 응답에 paired 되는 차트 데이터 (#37).
 *
 * 백엔드(/api/fdc/v1/chat) 페이로드 구조와 호환:
 *   { content, chart?: { type, data, options? } }
 * v1 지원 타입: line / bar / area.
 */
/**
 * 차트에 그릴 reference 선 (수평 또는 수직).
 * - `axis: "y"` + `value` (숫자) — 가로(수평) 선. 임계값 / 평균 / 한계치 등.
 * - `axis: "x"` + `value` (숫자/문자열) — 세로(수직) 선. 이벤트 시점 등.
 */
export type MessageChartReferenceLine = {
  axis: "x" | "y";
  value: number | string;
  label?: string;
  /** hex 색. 비면 default warning(주황 amber). */
  color?: string;
  /** true 면 점선. 임계값 표기에 권장. */
  dashed?: boolean;
};

/**
 * 차트에 그릴 reference 구간 (band).
 * - `axis: "x"` + `from` / `to` — 가로(시간) 구간. 예: STEP 영역에 라벨.
 * - `axis: "y"` + `from` / `to` — 세로(값) 구간. 예: 정상 범위 음영.
 * 라벨은 구간 상단 안쪽에 표시.
 */
export type MessageChartReferenceArea = {
  axis: "x" | "y";
  from: number | string;
  to: number | string;
  label?: string;
  /** band 채우기 색 (rgba/hex). 비면 채우기 없이 라벨만 표시. */
  fill?: string;
};

export type MessageChart = {
  type: "line" | "bar" | "area";
  data: Record<string, unknown>[];
  options?: {
    /** 차트 상단 제목. 비면 미표기. */
    title?: string;
    /** x 축으로 쓸 키. 비면 첫 row 의 첫 키. */
    xKey?: string;
    /** y 축 시리즈 키 배열. 비면 xKey 제외 모든 키. */
    yKeys?: string[];
    /** 축 라벨. 비면 미표기. */
    xLabel?: string;
    yLabel?: string;
    /** 수평 / 수직 reference 선. 비면 미표기. */
    referenceLines?: MessageChartReferenceLine[];
    /** Reference 구간 (band) — STEP 라벨 등. 비면 미표기. */
    referenceAreas?: MessageChartReferenceArea[];
  };
};

/**
 * Paired 항목의 위치 힌트 (#45). 백엔드가 의미 있는 짝짓기를 강제할
 * 때 명시. 미지정 시 FE 가 균형 분배.
 */
export type PairedSide = "left" | "right";

export type MessageTableEntry = MessageTable & {
  side?: PairedSide;
};

export type MessageChartEntry = MessageChart & {
  side?: PairedSide;
};

/**
 * 어시스턴트 응답에 paired 되는 이벤트 타임라인 (#49).
 *
 * Gantt 식 시간 구간 표시 — 각 이벤트는 시작/종료가 있고, 트랙별로
 * 한 row 에 그려짐. 2단계 계층 (process/step) 으로 시각 구분.
 *
 * 백엔드(/api/fdc/v1/chat) 페이로드 구조와 호환:
 *   { content, eventTimelines?: MessageEventTimeline[] }
 */
export type EventTimelineLevel = "process" | "step";

export type EventTimelineItem = {
  /** 트랙 라벨 — 같은 track 의 events 는 한 row 에 그려짐. 예: "공정", "챔버 A". */
  track: string;
  /** 2단계 계층. process tracks 가 위, step tracks 가 아래에 정렬. */
  level: EventTimelineLevel;
  /** ISO 또는 비교 가능한 string/number. 비교는 lexicographical / numeric. */
  start: string | number;
  end: string | number;
  label: string;
  /** hex 색 override. 미지정 시 FE 가 level 기준 기본 색 적용. */
  color?: string;
};

export type MessageEventTimeline = {
  title?: string;
  /** 시간축 범위. 미지정 시 events 의 min(start) ~ max(end) 자동. */
  range?: { start: string | number; end: string | number };
  events: EventTimelineItem[];
};

export type MessageEventTimelineEntry = MessageEventTimeline & {
  side?: PairedSide;
};

export type Message = {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: number;
  /** Paired data tables (#34, #45) — 어시스턴트 메시지에만. */
  tables?: MessageTableEntry[];
  /** Paired charts (#37, #45) — 어시스턴트 메시지에만. */
  charts?: MessageChartEntry[];
  /** Paired event timelines (#49) — 어시스턴트 메시지에만. */
  eventTimelines?: MessageEventTimelineEntry[];
  /**
   * @deprecated #45 이후 `tables` 사용. 기존 localStorage 호환용.
   * 렌더 시 `tables ?? [table]` 로 coalesce.
   */
  table?: MessageTable;
  /**
   * @deprecated #45 이후 `charts` 사용. 기존 localStorage 호환용.
   */
  chart?: MessageChart;
  /**
   * 추천 후속 질문 (#40) — 어시스턴트 메시지에만. ChatInput 위에 chip
   * 으로 노출. 비면 미표기. 백엔드가 동봉한 단순 문자열 배열.
   */
  recommendQuestion?: string[];
  /**
   * 에러 상세 (#32) — `role: "error"` 메시지에만. 사용자 친화 본문은
   * `content`, 원인 분류 / HTTP 상태 / 원본 메시지 등 기술적 디테일은
   * 여기에. UI 에서 [원인 보기] 토글로 접어 노출.
   */
  errorDetail?: {
    /** 분류 키 — "network" | "timeout" | "http-4xx" | "http-5xx" | "stream" | "unknown". */
    kind: string;
    /** HTTP status 또는 0 (네트워크 단절). */
    status?: number;
    /** 원본 에러 메시지(영문 stack trace 등). */
    raw?: string;
  };
};

/**
 * 설비 정보 입력 — 설비 → 챔버 → 센서 3단계 트리.
 *
 * 한 설비는 여러 챔버를 가지고, 각 챔버는 여러 센서를 가진다.
 * 빈 문자열은 사용자가 비워둔 셀; 행/항목 순서를 보존하기 위해
 * 그대로 유지한다.
 */
export type ContextSensor = {
  id: string;
  name: string;
};

export type ContextChamber = {
  id: string;
  name: string;
  sensors: ContextSensor[];
};

export type ContextRow = {
  id: string;
  equipment: string;
  chambers: ContextChamber[];
};
