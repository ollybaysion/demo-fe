/**
 * 데모 시나리오 공통 타입.
 *
 * 백엔드(/api/fdc/v1/chat) 페이로드와 호환되는 paired 데이터(table /
 * chart / event timeline) 와 추천 후속 질문(recommendQuestion) 을 포함.
 */

import type {
  MessageChartEntry,
  MessageEventTimelineEntry,
  MessageTableEntry,
} from "@/lib/types";

export type ScenarioTurn = {
  user: string;
  assistant: string;
  /** Paired tables. */
  tables?: MessageTableEntry[];
  /** Paired charts. */
  charts?: MessageChartEntry[];
  /** Paired event timelines. */
  eventTimelines?: MessageEventTimelineEntry[];
  /**
   * 추천 후속 질문. 어시스턴트 응답 후 ChatInput 위에 chip 으로
   * 노출. 첫 chip 은 다음 turn 의 `user` 와 일치하도록 정렬 —
   * 데모 모드에서 골드 테두리로 강조, 나머지는 disabled.
   */
  recommendQuestion?: string[];
};

export type Scenario = {
  id: string;
  /** 시작 박스 라벨이자 첫 사용자 메시지로 그대로 전송됨. */
  starter: string;
  /**
   * turns[0]: starter 응답
   * turns[1..]: ghost text(user) + assistant
   */
  turns: ScenarioTurn[];
};
