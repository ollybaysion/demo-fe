"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SCENARIOS, type Scenario } from "@/demo/scenarios";
import {
  type ChatError,
  chatErrorMessage,
  classifyFetchError,
  classifyHttpStatus,
} from "@/lib/chatErrors";

/**
 * 요청 timeout. 일반 응답이 30초 안에 안 끝나면 AbortController 로 자르고
 * timeout 분류로 사용자 안내. 데모/mock 은 짧아 영향 없음.
 */
const REQUEST_TIMEOUT_MS = 30_000;
import { parseSseStream } from "@/lib/sse";
import type {
  ContextRow,
  DataRequest,
  Message,
  MessageChartEntry,
  MessageEventTimelineEntry,
  MessageTableEntry,
} from "@/lib/types";
import { ChatEmptyState } from "./ChatEmptyState";
import { ChatHeader } from "./ChatHeader";
import { ChatInput } from "./ChatInput";
import { EquipmentDetailPanel } from "./equipment/EquipmentDetailPanel";
import { MessageList } from "./message/MessageList";
import { SuggestedQuestions } from "./SuggestedQuestions";
import { SummaryPanel } from "./summary/SummaryPanel";
import { EquipmentPanel, useContextRows } from "./context";
import { EquipmentDetailDrawer } from "./context/EquipmentDetailDrawer";
import {
  findMockLineByKey,
  groupKeyForLine,
  MOCK_EQUIPMENT_CARDS,
  MOCK_GROUPS,
  MOCK_REQUESTS,
} from "./context/equipment-cards.mock";
import { ConversationsSidebar, useConversations } from "./history";
import { DataPanel, useDataRequests, useDataSnapshots } from "./data";
import { toChatPayload } from "@/lib/snapshot-store";

type TokenPayload = { content: string };
type ErrorPayload = { message: string };
/**
 * `done` 이벤트 페이로드 — 백엔드(/api/fdc/v1/chat) 가 응답 끝에
 * 메타 + 부수 페이로드(표 / 차트 / 추천 후속 질문) 를 한 번에 동봉.
 * API.md §1 (POST /api/fdc/v1/chat) 참고.
 */
type DonePayload = {
  messageId: string;
  finishReason: "stop" | "length" | "error";
  tables?: MessageTableEntry[];
  charts?: MessageChartEntry[];
  eventTimelines?: MessageEventTimelineEntry[];
  recommendQuestion?: string[];
  /**
   * 백엔드가 사용자 메시지에서 추출한 컨텍스트. 비-데모 모드에서 우측
   * 컨텍스트 패널을 자동 갱신. 데모 모드는 turn.contextPanel 우선이라
   * 무시됨.
   */
  extractedContext?: {
    rows?: ContextRow[];
    /** default "replace". */
    rowsMode?: "replace" | "append";
    timeRange?: { start?: string; end?: string };
  };
  /**
   * 답하는 데 필요한데 없는 데이터. DB 에 붙지 못하는 환경에서 모델이 지어내는
   * 대신 사용자에게 조달을 요청하는 통로.
   */
  dataRequests?: DataRequest[];
};
type StreamPayload = TokenPayload | ErrorPayload | DonePayload;

type DemoMeta = { scenarioId: string; turnIndex: number };
type DemoState = DemoMeta & { ended: boolean };

function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function nonEmptyRows(rows: ContextRow[]): ContextRow[] {
  return rows
    .map((r) => {
      const chambers = r.chambers
        .map((c) => ({
          ...c,
          sensors: c.sensors.filter((s) => s.name.trim().length > 0),
        }))
        .filter(
          (c) => c.name.trim().length > 0 || c.sensors.length > 0,
        );
      return { ...r, chambers };
    })
    .filter(
      (r) => r.equipment.trim().length > 0 || r.chambers.length > 0,
    );
}

