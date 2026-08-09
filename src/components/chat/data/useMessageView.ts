"use client";

import { useState } from "react";
import {
  buildMessageRows,
  equipmentsOf,
  filterByEquipment,
  visibleMessages,
  type GroupMode,
  type MessageRow,
} from "@/lib/message-store";
import type { DataMessage } from "@/lib/types";

/**
 * 메시지 목록의 보기 상태 — 묶기 축 하나와 설비 거르개 하나.
 *
 * 규칙(정렬·묶기·표식)은 전부 `message-store` 의 순수 함수에 있고 여기는 그
 * 인자 두 개를 쥔 껍데기다. 상태를 저장하지 않는다(사용자 결정) — 패널을 다시
 * 열면 최신 순 전체로 돌아온다.
 *
 * 이 상태가 목록 컴포넌트가 아니라 호스트에 있는 이유는 상세 면 때문이다:
 * `‹ n / N ›` 순회는 **지금 화면에 보이는 순서**를 따라야 하는데, 그 순서는
 * 묶기 축이 정한다.
 */
export type MessageView = {
  mode: GroupMode;
  setMode: (mode: GroupMode) => void;
  /** 목록에 있는 설비들 — 거르개 칩의 재료. */
  equipments: string[];
  /** 고른 설비 — 비어 있으면 전체다. */
  pickedEquipments: string[];
  toggleEquipment: (equipment: string) => void;
  /** 그려질 줄들(머리·구분선·공백 마커 포함). */
  rows: MessageRow[];
  /** 보이는 순서대로의 메시지 — 상세 순회가 이 배열을 돈다. */
  visible: DataMessage[];
  /** 거르기 전 전체 건수 — "걸러서 0건" 과 "아예 없음" 을 구별한다. */
  total: number;
};

export function useMessageView(messages: DataMessage[]): MessageView {
  const [mode, setMode] = useState<GroupMode>("time");
  const [picked, setPicked] = useState<string[]>([]);

  const equipments = equipmentsOf(messages);
  // 고른 설비의 메시지가 전부 지워졌으면 그 칩은 없던 것으로 — 안 보이는 칩이
  // 목록을 계속 비우고 있으면 사용자가 이유를 찾을 수 없다.
  const pickedEquipments = picked.filter((e) => equipments.includes(e));
  const rows = buildMessageRows(
    filterByEquipment(messages, pickedEquipments),
    mode,
  );

  return {
    mode,
    setMode,
    equipments,
    pickedEquipments,
    toggleEquipment: (equipment) =>
      setPicked((prev) =>
        prev.includes(equipment)
          ? prev.filter((e) => e !== equipment)
          : [...prev, equipment],
      ),
    rows,
    visible: visibleMessages(rows),
    total: messages.length,
  };
}
