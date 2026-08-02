"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { newId as sharedNewId } from "@/lib/id";
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
/**
 * 판정(`/chat/data`) 전용 timeout — 채팅 30초와 분리한다. 판정 응답에는 종결
 * 서술 스트림이 실릴 수 있어, 전역 30초가 완결 서술을 문장 중간에 자르면 안 된다.
 */
const JUDGE_TIMEOUT_MS = 60_000;
import { parseSseStream } from "@/lib/sse";
import { toChatInputs } from "@/lib/input-store";
import type {
  ChatInputs,
  DataRequest,
  InputRequest,
  Message,
  MessageChartEntry,
  MessageEventTimelineEntry,
  MessageImage,
  MessageLink,
  MessageTableEntry,
} from "@/lib/types";
import { ChatEmptyState } from "./ChatEmptyState";
import { ChatHeader } from "./ChatHeader";
import { ChatInput } from "./ChatInput";
import { MessageList } from "./message/MessageList";
import { SuggestedQuestions } from "./SuggestedQuestions";
import { SummaryPanel } from "./summary/SummaryPanel";
import { EquipmentPanel } from "./context";
import { EquipmentDetailDrawer } from "./context/EquipmentDetailDrawer";
import { equipmentCardId, parseLabel } from "./context/derive-cards";
import {
  deriveWorkbenchPanel,
  UNCLASSIFIED_GROUP_KEY,
} from "./context/workbench-derive";
import {
  judgeChatData,
  type PanelJudgeEvent,
} from "@/lib/chat-data";
import { type Skill, type SkillSession } from "@/lib/skills";
import {
  allAnalyses,
  EMPTY_WORKBENCH as EMPTY_TREE,
  fulfillRequestCard,
  loadWorkbench as loadWorkbenchTree,
  openAnalysis,
  ownerOfSnapshot,
  reconcileRequestCards,
  referencedSnapshotIds,
  runRefOf,
  sameRun,
  saveWorkbench as saveWorkbenchTree,
  toRunDecls,
  upsertEquipment,
  type Workbench as WorkbenchTree,
  type WireRequest,
} from "@/lib/workbench-cards";
import {
  clearPendingWorkbench,
  EMPTY_WORKBENCH,
  isEmptyWorkbench,
  loadPendingWorkbench,
  savePendingWorkbench,
  type Workbench,
} from "@/lib/workbench";
import { ConversationsSidebar, useConversations } from "./history";
import {
  DataPanel,
  useDataRequests,
  useDataSnapshots,
  useInputRequests,
} from "./data";
import {
  deriveArtifacts,
  linkLabel,
  type Artifact,
} from "./data/artifacts";
import { toChatPayload } from "@/lib/snapshot-store";
import {
  addToScope,
  hasEquipment,
  hasLine,
  pruneScope,
  removeFromScope,
  type ScopeItem,
  scopeLabel,
  toChatScope,
  toggleScope,
} from "@/lib/query-scope";
import { ScopeTray } from "./scope/ScopeTray";

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
  /** 답에 딸린 그림 — 백엔드가 MCP 등으로 읽어온 것. */
  images?: MessageImage[];
  /** 답이 가리키는 바깥 문서. */
  links?: MessageLink[];
  recommendQuestion?: string[];
  /**
   * 답하는 데 필요한데 없는 데이터. DB 에 붙지 못하는 환경에서 모델이 지어내는
   * 대신 사용자에게 조달을 요청하는 통로.
   */
  dataRequests?: DataRequest[];
  /**
   * 스킬에 필요한 스칼라 값(예: param_index)이 없어 백엔드가 청한 입력 요청.
   * 데이터 패널의 입력 카드로 렌더되고, 전부 채우면 자동으로 재분석된다.
   */
  inputRequests?: InputRequest[];
};
type StreamPayload = TokenPayload | ErrorPayload | DonePayload;

type DemoMeta = { scenarioId: string; turnIndex: number };
type DemoState = DemoMeta & { ended: boolean };

function newId(): string {
  // 메시지·이벤트 id — 대화 저장에 영속되므로 공유 UUID 생성기를 쓴다.
  return sharedNewId();
}