export function ChatContainer() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  // 3분할 상주 레이아웃 — 좌 데이터·중앙 채팅은 항상, 우측은 설비/요약 탭.
  const [rightTab, setRightTab] = useState<"context" | "summary">("context");
  // 대화 이력은 상주 컬럼에서 밀려나 헤더 ≡ 로 여는 오버레이 드로어.
  const [historyOpen, setHistoryOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  /**
   * 데이터 패널 확장 모드(#136) — 패널이 70% 마스터-디테일이 되고 우측(설비
   * 정보/요약) 패널이 자리를 양보한다. 우측 패널의 탭·detailOpen 상태는 이
   * 컴포넌트가 쥐고 있으므로 숨겼다 복귀해도 그대로다.
   */
  const [dataExpanded, setDataExpanded] = useState(false);
  /**
   * 확장 모드의 **내부 레이아웃**(마스터-디테일) 전환은 폭 애니메이션이 끝난
   * 뒤에 한다. 폭이 400px 인 채로 360px 마스터 + 상세 면을 요구하면 남는 40px
   * 안에서 카드가 찌그러져 "깨진" 화면이 300ms 동안 보인다. 접을 때는 반대로
   * 즉시 되돌린다 — 좁아지기 전에 요구 폭을 먼저 줄여야 한다.
   */
  const [dataExpandedInner, setDataExpandedInner] = useState(false);
  /**
   * 전환 중에는 **목록 폭이 변하지 않아야** 한다. 목록이 "패널 전체 폭"인
   * 상태(비확장)와 "마스터 360px"인 상태(확장)를 애니메이션 도중에 오가면,
   * 카드가 패널 최종 폭까지 늘어났다가 되돌아오는 게 눈에 보인다.
   *
   * 그래서 내부 레이아웃은 **두 상태의 합집합**으로 잡는다 — 펼치기는 시작할
   * 때 켜고, 접기는 끝난 뒤에 끈다. 그동안 목록은 360px 로 고정된다.
   * 우측 패널 역시 위상을 맞춘다(폭이 늘기 전에 비우고, 줄어든 뒤에 채운다) —
   * 안 그러면 총 폭이 100% 를 넘어 세 칸이 함께 찌그러진다.
   *
   * 펼침: 우측 비움 + 내부 전환(즉시) → 폭 확대
   * 접힘: 폭 축소 → (끝난 뒤) 내부 되돌림 + 우측 복귀
   */
  const [asideVisible, setAsideVisible] = useState(true);
  /** 상세 면 — 폭이 변하는 동안에는 지워 둔다(글자가 다시 흐르며 깨진다). */
  const [dataDetailVisible, setDataDetailVisible] = useState(false);
  const expandTimerRef = useRef<number | null>(null);
  const SLIDE_MS = 320;
  const toggleDataExpanded = useCallback(() => {
    if (expandTimerRef.current !== null) {
      window.clearTimeout(expandTimerRef.current);
      expandTimerRef.current = null;
    }
    setDataExpanded((prev) => {
      if (prev) {
        // 접기 — 상세 면을 **먼저 지우고** 폭을 줄인 뒤, 끝나면 목록을 푼다.
        setDataDetailVisible(false);
        expandTimerRef.current = window.setTimeout(() => {
          setDataExpandedInner(false);
          setAsideVisible(true);
          expandTimerRef.current = null;
        }, SLIDE_MS);
        return false;
      }
      // 펼치기 — 목록 폭을 먼저 고정하고 폭을 늘린 뒤, 끝나면 상세 면을 켠다.
      setAsideVisible(false);
      setDataExpandedInner(true);
      expandTimerRef.current = window.setTimeout(() => {
        setDataDetailVisible(true);
        expandTimerRef.current = null;
      }, SLIDE_MS);
      return true;
    });
  }, []);
  // 오른쪽 줄 클릭 = 왼쪽에서 그 그룹을 한 번 안내(스크롤 + 깜빡임). 지속
  // 선택이 아니라 신호라, 같은 줄을 다시 눌러도 반응하도록 nonce 를 올린다.
  const [groupFocus, setGroupFocus] = useState<{ key: string; n: number }>({
    key: "",
    n: 0,
  });
  // 왼쪽 그룹의 펼침 상태 — null = 전부 펼침. 줄을 누르면 그 그룹만 남기고
  // 접는다(다른 게 펼쳐져 있으면 대상이 화면 밖으로 밀려 안 보인다).
  const [openGroupKeys, setOpenGroupKeys] = useState<string[] | null>(null);
  // 대기 줄이 가리키는 요청 카드로의 안내 — 그룹 안내와 같은 일회성 신호.
  const [requestFocus, setRequestFocus] = useState<{ key: string; n: number }>({
    key: "",
    n: 0,
  });
  // [자세히]로 연 설비 확장 패널 — 내용은 미정, 지금은 껍데기만.
  const [detailCardId, setDetailCardId] = useState<string | null>(null);
  const detailCard =
    MOCK_EQUIPMENT_CARDS.find((c) => c.id === detailCardId) ?? null;
  // 왼쪽은 상시 그룹 — 목 그룹 + (있으면) 사용자가 직접 등록한 미분류 묶음.
  const [demoState, setDemoState] = useState<DemoState | null>(null);
  const {
    rows,
    timeRange,
    setStart,
    setEnd,
    setEquipment,
    addRow,
    deleteRow,
    addChamber,
    setChamberName,
    deleteChamber,
    addSensor,
    setSensorName,
    deleteSensor,
    replaceRows,
    appendRows,
    replaceTimeRange,
    reset: resetContext,
  } = useContextRows();
  const {
    list: conversations,
    activeId,
    hydrated: conversationsHydrated,
    createConversation,
    updateConversation,
    selectConversation,
    startNewConversation,
  } = useConversations();
  const {
    snapshots,
    addSnapshot,
    remove: removeSnapshot,
    restoreLastRemoved: restoreSnapshot,
    lastRemoved: lastRemovedSnapshot,
    toggleIncluded: toggleSnapshotIncluded,
    setLabel: setSnapshotLabel,
    setSourceSql: setSnapshotSourceSql,
  } = useDataSnapshots();
  const {
    open: openRequests,
    receive: receiveRequests,
    fulfill: fulfillRequest,
    clearFulfilled: clearFulfilledRequests,
    clear: clearRequests,
    fulfilledFor: fulfilledRequestsFor,
  } = useDataRequests();

  // 왼쪽 데이터 패널이 그릴 그룹 — 시안용 목 그룹 + 직접 등록분("미분류").
  const dataGroups = [
    ...MOCK_GROUPS,
    ...(snapshots.length > 0
      ? [{ key: "unassigned", label: "미분류", snapshots }]
      : []),
  ];

  // ── Conversation ↔ local state sync ─────────────────────────
  // Load: when activeId transitions to a real id, hydrate local chat state
  // from that conversation. The ref tracks the last-loaded id so this
  // effect only fires on actual transitions (not on every list update).
  const loadedIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!conversationsHydrated) return;
    if (activeId === loadedIdRef.current) return;
    loadedIdRef.current = activeId;
    if (!activeId) return; // null transition handled by handleNewConversation
    const conv = conversations.find((c) => c.id === activeId);
    if (!conv) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMessages(conv.messages);
    replaceRows(conv.context.rows);
    replaceTimeRange(conv.context.timeRange);
  }, [
    activeId,
    conversationsHydrated,
    conversations,
    replaceRows,
    replaceTimeRange,
  ]);

  // Persist: throttle local state writes to the active conversation. The
  // 300ms idle window collapses per-token streaming updates into a single
  // localStorage write while preserving freshness for typed input.
  // updateConversation has an identity check, so the load case (state ===
  // conv contents) is a no-op — updatedAt is not bumped.
  useEffect(() => {
    if (!conversationsHydrated) return;
    if (!activeId) return;
    const handle = setTimeout(() => {
      updateConversation(activeId, {
        messages,
        context: { rows, timeRange },
      });
    }, 300);
    return () => clearTimeout(handle);
  }, [
    messages,
    rows,
    timeRange,
    activeId,
    conversationsHydrated,
    updateConversation,
  ]);

  const sendToApi = useCallback(
    async (
      history: Message[],
      context: ContextRow[],
      timeRangeSnapshot: { start: string; end: string },
      demoMeta?: DemoMeta,
    ) => {
      const assistantId = newId();
      let assistantInserted = false;

      const hasRange =
        timeRangeSnapshot.start.length > 0 || timeRangeSnapshot.end.length > 0;

      // 응답 지연 시 AbortController 로 자르고 timeout 으로 분류.
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      try {
        const res = await fetch("/api/fdc/v1/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: history,
            context,
            timeRange: hasRange ? timeRangeSnapshot : undefined,
            demo: demoMeta,
            // 동봉이 없으면 undefined 라 필드 자체가 빠진다 — 이 기능을 안 쓰는
            // 요청은 지금까지와 똑같은 본문으로 나간다. 데모 재생 중에는 아예
            // 싣지 않는다: 시나리오는 정해진 답을 내야 하는데, 사용자가 보관해 둔
            // 스냅샷이 끼어들면 재생이 결정론을 잃는다.
            dataSnapshots: demoMeta ? undefined : toChatPayload(snapshots),
          }),
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          const e = classifyHttpStatus(res.status);
          appendErrorMessage(setMessages, chatErrorMessage(e), e);
          return;
        }

        setMessages((prev) => [
          ...prev,
          {
            id: assistantId,
            role: "assistant",
            content: "",
            createdAt: Date.now(),
          },
        ]);
        assistantInserted = true;

        for await (const ev of parseSseStream<StreamPayload>(res.body)) {
          if (ev.event === "token") {
            const piece = (ev.data as TokenPayload).content;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, content: m.content + piece }
                  : m,
              ),
            );
          } else if (ev.event === "done") {
            // 응답 종료 — 표 / 차트 / 추천 후속 질문이 동봉되어 있으면
            // 이때 어시스턴트 메시지에 한 번에 attach. tables/charts 는
            // 한 메시지에 여러 개일 수 있다.
            const payload = ev.data as DonePayload;
            const hasTables =
              !!payload.tables && payload.tables.length > 0;
            const hasCharts =
              !!payload.charts && payload.charts.length > 0;
            const hasTimelines =
              !!payload.eventTimelines && payload.eventTimelines.length > 0;
            const hasRecommend =
              !!payload.recommendQuestion &&
              payload.recommendQuestion.length > 0;
            const hasDataRequests =
              !!payload.dataRequests && payload.dataRequests.length > 0;
            if (
              assistantInserted &&
              (hasTables ||
                hasCharts ||
                hasTimelines ||
                hasRecommend ||
                hasDataRequests)
            ) {
              setMessages((prev) =>
                prev.map((m) => {
                  if (m.id !== assistantId) return m;
                  const next: Message = { ...m };
                  if (hasTables) next.tables = payload.tables;
                  if (hasCharts) next.charts = payload.charts;
                  if (hasTimelines) next.eventTimelines = payload.eventTimelines;
                  if (hasRecommend) {
                    next.recommendQuestion = payload.recommendQuestion;
                  }
                  if (hasDataRequests) next.dataRequests = payload.dataRequests;
                  return next;
                }),
              );
            }
            // 요청 카드는 데이터 패널이 안는다. 어느 질문에서 비롯됐는지 함께
            // 넘겨야, 채워졌을 때 이어가기 안내의 수명을 관리할 수 있다.
            // 데모 재생 중에는 만들지 않는다(시나리오 결정론 보존).
            // 패널은 상주라 따로 열 필요가 없다 — 카드가 최상단에 바로 뜬다.
            if (hasDataRequests && !demoMeta) {
              const originIndex = findLastIndex(
                history,
                (m) => m.role === "user",
              );
              const origin = originIndex === -1 ? undefined : history[originIndex];
              if (origin) {
                receiveRequests(payload.dataRequests!, origin.id);
              }
            }
            // 비-데모 모드에서만 extractedContext 적용. 데모는
            // turn.contextPanel 흐름이 우선이라 스킵.
            if (!demoMeta && payload.extractedContext) {
              const ec = payload.extractedContext;
              if (ec.rows && ec.rows.length > 0) {
                if (ec.rowsMode === "append") {
                  appendRows(ec.rows);
                } else {
                  replaceRows(ec.rows);
                }
              }
              if (ec.timeRange) {
                replaceTimeRange({
                  start: ec.timeRange.start ?? "",
                  end: ec.timeRange.end ?? "",
                });
              }
            }
            break;
          } else if (ev.event === "error") {
            const raw =
              (ev.data as ErrorPayload).message ?? "응답 생성 중 오류";
            const e: ChatError = { kind: "stream", raw };
            appendErrorMessage(setMessages, chatErrorMessage(e), e);
            break;
          }
        }
      } catch (err) {
        const e = classifyFetchError(err);
        appendErrorMessage(setMessages, chatErrorMessage(e), e);
        void assistantInserted;
      } finally {
        clearTimeout(timeoutId);
        setIsStreaming(false);
      }
    },
    [appendRows, replaceRows, replaceTimeRange, snapshots, receiveRequests],
  );

  const handleScenarioStart = useCallback(
    async (scenario: Scenario) => {
      // Auto-fill context panel + optional time range
      replaceRows(scenario.contextPanel);
      if (scenario.timeRange) {
        replaceTimeRange(scenario.timeRange);
      }
      const starterMsg: Message = {
        id: newId(),
        role: "user",
        content: scenario.starter,
        createdAt: Date.now(),
      };
      setMessages([starterMsg]);
      setIsStreaming(true);
      setDemoState({ scenarioId: scenario.id, turnIndex: 0, ended: false });

      await sendToApi(
        [starterMsg],
        [],
        scenario.timeRange ?? timeRange,
        { scenarioId: scenario.id, turnIndex: 0 },
      );

      const nextIdx = 1;
      setDemoState({
        scenarioId: scenario.id,
        turnIndex: nextIdx,
        ended: nextIdx >= scenario.turns.length,
      });
    },
    [replaceRows, replaceTimeRange, sendToApi, timeRange],
  );

  const handleSubmit = useCallback(
    async (text: string, attachments?: import("@/lib/types").MessageAttachment[]) => {
      if (demoState?.ended) {
        return;
      }
      const userMessage: Message = {
        id: newId(),
        role: "user",
        content: text,
        createdAt: Date.now(),
        ...(attachments && attachments.length > 0 ? { attachments } : {}),
      };
      const nextHistory = [...messages, userMessage];
      setMessages(nextHistory);
      setIsStreaming(true);

      // Auto-persist: create a Conversation on the first non-demo
      // user message. Demo flows are ephemeral — their messages do not
      // populate the sidebar.
      if (!demoState && !activeId) {
        createConversation({
          messages: nextHistory,
          context: { rows, timeRange },
        });
      }

      if (demoState) {
        const scenario = SCENARIOS.find((s) => s.id === demoState.scenarioId);
        const currentTurn = scenario?.turns[demoState.turnIndex];

        let effectiveTimeRange = timeRange;
        if (currentTurn?.contextPanel) {
          replaceRows(currentTurn.contextPanel);
          setRightTab("context");
        }
        if (currentTurn?.timeRange) {
          replaceTimeRange(currentTurn.timeRange);
          effectiveTimeRange = currentTurn.timeRange;
        }

        await sendToApi(
          nextHistory,
          [],
          effectiveTimeRange,
          { scenarioId: demoState.scenarioId, turnIndex: demoState.turnIndex },
        );
        const nextIdx = demoState.turnIndex + 1;
        setDemoState({
          scenarioId: demoState.scenarioId,
          turnIndex: nextIdx,
          ended: !scenario || nextIdx >= scenario.turns.length,
        });
      } else {
        // 어떤 발화든 나가는 순간 충족된 요청의 소임이 끝난다 — 등록된
        // 스냅샷은 이 요청에 함께 실려 나간다. ("등록 완료" chip 도 사라진다.)
        clearFulfilledRequests();
        await sendToApi(nextHistory, nonEmptyRows(rows), timeRange);
      }
    },
    [
      demoState,
      messages,
      rows,
      timeRange,
      activeId,
      sendToApi,
      replaceRows,
      replaceTimeRange,
      createConversation,
      clearFulfilledRequests,
    ],
  );

  /**
   * 데이터 요청 왕복 체험 시작 — 질문은 실 파이프라인으로 보내되 **컨텍스트를
   * 비우고** 출발한다. 설비 정보가 남아 있으면 [분석 대상]으로 프롬프트에
   * 주입되고, mock 의 설비 ID 분기가 데이터 요청 분기보다 먼저 잡아채
   * 요청 카드가 만들어지지 않는다.
   */
  const handleQuickStart = useCallback(
    async (text: string) => {
      replaceRows([]); // 화면의 설비 입력도 비운다 — 보내는 컨텍스트와 일치하게.
      const userMessage: Message = {
        id: newId(),
        role: "user",
        content: text,
        createdAt: Date.now(),
      };
      const nextHistory = [...messages, userMessage];
      setMessages(nextHistory);
      setIsStreaming(true);
      if (!activeId) {
        createConversation({
          messages: nextHistory,
          context: { rows: [], timeRange },
        });
      }
      await sendToApi(nextHistory, [], timeRange);
    },
    [
      messages,
      activeId,
      timeRange,
      sendToApi,
      replaceRows,
      createConversation,
    ],
  );

  const handleNewConversation = useCallback(() => {
    setMessages([]);
    setIsStreaming(false);
    setDemoState(null);
    setDetailOpen(false);
    resetContext();
    // 요청은 낳은 질문에 매여 있다 — 대화가 사라지면 같이 사라져야 한다.
    // 스냅샷은 반대로 남는다(대화와 독립된 보관물).
    clearRequests();
    startNewConversation();
  }, [resetContext, startNewConversation, clearRequests]);

  const handleSidebarSelect = useCallback(
    (id: string) => {
      // Mid-stream switch would orphan the in-flight assistant message —
      // require the user to wait for the current turn to settle.
      if (isStreaming) return;
      setDemoState(null);
      setDetailOpen(false);
      setHistoryOpen(false);
      clearRequests();
      selectConversation(id);
    },
    [isStreaming, selectConversation, clearRequests],
  );

  const equipmentNames = useMemo(
    () =>
      rows
        .map((r) => r.equipment.trim())
        .filter((n) => n.length > 0),
    [rows],
  );

  // 마지막 어시스턴트 메시지에 동봉된 추천 후속 질문. 응답 직후
  // ChatInput 위에 chip 으로 노출. 빈 시작 화면의 예시 질문 chips 와
  // 같은 슬롯 공유, 시점이 달라 mutex.
  const followUpRecommendations = useMemo<readonly string[]>(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m.role === "assistant") {
        return m.recommendQuestion ?? [];
      }
    }
    return [];
  }, [messages]);

  // 가장 최근 채팅 인입 비교 메시지의 마크다운 (Phase 3) —
  // SummaryPanel 의 [비교 결과] Section + 클립보드 복사에 자동 동봉.
  // EquipmentDetailPanel 이 buildCompareMessage 로 만든 메시지는 id 가
  // `compare_` prefix.
  const lastCompareDigest = useMemo<string | undefined>(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m.role === "assistant" && m.id.startsWith("compare_")) {
        return m.content;
      }
    }
    return undefined;
  }, [messages]);

  // 데모 모드에서 다음 turn 에 매칭되는 user 텍스트 — 일치하지 않는 chip
  // 은 SuggestedQuestions 가 비활성화. 비-데모 (실 백엔드) 일 때는 모든
  // chip 활성.
  const enabledFollowUp = useMemo<string | undefined>(() => {
    if (!demoState || demoState.ended) return undefined;
    const scenario = SCENARIOS.find((s) => s.id === demoState.scenarioId);
    return scenario?.turns[demoState.turnIndex]?.user;
  }, [demoState]);

  /** 우측 탭 전환. 설비 상세 확장은 설비 탭에 매인 것이라 떠날 때 접는다. */
  function handleRightTab(next: "context" | "summary") {
    setRightTab(next);
    if (next !== "context") setDetailOpen(false);
  }

  /**
   * 요청 카드에서 결과를 등록한다 — 스냅샷으로 보관하고, 그 요청을 충족으로
   * 표시한다. 충족된 요청은 패널에서 스냅샷 카드에 자리를 내주고, 입력창 위에
   * "등록 완료" 안내 chip 이 뜬다.
   */
  const handleFulfillRequest = useCallback(
    (
      input: string,
      label: string,
      opts: { include: boolean; queryKey: string; sourceSql?: string },
    ) => {
      const result = addSnapshot(input, label, opts);
      if (result.ok) fulfillRequest(opts.queryKey);
      return result;
    },
    [addSnapshot, fulfillRequest],
  );

  /** 수동 등록 — 이름을 묻지 않는다. 라벨은 내용에서 자동으로 만들어진다. */
  const handleAddSnapshot = useCallback(
    (input: string) => addSnapshot(input, ""),
    [addSnapshot],
  );

  // 재생성 / 에러 재시도 공통 핸들러. 마지막 user 메시지까지 잘라낸 뒤
  // 같은 컨텍스트로 다시 API 호출. 데모 시나리오 진행 중엔 호출되지
  // 않도록 onRegenerate prop 자체를 빼서 버튼이 안 보이게 한다.
  const handleRegenerate = useCallback(() => {
    // 자르기와 재요청을 setMessages 업데이터 밖에서 한다. 업데이터는 순수해야
    // 하는데 그 안에서 sendToApi 를 부르면, StrictMode 가 업데이터를 두 번
    // 실행할 때 요청도 두 번 나가 같은 답변이 두 개 쌓인다.
    const lastUserIndex = findLastIndex(messages, (m) => m.role === "user");
    if (lastUserIndex === -1) return;
    const trimmed = messages.slice(0, lastUserIndex + 1);
    setMessages(trimmed);
    setIsStreaming(true);
    void sendToApi(trimmed, nonEmptyRows(rows), timeRange);
  }, [messages, rows, timeRange, sendToApi]);

  /**
   * 충족된 요청을 가진 가장 최근 질문 — 있으면 입력창 위에 "등록 완료" chip 으로
   * 이어가기를 안내한다. 되감기 버튼을 따로 두지 않는 이유: 등록 후 이어가기는
   * 보통의 채팅 발화라서, 히스토리를 자르거나 특별한 UI 를 만들 이유가 없다.
   * 등록된 데이터는 동봉으로 어차피 다음 요청에 실려 나간다.
   */
  const ackOrigin = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m.role !== "user") continue;
      if (fulfilledRequestsFor(m.id).length > 0) return m;
    }
    return undefined;
  }, [messages, fulfilledRequestsFor]);

  let lockedValue: string | undefined;
  let inputPlaceholder: string | undefined;
  if (demoState) {
    if (demoState.ended) {
      lockedValue = "";
      inputPlaceholder = "데모 종료 — 헤더의 '새 대화' 버튼을 눌러주세요";
    } else if (!isStreaming && demoState.turnIndex > 0) {
      const scenario = SCENARIOS.find((s) => s.id === demoState.scenarioId);
      lockedValue = scenario?.turns[demoState.turnIndex]?.user;
    }
  }

  return (
    // NotebookLM 관례의 카드 레이아웃 — 옅은 캔버스 위에 세 컬럼이 라운드
    // 카드로 떠 있다. 전면을 경계선으로 빈틈없이 채우면 답답해진다.
    <div className="h-dvh flex flex-col bg-brand-surface-soft text-brand-ink">
      <ChatHeader
        onNewConversation={handleNewConversation}
        onOpenHistory={() => setHistoryOpen(true)}
      />

      <div className="flex flex-1 min-h-0 gap-md px-md pb-md">
        {/* 좌 — 데이터 패널(상주). [자세히]가 열리면 폭이 0 으로 접히면서
            왼쪽으로 미끄러져 나간다 — 그 공간을 채팅과 확장 패널이 나눠 갖는다. */}
        <div
          className="relative shrink-0 overflow-hidden transition-[width] duration-300 ease-out"
          // 폭의 주인이 둘이면 깨진다 — 데이터 패널 확장(#136, 70%)과 설비
          // [자세히] 접힘(0)을 여기서 한 번에 계산하고, 안쪽 패널은 이 칸을
          // 그대로 채우게 한다(패널 자신의 w-[400px]/w-[70%] 는 무력화).
          style={{
            width: detailCard ? "0px" : dataExpanded ? "70%" : "400px",
            marginRight: detailCard ? "-1rem" : undefined,
          }}
          aria-hidden={detailCard !== null}
        >
          <div
            className={[
              "absolute inset-0 flex transition-transform duration-200 ease-out",
              "[&>aside]:!w-full [&>aside]:!transition-none",
              detailCard ? "-translate-x-[105%]" : "translate-x-0",
            ].join(" ")}
          >
            <DataPanel
              snapshots={snapshots}
              // 시안: 목 그룹 + 직접 등록분(요청 메타가 없어 "미분류").
              groups={dataGroups}
              focusGroupKey={groupFocus.key}
              focusNonce={groupFocus.n}
              focusRequestKey={requestFocus.key}
              requestFocusNonce={requestFocus.n}
              openGroupKeys={openGroupKeys}
              onSetAllGroups={(open: boolean) =>
                setOpenGroupKeys(open ? null : [])
              }
              onToggleGroup={(key) =>
                setOpenGroupKeys((prev) => {
                  const base = prev ?? dataGroups.map((g) => g.key);
                  return base.includes(key)
                    ? base.filter((k) => k !== key)
                    : [...base, key];
                })
              }
              // 시안: 대기 줄과 짝이 되는 목 요청 + 실제로 도착한 요청.
              requests={[...MOCK_REQUESTS, ...openRequests]}
              onAdd={handleAddSnapshot}
              onFulfill={handleFulfillRequest}
              onToggleIncluded={toggleSnapshotIncluded}
              onRemove={removeSnapshot}
              onRename={setSnapshotLabel}
              onSetQuery={setSnapshotSourceSql}
              lastRemoved={lastRemovedSnapshot}
              onRestore={restoreSnapshot}
              expanded={dataExpandedInner}
              detailVisible={dataDetailVisible}
              onToggleExpanded={toggleDataExpanded}
            />
          </div>
        </div>

        {/* 중앙 — 채팅 카드. 확장 패널이 열리면 남은 폭을 3:7 로 나눈다. */}
        <div
          className="flex min-w-0 flex-col rounded-xl border border-brand-hairline bg-brand-canvas overflow-hidden transition-[flex-grow] duration-200 ease-out"
          style={{ flexGrow: detailCard ? 3 : 1, flexBasis: 0 }}
        >

        <main className="flex-1 overflow-y-auto scrollbar-none">
          {/* 메시지 목록은 xl+ 에서 좌·우 5vw 만 남기고 풀 폭 사용 —
              풍선 자체는 항상 중앙(`[1fr | 768 | 1fr]`)에 두어 표 유무에
              따라 움직이지 않음. 풍선이 오른쪽으로 슬라이드되는 더 적극
              적인 레이아웃은 별도 이슈에서 검토. */}
          <div
            className={[
              "mx-auto py-xl",
              messages.length === 0
                ? "max-w-chat-narrow px-lg"
                : "max-w-chat-narrow px-lg xl:max-w-none xl:px-[5vw]",
            ].join(" ")}
          >
            {messages.length === 0 ? (
              <ChatEmptyState
                onScenarioStart={handleScenarioStart}
                onQuickStart={handleQuickStart}
              />
            ) : (
              <MessageList
                messages={messages}
                isStreaming={isStreaming}
                onRegenerate={demoState ? undefined : handleRegenerate}
              />
            )}
          </div>
        </main>

        <div
          className="bg-brand-canvas"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <div className="mx-auto max-w-chat-narrow px-lg pt-sm pb-lg">
            {/*
              ChatInput 위 chip 슬롯 — 시점에 따라 두 모드 mutex.
              - 메시지 0건 + 데모 아닌 빈 시작 화면: 예시 질문 chips
              - 어시스턴트 응답 후 (스트리밍 종료): 추천 후속 질문 chips
            */}
            {messages.length === 0 && !isStreaming && !demoState && (
              <SuggestedQuestions onSelect={handleSubmit} />
            )}
            {/* 충족된 요청이 있으면 추천보다 먼저 — 다음 걸음은 이어가기 발화다.
                열린 요청이 남아 있으면 안내하지 않는다 — 아직 채울 카드가 있다.
                (충족 요청의 정리는 handleSubmit 이 모든 발화에 대해 한다.) */}
            {messages.length > 0 &&
              !isStreaming &&
              ackOrigin &&
              openRequests.length === 0 && (
                <SuggestedQuestions
                  onSelect={handleSubmit}
                  questions={["등록 완료"]}
                  ariaLabel="등록 완료 안내"
                />
              )}
            {messages.length > 0 &&
              !isStreaming &&
              !ackOrigin &&
              followUpRecommendations.length > 0 && (
                <SuggestedQuestions
                  onSelect={handleSubmit}
                  questions={followUpRecommendations}
                  ariaLabel="추천 후속 질문"
                  enabledQuestion={enabledFollowUp}
                />
              )}
            <ChatInput
              onSubmit={handleSubmit}
              disabled={isStreaming}
              lockedValue={lockedValue}
              placeholder={inputPlaceholder}
            />
          </div>
        </div>
      </div>

        {/* 우 — 설비 정보 / 요약 탭 (상주 카드). 주 작업면은 데이터·채팅이라
            우측은 좁게 유지한다. 데이터 패널 확장(#136) 동안은 자리를 양보 —
            탭·상세 상태는 위에서 쥐고 있어 복귀하면 그대로다. */}
        {/* 확장 패널 — 채팅과 설비 패널 **사이** 칸. 닫히면 폭 0(가로 gap 도
            상쇄), 열리면 남은 폭을 채팅과 3:7 로 나눠 갖는다. */}
        <div
          className="relative shrink-0 overflow-hidden transition-[flex-grow] duration-200 ease-out"
          style={{
            flexGrow: detailCard ? 7 : 0,
            flexBasis: 0,
            minWidth: 0,
            // 닫히면 제 몫의 가로 여백까지 지우고, 열리면 오른쪽 여백을 상쇄해
            // 설비 패널과 맞붙는다(둘이 하나의 패널로 보이도록).
            marginLeft: detailCard ? undefined : "-1rem",
            marginRight: detailCard ? "-1rem" : undefined,
          }}
          aria-hidden={detailCard === null}
        >
          <div
            className={[
              "absolute inset-0 flex transition-transform duration-200 ease-out",
              detailCard
                ? "translate-x-0"
                : "translate-x-full pointer-events-none",
            ].join(" ")}
          >
            <EquipmentDetailDrawer
              card={detailCard}
              onClose={() => setDetailCardId(null)}
            />
          </div>
        </div>

        {/* 우 — 설비 패널. 설비 확장 패널이 열려도 자리를 지킨다(카드에서 바로
            다른 설비로 옮겨갈 수 있어야 한다). 데이터 패널 확장 때만 비운다. */}
        {asideVisible && (
        <aside
          className={[
            "shrink-0 w-[320px] flex flex-col border border-brand-hairline bg-brand-canvas overflow-hidden",
            detailCard ? "rounded-r-xl" : "rounded-xl",
          ].join(" ")}
        >
        <div
          role="tablist"
          aria-label="우측 패널 탭"
          className="flex items-center h-16 px-lg gap-xs border-b border-brand-hairline"
        >
          <RightTabButton
            label="설비 정보"
            active={rightTab === "context"}
            onClick={() => handleRightTab("context")}
          />
          <RightTabButton
            label="요약"
            active={rightTab === "summary"}
            onClick={() => handleRightTab("summary")}
          />
        </div>
        <div className="flex-1 min-h-0">
          {/* 오른쪽 패널 = 설비 카드(시안). 입력 폼(ContextPanel)을 대신하며,
              카드·줄은 아직 목 데이터에서 온다 — 파생 배선은 다음 단계. */}
          <EquipmentPanel
            open={rightTab === "context"}
            cards={MOCK_EQUIPMENT_CARDS}
            onFocusLine={(lineKey) => {
              const line = findMockLineByKey(lineKey);
              // 아직 데이터가 없는 줄은 볼 게 없다 — 대신 그 데이터를 부른
              // **요청 카드**로 데려간다.
              if (line?.status === "pending") {
                if (!line.requestKey) return;
                setRequestFocus((prev) => ({
                  key: line.requestKey!,
                  n: prev.n + 1,
                }));
                return;
              }
              const key = groupKeyForLine(lineKey);
              if (!key) return;
              // 대상만 펼치고 나머지는 접는다 — 그래야 안내가 눈에 들어온다.
              setOpenGroupKeys([key]);
              setGroupFocus((prev) => ({ key, n: prev.n + 1 }));
            }}
            // 같은 카드를 다시 누르면 닫힌다.
            onOpenDetail={(id) =>
              setDetailCardId((prev) => (prev === id ? null : id))
            }
            detailCardId={detailCardId}
          />
          <SummaryPanel
            open={rightTab === "summary"}
            rows={rows}
            timeRange={timeRange}
            compareDigest={lastCompareDigest}
          />
        </div>
        </aside>
        )}
      </div>

      <EquipmentDetailPanel
        open={!dataExpanded && rightTab === "context" && detailOpen}
        equipmentNames={equipmentNames}
        onClose={() => setDetailOpen(false)}
        onImportToChat={(msg) => {
          setMessages((prev) => [...prev, msg]);
          setDetailOpen(false);
        }}
      />

      <ConversationsSidebar
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        conversations={conversations}
        activeId={activeId}
        onSelect={handleSidebarSelect}
      />
    </div>
  );
}

function RightTabButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={[
        "inline-flex items-center h-8 px-sm rounded-md text-body-sm transition-colors",
        "focus:outline-none focus:ring-2 focus:ring-brand-primary/15",
        active
          ? "bg-brand-primary/10 text-brand-primary font-medium"
          : "text-brand-muted hover:text-brand-ink hover:bg-brand-ink-translucent-04",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

function appendErrorMessage(
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>,
  content: string,
  detail?: ChatError,
) {
  setMessages((prev) => [
    ...prev,
    {
      id: newId(),
      role: "error",
      content,
      createdAt: Date.now(),
      ...(detail && {
        errorDetail: {
          kind: detail.kind,
          status: detail.status,
          raw: detail.raw,
        },
      }),
    },
  ]);
}

function findLastIndex<T>(
  arr: T[],
  predicate: (value: T) => boolean,
): number {
  for (let i = arr.length - 1; i >= 0; i--) {
    if (predicate(arr[i])) return i;
  }
  return -1;
}
