export type MessageRole = "user" | "assistant" | "error";

export type Message = {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: number;
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
