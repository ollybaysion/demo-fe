"use client";

import { useCallback, useState } from "react";
import {
  clearFulfilled as clearFulfilledIn,
  clearOrigin,
  fulfilledForOrigin,
  markFulfilled,
  openRequests,
  receiveRequests,
  reconcileRequests,
  type PendingRequest,
} from "@/lib/request-store";
import type { DataRequest } from "@/lib/types";

/**
 * 데이터 요청(pending) 상태.
 *
 * 규칙은 전부 `@/lib/request-store` 의 순수 함수에 있고, 여기는 `useState` 를 두른
 * 껍데기다. 스냅샷과 달리 **localStorage 에 남기지 않는다** — 요청은 대화의 한 턴에
 * 매인 것이라, 새로고침해서 되살아나면 이미 지나간 요구가 패널에 유령으로 남는다.
 */
export function useDataRequests() {
  const [requests, setRequests] = useState<PendingRequest[]>([]);

  const receive = useCallback(
    (incoming: DataRequest[], originMessageId: string) => {
      setRequests((prev) => receiveRequests(prev, incoming, originMessageId));
    },
    [],
  );

  /** 판정(`/chat/data`)의 openRequests 로 전체 리컨사일 — 카드 진실원은 서버다. */
  const reconcile = useCallback((open: DataRequest[]) => {
    setRequests((prev) => reconcileRequests(prev, open));
  }, []);

  const fulfill = useCallback((queryKey: string) => {
    setRequests((prev) => markFulfilled(prev, queryKey));
  }, []);

  const clearForOrigin = useCallback((originMessageId: string) => {
    setRequests((prev) => clearOrigin(prev, originMessageId));
  }, []);

  /** 사용자 발화가 나가는 순간 — 충족된 요청의 소임이 끝난다. */
  const clearFulfilled = useCallback(() => {
    setRequests((prev) => clearFulfilledIn(prev));
  }, []);

  const clear = useCallback(() => {
    setRequests([]);
  }, []);

  const fulfilledFor = useCallback(
    (originMessageId: string) => fulfilledForOrigin(requests, originMessageId),
    [requests],
  );

  return {
    requests,
    open: openRequests(requests),
    receive,
    reconcile,
    fulfill,
    clearForOrigin,
    clearFulfilled,
    clear,
    fulfilledFor,
  };
}
