"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { newId } from "@/lib/id";
import { labelFromRaw, removeMessage, upsertMessage } from "@/lib/message-store";
import { loadMessages, persistMessages } from "@/lib/snapshot-idb";
import type { FormattedMessage } from "@/lib/chat-data";
import type { DataMessage } from "@/lib/types";

/**
 * 데이터 메시지 목록의 상태 — `useDataSnapshots` 의 동생.
 *
 * 규칙은 `@/lib/message-store` 의 순수 함수에 있고, 여기는 `useState` 와
 * IndexedDB(`messages` 스토어)를 두른 껍데기다. 판정 왕복 자체는 호스트
 * (ChatContainer)가 한다 — 이 훅은 그 결과를 받아 보관할 뿐이다.
 */
export function useDataMessages() {
  const [messages, setMessages] = useState<DataMessage[]>([]);
  const persistedRef = useRef<DataMessage[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const stored = await loadMessages();
      if (cancelled) return;
      persistedRef.current = stored;
      // 로드 전 등록분을 덮지 않는다 — 스냅샷 로드와 같은 규칙.
      setMessages((current) =>
        current.length === 0
          ? stored
          : current.reduce((acc, m) => upsertMessage(acc, m).list, stored),
      );
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const prev = persistedRef.current;
    if (prev === null || prev === messages) return;
    persistedRef.current = messages;
    void persistMessages(prev, messages);
  }, [messages]);

  /** 판정 결과 → 메시지 등록. 같은 원문 재판정은 기존 항목을 갱신한다. */
  const addFromJudge = useCallback(
    (raw: string, formatted: FormattedMessage): DataMessage => {
      const message: DataMessage = {
        id: newId("dmsg-"),
        label: formatted.className?.trim() || labelFromRaw(raw),
        createdAt: new Date().toISOString(),
        raw,
        json: formatted.json,
        ...(formatted.comment ? { comment: formatted.comment } : {}),
        ...(formatted.eqpId ? { eqpId: formatted.eqpId } : {}),
        ...(formatted.className ? { className: formatted.className } : {}),
        ...(formatted.docId ? { docId: formatted.docId } : {}),
      };
      let stored = message;
      setMessages((prev) => {
        const result = upsertMessage(prev, message);
        stored = result.stored;
        return result.list;
      });
      return stored;
    },
    [],
  );

  const remove = useCallback((id: string) => {
    setMessages((prev) => removeMessage(prev, id));
  }, []);

  return { messages, addFromJudge, remove };
}