export function ChatContainer() {
  const [messages, setMessages] = useState<Message[]>([]);
  /**
   * 사용자가 직접 올린 그림·링크 — 모델이 내놓기를 기다리지 않고 근거 화면
   * 캡처나 사내 문서를 붙이는 자리. 대화에서 파생되는 산출물과 같은 목록에
   * 섞이되 어느 답에서 나온 것이 아니므로 `messageId` 가 없다.
   */
  const [userArtifacts, setUserArtifacts] = useState<Artifact[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  // 3분할 상주 레이아웃 — 좌 데이터·중앙 채팅은 항상, 우측은 설비/요약 탭.
  const [rightTab, setRightTab] = useState<"context" | "summary">("context");
  // 대화 이력은 상주 컬럼에서 밀려나 헤더 ≡ 로 여는 오버레이 드로어.
  const [historyOpen, setHistoryOpen] = useState(false);
  /**
   * 데이터 패널 확장 모드(#136) — 패널이 70% 마스터-디테일이 되고 우측(설비
   * 정보/요약) 패널이 자리를 양보한다. 우측 패널의 탭 상태는 이 컴포넌트가
   * 쥐고 있으므로 숨겼다 복귀해도 그대로다.
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
  // 요청 카드 개별 강조(일회성 신호)의 자리 — 지금은 그룹 단위 안내로 갈음하고,
  // 우측 설비 카드 강조를 붙일 다음 증분에서 다시 켠다.
  const [requestFocus] = useState<{ key: string; n: number }>({
    key: "",
    n: 0,
  });
  // [자세히]로 연 설비 확장 패널 — 내용은 미정, 지금은 껍데기만.
  const [detailCardId, setDetailCardId] = useState<string | null>(null);
  // 요청 도착 시 우측 설비 카드 강조 — 일회성 신호(nonce).
  const [equipmentFocus, setEquipmentFocus] = useState<{
    key: string;
    n: number;
  }>({ key: "", n: 0 });
  // 전체 보기 — 기본은 질의 대상(오른쪽 설비 패널에서 담은 것)·현재 세션
  // 기준으로 좁혀 보이고, 켜면 저장분 전부가 보인다.
  const [scopeAll, setScopeAll] = useState(false);
  const [sessionSnapshotIds, setSessionSnapshotIds] = useState<Set<string>>(
    () => new Set(),
  );
  const rememberSessionSnapshot = useCallback((id: string) => {
    setSessionSnapshotIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);
  const [demoState, setDemoState] = useState<DemoState | null>(null);
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
    addEmptyResult,
    remove: removeSnapshot,
    trashed: trashedSnapshots,
    restore: restoreSnapshotById,
    purge: purgeSnapshot,
    purgeAll: purgeAllSnapshots,
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
  const {
    values: inputValues,
    open: openInputCards,
    openWith: openInputsWith,
    receive: receiveInputRequests,
    fill: fillInput,
    clear: clearInputs,
  } = useInputRequests();

  // ── panel-judge 트리거 — 패널 변경 직후 적어 두면 다음 커밋에서 판정이 나간다.
  // (판정 본체는 아래 effect — mutator 직후 클로저는 낡은 상태를 보므로, 상태가
  // 반영된 커밋 뒤에 페이로드를 만든다. #163 revision 규율.)
  const pendingJudgeRef = useRef<PanelJudgeEvent | null>(null);
  const requestJudge = useCallback((event: PanelJudgeEvent) => {
    pendingJudgeRef.current = event;
  }, []);

  /**
   * 작업판 트리 — 설비⊃분석⊃카드 3종 보관물의 정본(#168). 대화와 무관하게
   * 살고(localStorage 영속), 새 대화·대화 전환에서 초기화하지 않는다.
   * SSR 첫 렌더와의 hydration 불일치를 피하려고 빈 트리로 시작해 클라이언트
   * 마운트 후 복원한다.
   */
  const [tree, setTree] = useState<WorkbenchTree>(EMPTY_TREE);
  const [treeHydrated, setTreeHydrated] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTree(loadWorkbenchTree());
    setTreeHydrated(true);
  }, []);
  useEffect(() => {
    if (treeHydrated) saveWorkbenchTree(tree);
  }, [tree, treeHydrated]);
  /** 구식 호환 뷰 — 대화 저장 형식·질의 스코프가 아직 세션 목록을 읽는다. */
  const legacySessions: SkillSession[] = useMemo(
    () =>
      tree.equipments.flatMap((eq) =>
        eq.analyses.map((an) => ({
          id: an.id,
          equipment: eq.name,
          skill: an.skill,
          values: an.args,
        })),
      ),
    [tree],
  );
  // 질의 대상 — 사용자가 트레이에 담은 설비·분석. 이 질문이 무엇을 놓고 하는
  // 질문인지이며, 담긴 게 없으면 지금까지처럼 대화 맥락 전체를 본다.
  const [queryScope, setQueryScope] = useState<ScopeItem[]>([]);

  const toggleQueryScope = useCallback((item: ScopeItem) => {
    setQueryScope((prev) => toggleScope(prev, item));
  }, []);
  const addQueryScope = useCallback((item: ScopeItem) => {
    setQueryScope((prev) => addToScope(prev, item));
  }, []);
  const removeQueryScope = useCallback((item: ScopeItem) => {
    setQueryScope((prev) => removeFromScope(prev, item));
  }, []);

  /**
   * 설비 등록 — 이 화면의 **진입**. 두 번 불린다.
   *
   * 첫 호출은 설비만(`skill === null`): 카드를 세우고 끝난다. 스킬을 안 고르고
   * 채팅부터 시작할 수 있어야 하므로, 등록의 최소 단위는 설비 하나다.
   *
   * 스킬까지 정해지면 두 번째 호출이 온다. 그때는 **필요한 값이 이미 다 채워져
   * 있다** — 진입 폼이 다 채우기 전에는 [시작]을 열지 않기 때문이다. 그래서
   * 여기서 입력 카드를 세울 일은 없고, 설비명과 폼이 받아 온 값(`values`)을
   * 그대로 값 맵에 넣는 것으로 끝난다. 조회 스텝은 요청 카드로 서고, 그건
   * 파생이 그린다.
   */
  /** 직접 올린 그림·링크를 산출물 목록 앞에 세운다 — 방금 올린 것이 위. */
  const handleAddArtifact = useCallback(
    (
      entry:
        | { kind: "image"; label: string; dataUrl: string }
        | { kind: "link"; label: string; url: string },
    ) => {
      setUserArtifacts((prev) => {
        // id 는 목록 위치와 무관해야 한다 — 순번으로 지으면 하나 지운 뒤 올린
        // 것이 방금 지운 것과 같은 id 를 받아 서로를 덮는다.
        const id = `user:${entry.kind}:${newId()}`;
        const base = { id, messageId: null, turn: null } as const;
        const next: Artifact =
          entry.kind === "image"
            ? {
                ...base,
                label: entry.label || "그림",
                kind: "image",
                payload: { label: entry.label, dataUrl: entry.dataUrl },
              }
            : {
                ...base,
                label: linkLabel({ label: entry.label, url: entry.url }),
                kind: "link",
                payload: { label: entry.label, url: entry.url },
              };
        return [next, ...prev];
      });
    },
    [],
  );

  /**
   * 직접 올린 산출물 지우기 — 대화에서 **파생된** 산출물은 대상이 아니다.
   * 그쪽은 답이 있는 한 매 렌더마다 다시 계산되므로, 지워도 곧바로 되살아난다.
   */
  const handleRemoveArtifact = useCallback((id: string) => {
    setUserArtifacts((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const handleAddEquipment = useCallback(
    (
      equipment: string,
      line: string | null,
      skill: Skill | null,
      values: Record<string, string>,
    ) => {
      // 아직 아무것도 안 담겼으면 방금 등록한 설비를 담는다 — 등록하자마자 묻는
      // 사람에게 "어느 설비인지 모르겠습니다"가 돌아오면 안 된다. 이미 담아 둔 게
      // 있으면 건드리지 않는다: 그건 사용자가 정한 범위다.
      setQueryScope((prev) =>
        prev.length === 0 ? [{ kind: "equipment", equipment }] : prev,
      );
      // 방금 세운 설비 카드로 데려간다 — 등록이 무엇을 만들었는지 보이도록.
      setRightTab("context");
      setEquipmentFocus((prev) => ({
        key: equipmentCardId(equipment),
        n: prev.n + 1,
      }));
      // 설비 카드부터 세운다 — 스킬이 붙든 안 붙든 이건 늘 한다. 같은 이름은
      // 병합이고, 스킬까지 정해졌으면 그 안에 분석 카드가 함께 선다(같은 run
      // 재등록은 기존 카드 유지).
      if (!skill) {
        setTree((prev) => upsertEquipment(prev, equipment, line));
        return;
      }
      setTree((prev) => openAnalysis(prev, equipment, line, skill, values).wb);
      // 분석 카드는 요청 카드를 직접 세우지 않는다 — 판정이 선언(runs[])을 보고
      // 첫 카드를 연다.
      requestJudge({ type: "session-registered" });
    },
    [requestJudge],
  );

  // 현재 세션이 등록한 스냅샷만 기본으로 본다 — 전역 저장분(예전 세션 잔여)은
  // '전체' 스코프에서만. 채팅에 실려 나가는 것도 이 스코프를 따른다.
  const scopedSnapshots = scopeAll
    ? snapshots
    : snapshots.filter((s) => sessionSnapshotIds.has(s.id));

  // 요청 카드는 **서버 판정이 만든다**(#163 — 카드 진실원 단일화). 화면은 작업판
  // 트리(설비⊃분석⊃카드)를 읽어 옮겨 담을 뿐이다 — 라벨 파싱 없음. 트리의 data
  // 카드는 세션 스코프와 무관하게 본문을 찾는다(보관물이 스코프 토글로 사라지면
  // 그게 곧 "카드가 죽는" 증상이다). 미분류·구식 릴레이 요청만 스코프를 따른다.
  const { equipmentCards, groups: dataGroups } = deriveWorkbenchPanel(
    tree,
    snapshots,
    scopedSnapshots,
    [...openRequests],
  );
  const detailCard =
    equipmentCards.find((c) => c.id === detailCardId) ?? null;

  // 답변 산출물 — 대화에서 파생된 것이 위(새 답이 먼저), 직접 올린 것이 아래.
  const artifacts = [...deriveArtifacts(messages), ...userArtifacts];

  // 화면에서 사라진 대상은 담긴 채로 두지 않는다 — 보이지 않는 것을 근거로 답하게
  // 된다. 파생이 다시 돈 직후에 맞춰야 하므로 렌더 중에 정리한다.
  const prunedScope = pruneScope(
    queryScope,
    equipmentCards.map((c) => c.equipment),
    equipmentCards.flatMap((c) => c.lines.map((l) => l.key)),
  );
  if (prunedScope !== queryScope) setQueryScope(prunedScope);

  /**
   * 이 대상에 붙일 데이터가 실제로 있는가 — 트레이 칩의 점이 이걸로 갈린다.
   *
   * 요청만 서 있는 대상도 담을 수 있다(조회 키는 이미 정해져 있어 백엔드가
   * 되묻지 않는다). 그래서 점이 늘 채워져 있으면 "데이터가 없다"는 답이 왜
   * 나오는지 알 수 없다 — 담긴 것과 쥔 것은 다른 얘기다.
   */
  function scopeHasData(item: ScopeItem): boolean {
    if (item.kind === "equipment") {
      const card = equipmentCards.find((c) => c.equipment === item.equipment);
      return !!card && card.lines.some((l) => l.status === "filled");
    }
    const line = equipmentCards
      .flatMap((c) => c.lines)
      .find((l) => l.key === item.lineKey);
    return line?.status === "filled";
  }

  /**
   * 왼쪽 데이터 패널에 보일 그룹 — 질의 대상이 담겨 있으면 그 범위만 남긴다
   * (담긴 게 없으면 전부). 미분류만은 예외로 늘 남긴다: 방금 붙여넣은 표가
   * 스코프에 걷혀 조용히 사라지면 등록이 무반응처럼 보인다.
   */
  const visibleGroups =
    scopeAll || prunedScope.length === 0
      ? dataGroups
      : dataGroups.filter(
          (g) =>
            g.key === UNCLASSIFIED_GROUP_KEY ||
            hasEquipment(prunedScope, g.equipment) ||
            prunedScope.some(
              (i) => i.kind === "analysis" && i.lineKey === g.key,
            ),
        );

  /**
   * 채팅에 실어 보낼 스냅샷 — 담긴 대상의 것만.
   *
   * 담긴 게 없으면 지금까지처럼 전부 나간다(스코프는 좁히는 장치다). 설비를 못
   * 읽는 스냅샷(직접 붙여넣기·미분류)은 스코프와 무관하게 남긴다 — 어느 설비에도
   * 매이지 않은 것을 설비 기준으로 걷어내면 사용자가 방금 붙여넣은 표가 조용히
   * 사라진다.
   */
  const sentSnapshots =
    prunedScope.length === 0
      ? scopedSnapshots
      : scopedSnapshots.filter((s) => {
          // 소속은 트리가 안다 — 어느 분석의 data 카드가 이 본문을 참조하는가.
          const owner = ownerOfSnapshot(tree, s.id);
          if (!owner) return true; // 미소속(붙여넣기)은 스코프와 무관하게 남긴다.
          return (
            hasEquipment(prunedScope, owner.equipment.name) ||
            prunedScope.some(
              (i) => i.kind === "analysis" && i.lineKey === owner.analysis.id,
            )
          );
        });

  // ── Conversation ↔ local state sync ─────────────────────────
  // 지금 화면에 선 작업판 — 우측 설비 카드의 씨앗이다. 매 렌더 새로 만들지만
  // 저장 쪽이 내용으로 비교하므로(`sameWorkbench`) 되쓰기가 나지 않는다.
  const workbench: Workbench = useMemo(
    () => ({
      // 저장 형식은 구식 그대로 — 트리에서 내려 담는다(옛 저장분과 호환).
      seedEquipments: tree.equipments.map((e) => e.name),
      equipmentLines: Object.fromEntries(
        tree.equipments
          .filter((e): e is typeof e & { line: string } => e.line !== null)
          .map((e) => [e.name, e.line]),
      ),
      skillSessions: legacySessions,
      sessionSnapshotIds: [...sessionSnapshotIds],
      queryScope,
    }),
    [tree, legacySessions, sessionSnapshotIds, queryScope],
  );

  /**
   * 대화에 붙은 작업판을 화면에 세운다. 설비·분석은 전역 보관물이라 지우지
   * 않고 트리에 **병합**한다(#168 — 옛 대화 저장분의 승계가 이 병합이다).
   * 대화에 매인 것(스코프·세션 스냅샷)만 그대로 되돌린다.
   */
  const applyWorkbench = useCallback((next: Workbench) => {
    setTree((prev) => {
      let wb = prev;
      for (const name of next.seedEquipments) {
        wb = upsertEquipment(wb, name, next.equipmentLines[name] ?? null);
      }
      for (const s of next.skillSessions) {
        wb = openAnalysis(
          wb,
          s.equipment,
          next.equipmentLines[s.equipment] ?? null,
          s.skill,
          s.values,
        ).wb;
      }
      return wb;
    });
    setSessionSnapshotIds(new Set(next.sessionSnapshotIds));
    setQueryScope(next.queryScope);
  }, []);

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
    // 설비 카드는 저장물이 아니라 파생물이다 — 씨앗을 되돌려야 카드가 다시 선다.
    applyWorkbench(conv.workbench ?? EMPTY_WORKBENCH);
    // 요청 카드는 서버 판정의 파생물이다 — 복원된 세션·스냅샷으로 한 번 판정해
    // 카드를 되살린다(선언적 리컨사일의 복원 이점).
    requestJudge({ type: "conversation-loaded" });
  }, [activeId, conversationsHydrated, conversations, applyWorkbench, requestJudge]);

  // 아직 대화가 없을 때(첫 메시지 전) 세워 둔 작업판을 되살린다. 대화가 생기면
  // 그 대화가 안고 가므로 이 자리는 그때 비워진다.
  const pendingLoadedRef = useRef(false);
  useEffect(() => {
    if (!conversationsHydrated || pendingLoadedRef.current) return;
    pendingLoadedRef.current = true;
    if (activeId) return;
    const pending = loadPendingWorkbench();
    if (isEmptyWorkbench(pending)) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    applyWorkbench(pending);
  }, [activeId, conversationsHydrated, applyWorkbench]);

  // Persist: throttle local state writes to the active conversation. The
  // 300ms idle window collapses per-token streaming updates into a single
  // localStorage write while preserving freshness for typed input.
  // updateConversation has an identity check, so the load case (state ===
  // conv contents) is a no-op — updatedAt is not bumped.
  useEffect(() => {
    if (!conversationsHydrated) return;
    const handle = setTimeout(() => {
      if (!activeId) {
        // 붙일 대화가 아직 없다 — 첫 메시지가 올 때까지만 따로 맡아 둔다.
        savePendingWorkbench(workbench);
        return;
      }
      updateConversation(activeId, { messages, workbench });
      clearPendingWorkbench();
    }, 300);
    return () => clearTimeout(handle);
  }, [
    messages,
    workbench,
    activeId,
    conversationsHydrated,
    updateConversation,
  ]);

  // ── panel-judge (`POST /chat/data`) — 패널 변경의 결정론 판정 ─────────────
  // 패널의 등록·토글·삭제가 사람 발화 없이 BE 판정을 부르고, 응답의
  // `openRequests` 로 카드를 리컨사일한다. 절차가 종결되면 그 응답의 token
  // 스트림이 종결 서술이 된다 — "등록 완료" 타이핑이 필요 없어진다(#163).
  const judgeAbortRef = useRef<AbortController | null>(null);
  const judgeRevisionRef = useRef(0);
  /**
   * 판정 진행 중 — 채팅의 생각 중 표시용. `isStreaming` 과 분리다(입력은 안
   * 잠근다). 결과 등록류 이벤트에서만 켠다: 토글·휴지통 같은 즉답 판정마다
   * 풍선이 깜빡이면 소음이다.
   */
  const [judging, setJudging] = useState(false);

  // 판정 페이로드 재료 — 커밋마다 동기화해 아래 판정 effect 가 늘 최신을 읽는다
  // (선언 순서상 이 effect 가 먼저 돈다).
  const judgeStateRef = useRef({
    messages,
    sentSnapshots,
    snapshots,
    tree,
    legacySessions,
    prunedScope,
    inputValues,
    demoState,
    activeId,
    workbench,
  });
  useEffect(() => {
    judgeStateRef.current = {
      messages,
      sentSnapshots,
      snapshots,
      tree,
      legacySessions,
      prunedScope,
      inputValues,
      demoState,
      activeId,
      workbench,
    };
  });

  // deps 없음이 의도다: 어떤 상태가 바뀌었든 커밋마다 pendingJudgeRef 를 확인해야
  // 하고, 트리거가 없으면 첫 줄에서 반환하므로 setJudging 이 갱신 연쇄를 만들 수 없다.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const event = pendingJudgeRef.current;
    if (!event) return;
    pendingJudgeRef.current = null;
    const state = judgeStateRef.current;
    // 데모 재생 중에는 판정을 부르지 않는다 — 시나리오 결정론 보존.
    if (state.demoState) return;

    // 연타(등록 직후 토글 등)는 앞 판정을 끊는다 — 응답 revision echo 대조와
    // 함께 순서 역전을 막는 이중 장치다.
    judgeAbortRef.current?.abort();
    const controller = new AbortController();
    judgeAbortRef.current = controller;
    const timeoutId = setTimeout(() => controller.abort(), JUDGE_TIMEOUT_MS);
    const revision = ++judgeRevisionRef.current;
    const narrationId = `judge_${newId()}`;
    // 결과가 제출된 이벤트다 — 서술이 올 수 있으니 생각 중 표시를 켠다.
    // (실제로 서술이 없으면 done 과 함께 조용히 꺼진다.)
    if (event.type === "snapshot-registered" || event.type === "snapshot-added") {
      setJudging(true);
    }

    // 판정에는 트리가 참조하는 본문이 스코프와 무관하게 실려야 한다 — 절차
    // 진행은 대화(세션)보다 오래 살고, 이게 빠지면 BE 가 "미도착"으로 오판해
    // 이미 채운 카드를 다시 연다.
    const treeSnapIds = referencedSnapshotIds(state.tree);
    const judgeSnapshots = [
      ...state.sentSnapshots,
      ...state.snapshots.filter(
        (s) =>
          treeSnapIds.has(s.id) &&
          !state.sentSnapshots.some((t) => t.id === s.id),
      ),
    ];

    void judgeChatData(
      {
        eventId: newId(),
        revision,
        event,
        messages: state.messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        snapshots: toChatPayload(judgeSnapshots),
        runs: toRunDecls(state.tree),
        scope: toChatScope(state.prunedScope, state.legacySessions),
        inputs: toChatInputs(state.inputValues),
      },
      {
        // 서술 메시지는 **첫 token 에서만** 만든다 — 카드만 있는 응답(대다수)이
        // 빈 회색 풍선을 남기면 안 된다.
        onNarrationStart: () => {
          setMessages((prev) => [
            ...prev,
            {
              id: narrationId,
              role: "assistant",
              content: "",
              createdAt: Date.now(),
            },
          ]);
          // 채팅 없이 완결된 서술도 저장돼야 한다 — 대화가 없으면 만든다.
          if (!state.activeId) {
            loadedIdRef.current = createConversation({
              messages: state.messages,
              workbench: state.workbench,
            }).id;
            clearPendingWorkbench();
          }
        },
        onNarrationToken: (piece) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === narrationId ? { ...m, content: m.content + piece } : m,
            ),
          );
        },
      },
      controller.signal,
    )
      .then((done) => {
        if (!done) return; // 무음 폴백 — BE 없는 환경에서 에러 풍선 금지.
        // 낡은 응답 폐기 — 이 판정 뒤에 새 판정이 이미 나갔다면 그쪽이 진실이다.
        if (revision !== judgeRevisionRef.current) return;
        // 허상 정리용 생존 조회 — 완전 삭제된 본문을 물고 있는 data 카드는
        // 채워진 자리가 아니다(요청 재개).
        const alive = new Set(judgeStateRef.current.snapshots.map((s) => s.id));
        // 카드는 트리에 앉는다 — 각 분석의 request 카드만 전량 교체된다.
        // run 참조가 어느 분석과도 안 맞는 카드는 버린다(선언은 트리에서
        // 나갔으므로 정상 경로에선 없다 — 소속을 지어내지 않는다).
        setTree(
          (prev) =>
            reconcileRequestCards(
              prev,
              (done.openRequests ?? []) as WireRequest[],
              (id) => alive.has(id),
            ).wb,
        );
      })
      .finally(() => {
        clearTimeout(timeoutId);
        // 뒤에 새 판정이 이미 켜 둔 표시를 여기서 끄면 안 된다.
        if (revision === judgeRevisionRef.current) setJudging(false);
      });
  });

  // 언마운트 시 진행 중 판정 정리.
  useEffect(() => () => judgeAbortRef.current?.abort(), []);

  const sendToApi = useCallback(
    async (
      history: Message[],
      demoMeta?: DemoMeta,
      // 자동 재발사는 방금 채운 값 맵을 명시로 넘긴다(setState 직후라 클로저의
      // inputValues 는 아직 최신이 아니다). 일반 발화는 생략 → sticky inputValues.
      inputsSnapshot?: ChatInputs,
    ) => {
      const assistantId = newId();
      let assistantInserted = false;

      // 응답 지연 시 AbortController 로 자르고 timeout 으로 분류.
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      try {
        const res = await fetch("/api/fdc/v1/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: history,
            demo: demoMeta,
            // 동봉이 없으면 undefined 라 필드 자체가 빠진다 — 이 기능을 안 쓰는
            // 요청은 지금까지와 똑같은 본문으로 나간다. 데모 재생 중에는 아예
            // 싣지 않는다: 시나리오는 정해진 답을 내야 하는데, 사용자가 보관해 둔
            // 스냅샷이 끼어들면 재생이 결정론을 잃는다.
            dataSnapshots: demoMeta ? undefined : toChatPayload(sentSnapshots),
            // 사용자가 담은 질의 대상 — 이 질문이 무엇을 놓고 하는 질문인지.
            // 담긴 게 없으면 필드가 빠져 지금까지와 같은 본문으로 나간다.
            scope: demoMeta
              ? undefined
              : toChatScope(prunedScope, legacySessions),
            // 채운 스칼라 입력 — 스킬 네임스페이스. sticky 라 대화 내내 실려 나가
            // 백엔드가 후속 턴마다 그 값으로 스킬을 이어간다. 데모는 싣지 않는다.
            inputs: demoMeta
              ? undefined
              : toChatInputs(inputsSnapshot ?? inputValues),
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
            // 보낼 때의 대상을 답에 새긴다 — 트레이는 지금 담긴 것만 보여주므로,
            // 이게 없으면 스크롤을 올렸을 때 근거가 사라진다.
            ...(prunedScope.length > 0
              ? { scopeLabels: prunedScope.map(scopeLabel) }
              : {}),
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
            const hasInputRequests =
              !!payload.inputRequests && payload.inputRequests.length > 0;
            // 그림·링크 — 어디서 읽어왔는지는 백엔드가 진다(MCP 등). 여기는
            // 받은 것을 답에 달아 둘 뿐이고, 그리는 것은 데이터 패널이 한다.
            const hasImages = !!payload.images && payload.images.length > 0;
            const hasLinks = !!payload.links && payload.links.length > 0;
            if (
              assistantInserted &&
              (hasTables ||
                hasCharts ||
                hasTimelines ||
                hasRecommend ||
                hasDataRequests ||
                hasInputRequests ||
                hasImages ||
                hasLinks)
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
                  if (hasInputRequests) next.inputRequests = payload.inputRequests;
                  if (hasImages) next.images = payload.images;
                  if (hasLinks) next.links = payload.links;
                  return next;
                }),
              );
            }
            // 요청 카드는 데이터 패널이 안는다. 어느 질문에서 비롯됐는지 함께
            // 넘겨야, 채워졌을 때 이어가기 안내의 수명을 관리할 수 있다.
            // 데모 재생 중에는 만들지 않는다(시나리오 결정론 보존).
            // 패널은 상주라 따로 열 필요가 없다 — 카드가 최상단에 바로 뜬다.
            if (hasDataRequests && !demoMeta) {
              // run 참조가 트리의 분석과 맞는 카드는 판정이 트리에 앉힌다 —
              // 여기서 구식 store 에도 넣으면 같은 카드가 두 곳에 선다.
              const analyses = allAnalyses(judgeStateRef.current.tree);
              const matched = payload.dataRequests!.filter((r) =>
                analyses.some((a) => sameRun(runRefOf(a), r.run)),
              );
              const alien = payload.dataRequests!.filter(
                (r) => !analyses.some((a) => sameRun(runRefOf(a), r.run)),
              );
              if (matched.length > 0) {
                // 트리 반영은 판정 왕복 하나로 통일한다(카드 진실원 = 판정).
                requestJudge({ type: "chat-requests" });
              }
              if (alien.length > 0) {
                const originIndex = findLastIndex(
                  history,
                  (m) => m.role === "user",
                );
                const origin =
                  originIndex === -1 ? undefined : history[originIndex];
                if (origin) {
                  receiveRequests(alien, origin.id);
                }
                // 강조는 오른쪽 — 요청이 낳은 설비 카드를 우측에서 펼치고 깜빡인다.
                const eq = parseLabel(alien[0].label).equipment;
                if (eq) {
                  setRightTab("context");
                  setEquipmentFocus((prev) => ({
                    key: equipmentCardId(eq),
                    n: prev.n + 1,
                  }));
                }
              }
            }
            // 입력 카드도 데이터 패널이 안는다 — 스칼라라 출처 매기 없이 (skill,key)
            // 로 관리한다. 데모 재생 중에는 만들지 않는다(시나리오 결정론 보존).
            if (hasInputRequests && !demoMeta) {
              receiveInputRequests(payload.inputRequests!);
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
    [
      sentSnapshots,
      prunedScope,
      legacySessions,
      inputValues,
      receiveRequests,
      receiveInputRequests,
      requestJudge,
      setEquipmentFocus,
    ],
  );

  /**
   * 입력 카드 제출 — 값을 sticky inputs 로 넣고, 요청된 입력이 **전부** 채워지면
   * 채팅 API 를 자동으로 다시 호출한다("등록 완료" 타이핑 불필요). 스칼라는 값
   * 하나라 왕복을 자동화한다. 자동 발사가 보내는 것: 트랜스크립트에 보이는 합성
   * user 메시지(트리거) + 구조화 `inputs`(억제·바인딩). 데모 재생 중엔 입력 카드가
   * 생기지 않으므로 이 경로는 실 파이프라인에서만 탄다.
   */
  const handleSubmitInput = useCallback(
    (skill: string, key: string, value: string) => {
      const label =
        openInputCards.find(
          (p) => p.request.skill === skill && p.request.key === key,
        )?.request.label ?? key;
      const next = fillInput(skill, key, value);
      if (openInputsWith(next).length > 0) return; // 아직 채울 카드가 남았다

      // 마지막 입력이 채워졌다 → 자동 재발사.
      const userMessage: Message = {
        id: newId(),
        role: "user",
        content: `입력 완료 — ${label}: ${value}`,
        createdAt: Date.now(),
      };
      const nextHistory = [...messages, userMessage];
      setMessages(nextHistory);
      setIsStreaming(true);
      void sendToApi(nextHistory, undefined, next);
    },
    [
      openInputCards,
      openInputsWith,
      fillInput,
      messages,
      sendToApi,
    ],
  );

  // 지금은 부르는 곳이 없다 — 빈 화면의 시나리오 목록을 걷어냈기 때문이다.
  // 재생 기계(turn 진행·`다시 시작`·대화 저장의 demo)는 그대로 두었으므로,
  // 진입 버튼만 다시 달면 데모가 되살아난다.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleScenarioStart = useCallback(
    async (scenario: Scenario) => {
      const starterMsg: Message = {
        id: newId(),
        role: "user",
        content: scenario.starter,
        createdAt: Date.now(),
      };
      setMessages([starterMsg]);
      setIsStreaming(true);
      setDemoState({ scenarioId: scenario.id, turnIndex: 0, ended: false });

      await sendToApi([starterMsg], {
        scenarioId: scenario.id,
        turnIndex: 0,
      });

      const nextIdx = 1;
      setDemoState({
        scenarioId: scenario.id,
        turnIndex: nextIdx,
        ended: nextIdx >= scenario.turns.length,
      });
    },
    [sendToApi],
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
        // 세워 둔 작업판을 안고 태어난다. 방금 만든 대화를 load 효과가 다시
        // 읽어 빈 작업판으로 덮지 않도록 "이미 읽은 것"으로 표시한다.
        loadedIdRef.current = createConversation({
          messages: nextHistory,
          workbench,
        }).id;
        clearPendingWorkbench();
      }

      if (demoState) {
        const scenario = SCENARIOS.find((s) => s.id === demoState.scenarioId);
        await sendToApi(nextHistory, {
          scenarioId: demoState.scenarioId,
          turnIndex: demoState.turnIndex,
        });
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
        await sendToApi(nextHistory);
      }
    },
    [
      demoState,
      messages,
      activeId,
      workbench,
      sendToApi,
      createConversation,
      clearFulfilledRequests,
    ],
  );

  /** 데이터 요청 왕복 체험 시작 — 질문을 실 파이프라인으로 그대로 보낸다. */
  const handleQuickStart = useCallback(
    async (text: string) => {
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
        loadedIdRef.current = createConversation({
          messages: nextHistory,
          workbench,
        }).id;
        clearPendingWorkbench();
      }
      await sendToApi(nextHistory);
    },
    [messages, activeId, workbench, sendToApi, createConversation],
  );

  const handleNewConversation = useCallback(() => {
    // 진행 중 판정은 이 대화의 것이다 — 늦게 도착한 스트림이 새 대화에 붙으면 안 된다.
    judgeAbortRef.current?.abort();
    setMessages([]);
    setIsStreaming(false);
    setDemoState(null);
    // 구식 릴레이 요청은 낳은 질문에 매여 있다 — 대화가 사라지면 같이 사라진다.
    // 채운 입력도 대화에 매인 것이라 함께 걷어낸다(새 대화에 이월하지 않는다).
    clearRequests();
    clearInputs();
    // 작업판 트리(설비⊃분석⊃카드)는 **건드리지 않는다** — 대화와 무관한
    // 보관물이다(#168). 설비 카드가 새 대화에서 죽는 일은 더 없다.
    setQueryScope([]);
    // 새 세션 — 예전 대화가 등록한 스냅샷은 기본 스코프에서 빠진다('전체'에서만).
    setSessionSnapshotIds(new Set());
    startNewConversation();
  }, [startNewConversation, clearRequests, clearInputs]);

  const handleSidebarSelect = useCallback(
    (id: string) => {
      // Mid-stream switch would orphan the in-flight assistant message —
      // require the user to wait for the current turn to settle.
      if (isStreaming) return;
      judgeAbortRef.current?.abort();
      setDemoState(null);
      setHistoryOpen(false);
      clearRequests();
      clearInputs();
      // 트리는 유지 — 대화 전환은 보관물을 건드리지 않는다. 스코프·세션
      // 스냅샷은 load 효과의 applyWorkbench 가 그 대화의 것으로 되돌린다.
      setQueryScope([]);
      setSessionSnapshotIds(new Set());
      selectConversation(id);
    },
    [isStreaming, selectConversation, clearRequests, clearInputs],
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

  // 데모 모드에서 다음 turn 에 매칭되는 user 텍스트 — 일치하지 않는 chip
  // 은 SuggestedQuestions 가 비활성화. 비-데모 (실 백엔드) 일 때는 모든
  // chip 활성.
  const enabledFollowUp = useMemo<string | undefined>(() => {
    if (!demoState || demoState.ended) return undefined;
    const scenario = SCENARIOS.find((s) => s.id === demoState.scenarioId);
    return scenario?.turns[demoState.turnIndex]?.user;
  }, [demoState]);

  /** 우측 탭 전환. */
  function handleRightTab(next: "context" | "summary") {
    setRightTab(next);
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
      if (result.ok) {
        fulfillRequest(opts.queryKey);
        // 같은 자리의 request 카드가 data 카드로 전이한다 — 본문은 IDB 참조.
        setTree((prev) =>
          fulfillRequestCard(prev, opts.queryKey, result.snapshot.id),
        );
        rememberSessionSnapshot(result.snapshot.id);
        requestJudge({ type: "snapshot-registered", queryKey: opts.queryKey });
      }
      return result;
    },
    [addSnapshot, fulfillRequest, rememberSessionSnapshot, requestJudge],
  );

  /**
   * 요청 카드에 "결과 없음"으로 답한다 — 조회는 했고 0행이었다는 사실을 등록한다.
   *
   * 채운 것과 같은 자리에 놓는다: 요청은 충족되고, 스냅샷은 `rows: []` 로 실려 나가
   * 백엔드가 미첨부와 구분해 읽는다. 못 채운 것이 아니라 채운 것이다.
   */
  const handleRegisterEmptyResult = useCallback(
    (
      label: string,
      opts: { queryKey: string; columns?: string[]; sourceSql?: string },
    ) => {
      const result = addEmptyResult(label, opts);
      if (result.ok) {
        fulfillRequest(opts.queryKey);
        // 0행도 채운 것이다 — 같은 자리의 카드가 data 로 전이한다.
        setTree((prev) =>
          fulfillRequestCard(prev, opts.queryKey, result.snapshot.id),
        );
        rememberSessionSnapshot(result.snapshot.id);
        requestJudge({ type: "snapshot-registered", queryKey: opts.queryKey });
      }
      return result;
    },
    [addEmptyResult, fulfillRequest, rememberSessionSnapshot, requestJudge],
  );

  /** 수동 등록 — 이름을 묻지 않는다. 라벨은 내용에서 자동으로 만들어진다. */
  const handleAddSnapshot = useCallback(
    (input: string) => {
      const result = addSnapshot(input, "");
      if (result.ok) {
        rememberSessionSnapshot(result.snapshot.id);
        requestJudge({
          type: "snapshot-added",
          queryKey: result.snapshot.queryKey,
        });
      }
      return result;
    },
    [addSnapshot, rememberSessionSnapshot, requestJudge],
  );

  /** 판정 집합을 바꾸는 패널 액션들 — 상태를 바꾸고 다음 커밋에서 판정을 부른다. */
  const handleToggleSnapshotIncluded = useCallback(
    (id: string) => {
      const key = snapshots.find((s) => s.id === id)?.queryKey;
      toggleSnapshotIncluded(id);
      requestJudge({
        type: "snapshot-toggled",
        ...(key ? { queryKey: key } : {}),
      });
    },
    [snapshots, toggleSnapshotIncluded, requestJudge],
  );
  const handleRemoveSnapshot = useCallback(
    (id: string) => {
      const key = snapshots.find((s) => s.id === id)?.queryKey;
      removeSnapshot(id);
      requestJudge({
        type: "snapshot-trashed",
        ...(key ? { queryKey: key } : {}),
      });
    },
    [snapshots, removeSnapshot, requestJudge],
  );
  const handleRestoreSnapshotById = useCallback(
    (id: string) => {
      restoreSnapshotById(id);
      requestJudge({ type: "snapshot-restored" });
    },
    [restoreSnapshotById, requestJudge],
  );
  /**
   * 완전 삭제도 판정을 부른다 — 재개·허상 정리는 판정 reconcile 안에 살아서,
   * 판정이 안 돌면 트리가 박제된다(실제로 겪은 버그). 휴지통 보내기 판정이
   * 이미 정리했으면 이 판정은 무해한 no-op 이다.
   */
  const handlePurgeSnapshot = useCallback(
    (id: string) => {
      purgeSnapshot(id);
      requestJudge({ type: "snapshot-purged" });
    },
    [purgeSnapshot, requestJudge],
  );
  const handlePurgeAll = useCallback(() => {
    purgeAllSnapshots();
    requestJudge({ type: "snapshot-purged" });
  }, [purgeAllSnapshots, requestJudge]);

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
    void sendToApi(trimmed);
  }, [messages, sendToApi]);

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

  // 아직 채울 카드가 남았는가 — 구식 store 와 트리의 request 카드를 합쳐 센다.
  const treeOpenRequestCount = useMemo(
    () =>
      allAnalyses(tree).reduce(
        (n, a) => n + a.cards.filter((c) => c.type === "request").length,
        0,
      ),
    [tree],
  );

  /**
   * 다음 할 일 안내(패널 상단 스트립) — 조달 루프의 현재 상태에서만 파생한다.
   * "등록했는데 이제 뭘 하지"의 답이 화면 어딘가에는 서 있어야 한다(#163 UX).
   */
  const panelGuide = useMemo(() => {
    const analyses = allAnalyses(tree);
    const openCount =
      treeOpenRequestCount + openRequests.filter((p) => !p.fulfilled).length;
    if (openCount > 0) {
      return `다음 할 일 — 열린 요청 카드 ${openCount}장의 SQL을 실행해 결과를 등록하세요. 조회 결과가 없으면 [결과 없음]으로 등록해도 됩니다.`;
    }
    // 채움 = 본문이 살아 있는 data 카드만 — 완전 삭제로 허상이 된 카드를 세면
    // 데이터가 없는데 "모두 채워졌다"고 말하게 된다.
    const alive = new Set(snapshots.map((s) => s.id));
    const arrived = analyses.reduce(
      (n, a) =>
        n +
        a.cards.filter((c) => c.type === "data" && alive.has(c.snapshotId))
          .length,
      0,
    );
    if (analyses.length > 0 && arrived > 0) {
      return "필요한 조회가 모두 채워졌습니다 — 채팅의 결론을 확인하거나 이어서 질문하세요.";
    }
    if (tree.equipments.length > 0 && analyses.length === 0) {
      return "설비 카드에서 분석을 추가하면 필요한 조회가 요청 카드로 열립니다.";
    }
    return null;
  }, [tree, treeOpenRequestCount, openRequests, snapshots]);

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
              artifacts={artifacts}
              onAddArtifact={handleAddArtifact}
              onRemoveArtifact={handleRemoveArtifact}
              snapshots={scopedSnapshots}
              // 작업판 트리에서 파생한 그룹 — 질의 대상이 담겨 있으면 그 범위만.
              groups={visibleGroups}
              scopeAll={scopeAll}
              onToggleScope={() => setScopeAll((v) => !v)}
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
                  const base = prev ?? visibleGroups.map((g) => g.key);
                  return base.includes(key)
                    ? base.filter((k) => k !== key)
                    : [...base, key];
                })
              }
              inputRequests={openInputCards}
              onSubmitInput={handleSubmitInput}
              onAdd={handleAddSnapshot}
              onFulfill={handleFulfillRequest}
              onRegisterEmpty={handleRegisterEmptyResult}
              onToggleIncluded={handleToggleSnapshotIncluded}
              onRemove={handleRemoveSnapshot}
              onRename={setSnapshotLabel}
              onSetQuery={setSnapshotSourceSql}
              trashed={trashedSnapshots}
              onRestoreOne={handleRestoreSnapshotById}
              onPurge={handlePurgeSnapshot}
              onPurgeAll={handlePurgeAll}
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
              messages.length === 0 && !judging
                ? "max-w-chat-narrow px-lg"
                : "max-w-chat-narrow px-lg xl:max-w-none xl:px-[5vw]",
            ].join(" ")}
          >
            {/* 판정 중에는 빈 채팅이라도 시작 화면 대신 목록을 그린다 — 안 그러면
                채팅 없이 결과부터 등록한 사용자에게 생각 중 표시도, 곧 도착할
                종결 서술의 자리도 시작 화면에 가려 보이지 않는다. */}
            {messages.length === 0 && !judging ? (
              <ChatEmptyState onQuickStart={handleQuickStart} />
            ) : (
              <MessageList
                messages={messages}
                isStreaming={isStreaming}
                judging={judging}
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
            {/* 다음 할 일 안내 — 조달 루프 상태에서 파생. 입력창 바로 위 가운데
                영역이 "이제 뭘 하지"를 보는 자리다(채팅 버블 아님). */}
            {panelGuide && !demoState && (
              <p className="mb-xs rounded-md border border-brand-hairline bg-brand-surface-card px-sm py-xs text-caption text-brand-muted">
                {panelGuide}
              </p>
            )}
            {/*
              ChatInput 위 chip 슬롯 — 대화가 시작된 뒤에만 쓴다.
              - 등록이 끝났을 때: 이어가기 안내
              - 어시스턴트 응답 후 (스트리밍 종료): 추천 후속 질문 chips

              빈 시작 화면에는 두지 않는다. 그 자리에는 이미 팁과 왕복 두 줄이
              무엇을 물을지 말하고 있어, chip 까지 놓으면 같은 말이 세 번이다.
            */}
            {/* 충족된 요청이 있으면 추천보다 먼저 — 다음 걸음은 이어가기 발화다.
                열린 요청이 남아 있으면 안내하지 않는다 — 아직 채울 카드가 있다.
                (충족 요청의 정리는 handleSubmit 이 모든 발화에 대해 한다.) */}
            {messages.length > 0 &&
              !isStreaming &&
              ackOrigin &&
              openRequests.length === 0 &&
              treeOpenRequestCount === 0 && (
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
            {/* 질의 대상 — 입력창 바로 위. 늘 있다: 대화 중에 사라지는 자리는
                "내가 뭘 잘못 눌렀나"가 된다. 데모 재생 중에도 보이되, 실려
                나가지는 않는다(시나리오는 정해진 답을 내야 한다 — 스냅샷·입력과
                같은 규율). 데모 중에는 입력창도 잠겨 있어 결이 어긋나지 않는다. */}
            <ScopeTray
              items={prunedScope}
              onRemove={removeQueryScope}
              onDropItem={addQueryScope}
              hasData={scopeHasData}
            />
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
          {/* 오른쪽 패널 = 설비 카드. 카드·줄은 현재 세션 요청+스냅샷에서 파생. */}
          <EquipmentPanel
            open={rightTab === "context"}
            cards={equipmentCards}
            onFocusLine={(lineKey) => {
              // lineKey 는 곧 그룹 키다(설비·구간·category). 그 그룹만 왼쪽에서
              // 펼치고 깜빡여 안내한다 — 대기 줄이면 그 안에 요청 카드가, 채워진
              // 줄이면 데이터 카드가 이미 그 그룹에 들어 있다.
              setOpenGroupKeys([lineKey]);
              setGroupFocus((prev) => ({ key: lineKey, n: prev.n + 1 }));
            }}
            // 같은 카드를 다시 누르면 닫힌다.
            onOpenDetail={(id) =>
              setDetailCardId((prev) => (prev === id ? null : id))
            }
            detailCardId={detailCardId}
            focusCardId={equipmentFocus.key}
            focusNonce={equipmentFocus.n}
            onAddEquipment={handleAddEquipment}
            onToggleScope={toggleQueryScope}
            inScope={(item) =>
              item.kind === "equipment"
                ? hasEquipment(prunedScope, item.equipment)
                : hasLine(prunedScope, item.lineKey)
            }
          />
          <SummaryPanel open={rightTab === "summary"} />
        </div>
        </aside>
        )}
      </div>

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
