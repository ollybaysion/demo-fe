"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { maybeApplyDevSeed } from "@/lib/dev-seed";
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
      // dev 전용: ?msgs=days 로 열면 스토리지를 표본으로 채운 뒤 읽는다.
      await maybeApplyDevSeed();
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

  /**
   * 판정 결과 여러 건을 한 번에 등록 — 붙여넣기 하나가 100건일 수 있다.
   *
   * 건당 등록을 100번 부르면 상태 갱신도 저장소 쓰기도 100번이다. 여기서 한 번에
   * 접어 넣는다: 목록은 한 번 그려지고, 저장소도 diff 한 번으로 따라잡는다.
   * 각 건의 원문은 BE 가 자른 조각(`raw`)이다 — 우리가 보낸 덩어리 전체가 아니다.
   */
  const addAllFromJudge = useCallback(
    (items: { raw: string; formatted: FormattedMessage }[]): DataMessage[] => {
      const made = items.map(({ raw, formatted }) => toMessage(raw, formatted));
      let stored: DataMessage[] = made;
      setMessages((prev) => {
        let list = prev;
        stored = made.map((m) => {
          const result = upsertMessage(list, m);
          list = result.list;
          return result.stored;
        });
        return list;
      });
      return stored;
    },
    [],
  );

  /** 판정 결과 한 건 → 메시지 등록. 같은 원문 재판정은 기존 항목을 갱신한다. */
  const addFromJudge = useCallback(
    (raw: string, formatted: FormattedMessage): DataMessage =>
      addAllFromJudge([{ raw, formatted }])[0]!,
    [addAllFromJudge],
  );

  const remove = useCallback((id: string) => {
    setMessages((prev) => removeMessage(prev, id));
  }, []);

  return { messages, addFromJudge, addAllFromJudge, remove };
}

/** 판정 결과 → 저장 레코드. 화면·저장소가 같은 규칙을 쓰도록 한 곳에 둔다. */
function toMessage(raw: string, formatted: FormattedMessage): DataMessage {
  return {
    id: newId("dmsg-"),
    // 제목은 BE 가 붙인 이름이 먼저다 — 다건 목록에서 className 만 반복되면
    // 같은 클래스 메시지들이 전부 같은 글자로 서서 고를 수가 없다.
    label:
      formatted.title?.trim() || formatted.className?.trim() || labelFromRaw(raw),
    createdAt: new Date().toISOString(),
    raw,
    // json 이 없으면 변환에 실패한 건이다 — 원문 카드로 선다(사라지지 않는다).
    ...(formatted.json !== undefined && formatted.json !== null
      ? { json: formatted.json }
      : {}),
    ...(formatted.comment ? { comment: formatted.comment } : {}),
    ...(formatted.eqpId ? { eqpId: formatted.eqpId } : {}),
    ...(formatted.className ? { className: formatted.className } : {}),
    ...(formatted.occurredAt ? { occurredAt: formatted.occurredAt } : {}),
    ...(formatted.docId ? { docId: formatted.docId } : {}),
  };
}
