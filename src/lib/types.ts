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

export type Message = {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: number;
  /** Paired data table (#34) — 어시스턴트 메시지에만. */
  table?: MessageTable;
  /** Paired chart (#37) — 어시스턴트 메시지에만. */
  chart?: MessageChart;
  /**
   * 추천 후속 질문 (#40) — 어시스턴트 메시지에만. ChatInput 위에 chip
   * 으로 노출. 비면 미표기. 백엔드가 동봉한 단순 문자열 배열.
   */
  recommendQuestion?: string[];
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
