/**
 * 데모 시나리오 공통 타입.
 *
 * 백엔드(/api/fdc/v1/chat) 페이로드와 호환되는 paired 데이터(table /
 * chart / event timeline) 와 추천 후속 질문(recommendQuestion) 을 포함.
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
   * 이 턴 user 메시지가 전송될 때 컨텍스트 패널을 이 행들로 교체.
   * 시나리오 도중 사용자가 설비를 명시하면 패널이 자동 채워지는 흐름.
   */
  contextPanel?: ContextRow[];
  /** 이 턴 user 메시지 전송 시 발생 시간을 함께 갱신. */
  timeRange?: { start: string; end: string };
  /** Paired tables (#34, #45). */
  tables?: MessageTableEntry[];
  /** Paired charts (#37, #45). */
  charts?: MessageChartEntry[];
  /** Paired event timelines (#49). */
  eventTimelines?: MessageEventTimelineEntry[];
  /**
   * 추천 후속 질문 (#40). 어시스턴트 응답 후 ChatInput 위에 chip 으로
   * 노출. 첫 chip 은 다음 turn 의 `user` 와 일치하도록 정렬 (#52, #46) —
   * 데모 모드에서 골드 테두리로 강조, 나머지는 disabled.
   */
  recommendQuestion?: string[];
};

export type Scenario = {
  id: string;
  /** 시작 박스 라벨이자 첫 사용자 메시지로 그대로 전송됨. */
  starter: string;
  /** 시나리오 시작 시 컨텍스트 패널에 자동 채워지는 행들. */
  contextPanel: ContextRow[];
  /** 시나리오 시작 시 적용할 발생 시간 (선택). */
  timeRange?: { start: string; end: string };
  /**
   * turns[0]: starter 응답
   * turns[1..]: ghost text(user) + assistant
   */
  turns: ScenarioTurn[];
};
