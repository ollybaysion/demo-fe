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
