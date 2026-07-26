"use client";

import { useCallback, useState } from "react";
import {
  openInputs,
  type PendingInput,
  receiveInputs,
  setInput,
} from "@/lib/input-store";
import type { ChatInputs, InputRequest } from "@/lib/types";

/**
 * 입력 요청(pending) + 채운 값(sticky) 상태.
 *
 * 규칙은 전부 `@/lib/input-store` 의 순수 함수에 있고, 여기는 `useState` 를 두른
 * 껍데기다. `@/components/chat/data/useDataRequests` 의 형제. 값(values)은 대화
 * 내내 유지돼 매 요청에 실려 나간다(폼 컨텍스트처럼) — 백엔드가 후속 턴마다 그
 * 값으로 스킬을 이어가기 때문.
 */
export function useInputRequests() {
  const [pending, setPending] = useState<PendingInput[]>([]);
  const [values, setValues] = useState<ChatInputs>({});

  const receive = useCallback((incoming: InputRequest[]) => {
    setPending((prev) => receiveInputs(prev, incoming));
  }, []);

  /**
   * 값 하나를 채운다. 다음 값 맵을 즉시 돌려줘 호출자가 "모두 채워졌나"를
   * 동기적으로 판정(자동 재발사)할 수 있게 한다 — setState 는 비동기라 직후에
   * 최신 값을 읽을 수 없기 때문.
   */
  const fill = useCallback(
    (skill: string, key: string, value: string): ChatInputs => {
      const next = setInput(values, skill, key, value);
      setValues(next);
      return next;
    },
    [values],
  );

  const clear = useCallback(() => {
    setPending([]);
    setValues({});
  }, []);

  return {
    values,
    open: openInputs(pending, values),
    /** 지정 값 맵 기준으로 아직 안 채워진 카드 — 자동 재발사 판정용. */
    openWith: (v: ChatInputs) => openInputs(pending, v),
    receive,
    fill,
    clear,
  };
}
