"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { readJson, removeKey, writeJson } from "@/lib/storage";
import type { ContextRow, Message } from "@/lib/types";
import type { TimeRange } from "../context/useContextRows";

/**
 * 대화 이력 의 데이터 레이어.
 *
 * 영속화: localStorage. 백엔드 동기화는 v2 후보.
 * 모델: 자동 영속화 (ChatGPT 식) — 첫 user 메시지가 들어오면 자동으로
 * Conversation 생성, 이후 메시지/컨텍스트 변경마다 in-place 갱신.
 */

const CONVERSATIONS_KEY = "fdc-agent:conversations";
const ACTIVE_ID_KEY = "fdc-agent:active-conversation-id";

const TITLE_MAX_LEN = 40;

export type Conversation = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: Message[];
  context: {
    rows: ContextRow[];
    timeRange: TimeRange;
  };
};

function newConversationId(): string {
  return `cv-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * 첫 user 메시지에서 자동 제목 생성.
 * - 줄바꿈/탭은 단일 공백으로 평탄화
 * - TITLE_MAX_LEN 자 초과 시 말줄임표
 * - user 메시지가 없거나 빈 문자열이면 "(빈 대화)"
 */
function deriveTitle(messages: Message[]): string {
  const firstUser = messages.find((m) => m.role === "user");
  if (!firstUser) return "(빈 대화)";
  const flat = firstUser.content.replace(/\s+/g, " ").trim();
  if (flat.length === 0) return "(빈 대화)";
  if (flat.length <= TITLE_MAX_LEN) return flat;
  return flat.slice(0, TITLE_MAX_LEN) + "…";
}

function isConversation(v: unknown): v is Conversation {
  if (!v || typeof v !== "object") return false;
  const c = v as Record<string, unknown>;
  if (
    typeof c.id !== "string" ||
    typeof c.title !== "string" ||
    typeof c.createdAt !== "number" ||
    typeof c.updatedAt !== "number" ||
    !Array.isArray(c.messages)
  ) {
    return false;
  }
  const ctx = c.context as Record<string, unknown> | undefined;
  if (!ctx || typeof ctx !== "object") return false;
  if (!Array.isArray(ctx.rows)) return false;
  const tr = ctx.timeRange as Record<string, unknown> | undefined;
  if (!tr || typeof tr.start !== "string" || typeof tr.end !== "string") {
    return false;
  }
  return true;
}

function loadAll(): Conversation[] {
  const raw = readJson<unknown>(CONVERSATIONS_KEY, []);
  if (!Array.isArray(raw)) return [];
  return raw.filter(isConversation);
}

function saveAll(list: Conversation[]) {
  writeJson(CONVERSATIONS_KEY, list);
}

function loadActiveId(): string | null {
  const raw = readJson<unknown>(ACTIVE_ID_KEY, null);
  return typeof raw === "string" ? raw : null;
}

function saveActiveId(id: string | null) {
  if (id === null) {
    removeKey(ACTIVE_ID_KEY);
  } else {
    writeJson(ACTIVE_ID_KEY, id);
  }
}

export function useConversations() {
  const [list, setList] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  // 첫 마운트에 localStorage 에서 로드되기 전까지 빈 [] 가 저장으로
  // 흘러나가는 것을 막음. (write effect 들이 hydrated 이후에만 동작)
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const loaded = loadAll();
    const storedId = loadActiveId();
    // Drop a stale id that no longer points at any stored conversation.
    const validId =
      storedId && loaded.some((c) => c.id === storedId) ? storedId : null;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setList(loaded);
    setActiveId(validId);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveAll(list);
  }, [list, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    saveActiveId(activeId);
  }, [activeId, hydrated]);

  // updatedAt 기준 최신순. 사이드바 목록 표시는 이 정렬을 그대로 사용.
  const sorted = useMemo(
    () => [...list].sort((a, b) => b.updatedAt - a.updatedAt),
    [list],
  );

  const active = useMemo(
    () => list.find((c) => c.id === activeId) ?? null,
    [list, activeId],
  );

  /**
   * 첫 user 메시지가 들어왔을 때 새 conversation 생성하고 active 로 지정.
   * 호출 측에서 "메시지 0건이면 호출 X" 정책을 지킨다 (빈 항목 방지).
   */
  const createConversation = useCallback(
    (params: {
      messages: Message[];
      context: { rows: ContextRow[]; timeRange: TimeRange };
    }): Conversation => {
      const now = Date.now();
      const created: Conversation = {
        id: newConversationId(),
        title: deriveTitle(params.messages),
        createdAt: now,
        updatedAt: now,
        messages: params.messages,
        context: params.context,
      };
      setList((prev) => [created, ...prev]);
      setActiveId(created.id);
      return created;
    },
    [],
  );

  /**
   * 특정 conversation 의 messages / context 를 덮어쓰기.
   * - 모든 inner reference가 그대로면 no-op (load 직후 sync 효과의
   *   updatedAt bump 를 막아 정렬 순서가 흐트러지지 않게 함)
   * - 그 외엔 updatedAt 갱신, messages 가 바뀌면 title 재계산
   */
  const updateConversation = useCallback(
    (
      id: string,
      patch: {
        messages?: Message[];
        context?: { rows: ContextRow[]; timeRange: TimeRange };
      },
    ) => {
      setList((prev) =>
        prev.map((c) => {
          if (c.id !== id) return c;
          const newMessages = patch.messages ?? c.messages;
          const newRows = patch.context?.rows ?? c.context.rows;
          const newRange = patch.context?.timeRange ?? c.context.timeRange;
          if (
            newMessages === c.messages &&
            newRows === c.context.rows &&
            newRange === c.context.timeRange
          ) {
            return c;
          }
          const title =
            newMessages !== c.messages ? deriveTitle(newMessages) : c.title;
          return {
            ...c,
            messages: newMessages,
            context: { rows: newRows, timeRange: newRange },
            title,
            updatedAt: Date.now(),
          };
        }),
      );
    },
    [],
  );

  /** 사이드바 항목 클릭 — 해당 conversation 으로 전환. null 이면 빈 새 대화. */
  const selectConversation = useCallback((id: string | null) => {
    setActiveId(id);
  }, []);

  /** 헤더 "새 대화" 버튼 — 현재 대화는 그대로 두고 빈 상태로 전환. */
  const startNewConversation = useCallback(() => {
    setActiveId(null);
  }, []);

  return {
    list: sorted,
    active,
    activeId,
    hydrated,
    createConversation,
    updateConversation,
    selectConversation,
    startNewConversation,
  };
}
