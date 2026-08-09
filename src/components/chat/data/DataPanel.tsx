"use client";

import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import {
  MAX_IMAGES_PER_INGEST,
  imageRejectReason,
  planClipboardIngest,
  splitDroppedFiles,
} from "@/lib/clipboard-ingest";
import type { PendingInput } from "@/lib/input-store";
import type { DerivedGroup } from "../context/derive-cards";
import type { DataMessage, DataSnapshot } from "@/lib/types";
import { AddDataModal } from "./AddDataModal";
import { MessageSection } from "./MessageCards";
import { ArtifactCard } from "./ArtifactCard";
import { ArtifactDetail } from "./ArtifactDetail";
import type { Artifact } from "./artifacts";
import { InputCard } from "./InputCard";
import { RequestCard } from "./RequestCard";
import { SnapshotCard } from "./SnapshotCard";
import { SnapshotDetail } from "./SnapshotDetail";
import type { AddSnapshotResult } from "./useDataSnapshots";

/**
 * 데이터 패널 — 3분할 레이아웃의 좌측 상주 컬럼.
 *
 * NotebookLM 의 소스 패널 관례를 따른다(따라 그리진 않는다): 항상 떠 있고,
 * 항목은 체크박스로 포함/제외. 접힌 패널 뒤에 숨어 있던 시절의 "등록했는데
 * 아무 일도 안 일어남" 문제가 상주로 풀린다 — 등록 결과가 항상 눈앞에 있다.
 *
 * **확장 모드(#136)**: 헤더의 슬라이드 버튼으로 패널이 화면의 70% 로 넓어져
 * 마스터-디테일이 된다 — 왼쪽은 그대로 카드 목록(요청 카드 포함), 오른쪽은
 * 선택한 스냅샷의 전체 표(`SnapshotDetail`). 카드에서 미리보기를 걷어낸 뒤
 * 데이터를 *읽는* 정식 자리다. 레이아웃 양보(설비 정보 패널 숨김)는 부모가
 * `expanded` 로 처리한다.
 *
 * 등록 경로는 셋:
 *  1. 하단 [+ 데이터 추가] 모달 — 기본 경로.
 *  2. **Ctrl+V 즉시 등록** — 채팅 입력창 등 텍스트 입력이 아닌 곳에서
 *     붙여넣으면 바로 등록. SQL Developer 복사 → 앱 클릭 → Ctrl+V 로 끝.
 *  3. **파일 드롭** — 패널에 끌어놓으면 읽어 등록(텍스트는 UTF-8 기준).
 *     실패하면 그 텍스트를 안고 모달이 열린다 — 붙여넣은 것을 잃지 않고
 *     원인을 보여 주기 위해.
 *
 * 2·3 은 들어온 것을 보고 갈라진다({@link planClipboardIngest}): 표·텍스트는
 * 스냅샷(`onAdd`)으로, 그림과 주소 한 줄은 답변 산출물(`onAddArtifact`)로.
 * 붙여넣는 사람이 무엇을 붙이는지 이미 알고 있으므로, 어느 통로로 넣을지는
 * 묻지 않는다.
 */
type Props = {
  snapshots: DataSnapshot[];
  /** 아직 채워지지 않은 입력 요청(스칼라) — 상단 '입력 요청' 섹션에 카드로 뜬다. */
  inputRequests: PendingInput[];
  /** 입력 카드 제출 — 값을 sticky inputs 로 넣는다(전부 차면 자동 재발사). */
  onSubmitInput: (skill: string, key: string, value: string) => void;
  onAdd: (input: string) => AddSnapshotResult;
  onFulfill: (
    input: string,
    label: string,
    opts: { include: boolean; queryKey: string; sourceSql?: string },
  ) => AddSnapshotResult;
  /** 조회했는데 0행이었다 — 요청 카드가 텍스트 없이 그 사실만 등록하는 길. */
  onRegisterEmpty: (
    label: string,
    opts: { queryKey: string; columns?: string[]; sourceSql?: string },
  ) => AddSnapshotResult;
  onToggleIncluded: (id: string) => void;
  onRemove: (id: string) => void;
  onRename: (id: string, label: string) => void;
  /** 출처 쿼리 달기/고치기(빈 값 = 지움) — 카드의 테이블 칩이 여기서 파생된다. */
  onSetQuery: (id: string, sql: string | undefined) => void;
  /**
   * 답변 산출물 — 모델이 답과 함께 내놓은 표·차트·이력·그림·링크, 그리고 사용자가
   * 직접 올린 그림·링크. 스냅샷(근거)과 섞지 않고 별도 단으로 산다.
   */
  artifacts: Artifact[];
  /** 사람이 붙여넣거나 끌어다 놓은 그림·주소가 이리로 들어온다. */
  onAddArtifact: (
    entry:
      | { kind: "image"; label: string; dataUrl: string }
      | { kind: "link"; label: string; url: string },
  ) => void;
  /**
   * 직접 올린 산출물 지우기. 파생된 산출물(모델이 낸 표·차트·그림)에는 달지
   * 않는다 — 답이 있는 한 다시 계산되어 되살아나므로 버튼이 거짓말이 된다.
   */
  onRemoveArtifact: (id: string) => void;
  /** 휴지통에 든 것들 — 최근에 버린 것이 위. */
  trashed: DataSnapshot[];
  /** 휴지통에서 꺼내기. */
  onRestoreOne: (id: string) => void;
  /** 영구 삭제 — 여기서만 데이터가 진짜 사라진다. */
  onPurge: (id: string) => void;
  onPurgeAll: () => void;
  /** 확장 모드(70% 마스터-디테일) 여부 — 레이아웃 양보가 걸려 있어 부모 소유. */
  expanded: boolean;
  onToggleExpanded: () => void;
  /**
   * 상세 면을 그릴지. 폭이 변하는 **동안에는 그리지 않는다** — 좁아지는 칸에
   * 남아 있으면 글자가 폭에 맞춰 다시 흐르며 깨져 보인다. 기본값은 `expanded`.
   */
  detailVisible?: boolean;
  /**
   * 설비별 통합 그룹 — 채워진 데이터 카드와 대기 요청 카드가 한 그룹에 함께.
   * 안 넘기면 예전처럼 평평한 목록(`snapshots`)을 그린다.
   */
  groups?: DerivedGroup[];
  /**
   * 전체 보기 — 참이면 선택(질의 대상)·세션 필터를 풀고 저장분 전부를 보인다.
   * 기본(거짓)은 오른쪽 설비 패널에서 담은 것들만.
   */
  scopeAll?: boolean;
  onToggleScope?: () => void;
  /**
   * 오른쪽 줄을 누르면 그 그룹을 화면 안으로 끌어와 잠깐 깜빡인다.
   * **지속 상태가 아니다** — 한 번의 안내일 뿐이라, 사용자가 그 뒤에 그룹을
   * 접거나 다른 걸 봐도 어긋날 상태가 남지 않는다. `focusNonce` 가 바뀔 때마다
   * 다시 안내한다(같은 줄을 또 눌러도 반응하도록).
   */
  focusGroupKey?: string | null;
  focusNonce?: number;
  /** 대기 줄이 가리킨 요청 카드 — 같은 방식으로 한 번 안내한다. */
  focusRequestKey?: string | null;
  requestFocusNonce?: number;
  /** 펼쳐진 그룹 키들. `null` = 전부 펼침. 상태의 주인은 호스트다. */
  openGroupKeys?: string[] | null;
  onToggleGroup?: (key: string) => void;
  /** 단 제목 줄 아이콘 — 그룹을 한 번에 접거나 편다. */
  onSetAllGroups?: (open: boolean) => void;
  /** 등록한 데이터가 판정 왕복 중 — 헤더 신호등이 돌고, 끝나면 초록으로 한 번 켜진다. */
  judging?: boolean;
  /** 데이터 메시지 목록(BE #64 MVP) — 설비별 제목 줄 + 상세 모달로 그린다. */
  dataMessages?: DataMessage[];
  onRemoveMessage?: (id: string) => void;
  /**
   * 붙여넣기 텍스트의 메시지 판정 왕복 — true 면 메시지 카드가 섰다(표 등록
   * 생략), false 면 비메시지·실패(로컬 표 파싱으로 폴백). 안 넘기면 붙여넣기는
   * 지금처럼 바로 표 파싱이다.
   */
  onTryMessagePaste?: (text: string) => Promise<boolean>;
  /** 명시 등록([+ 메시지] 입력 카드) — 판별 없이 무조건 메시지로. */
  onSubmitMessage?: (text: string) => Promise<boolean>;
  /** 스냅샷 오판 교정 — [메시지로] 버튼. 성공하면 호스트가 카드를 교체한다. */
  onSnapshotAsMessage?: (id: string) => void;
};

/**
 * 판정 신호등 — 데이터 등록이 조용히 서버 판정으로 넘어가는 것을 눈에 보이게
 * 한다. 왕복 동안 스피너가 돌고, 응답이 반영되는 순간 초록불이 잠깐 켜졌다
 * 꺼진다. 지속 상태를 남기지 않는다 — 한 번의 안내다.
 */
function JudgeLight({ judging }: { judging: boolean }) {
  const [flash, setFlash] = useState(false);
  const prevRef = useRef(judging);
  useEffect(() => {
    const was = prevRef.current;
    prevRef.current = judging;
    if (was && !judging) {
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 1500);
      return () => clearTimeout(t);
    }
  }, [judging]);
  if (judging) {
    return (
      <span
        role="status"
        aria-label="판정 중"
        title="등록한 데이터를 서버 판정으로 확인하는 중"
        className="ml-xs inline-block h-3 w-3 shrink-0 animate-spin rounded-full border-2 border-brand-muted/30 border-t-brand-primary align-middle"
      />
    );
  }
  if (flash) {
    return (
      <span
        role="status"
        aria-label="판정 반영됨"
        title="판정 반영됨"
        className="ml-xs inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-brand-success align-middle"
      />
    );
  }
  return null;
}

export function DataPanel({
  snapshots,
  inputRequests,
  onSubmitInput,
  onAdd,
  onFulfill,
  onRegisterEmpty,
  onToggleIncluded,
  onRemove,
  onRename,
  onSetQuery,
  artifacts,
  onAddArtifact,
  onRemoveArtifact,
  trashed,
  onRestoreOne,
  onPurge,
  onPurgeAll,
  expanded,
  onToggleExpanded,
  detailVisible,
  groups,
  scopeAll = false,
  onToggleScope,
  focusGroupKey,
  focusNonce = 0,
  focusRequestKey,
  requestFocusNonce = 0,
  openGroupKeys = null,
  onToggleGroup,
  onSetAllGroups,
  judging = false,
  dataMessages = [],
  onRemoveMessage,
  onTryMessagePaste,
  onSubmitMessage,
  onSnapshotAsMessage,
}: Props) {
  const [addOpen, setAddOpen] = useState(false);
  const [seed, setSeed] = useState<{
    text: string;
    error: { code: string; message: string };
  } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  /** 붙여넣기·드롭에서 못 받은 것의 이유 — 하단 힌트 자리에 대신 뜬다. */
  const [ingestError, setIngestError] = useState<string | null>(null);
  // 요청 묶음 전체 접기 — 요청이 여러 건이면 보관 목록이 한참 아래로 밀린다.
  const [requestsOpen, setRequestsOpen] = useState(true);
  // 보관 목록도 같은 급의 단이다 — 요청 단만 접히면 대등하지 않다.
  const [dataOpen, setDataOpen] = useState(true);
  // 휴지통은 **닫힌 채로** 시작한다 — 버린 것은 찾을 때만 보이면 된다.
  const [trashOpen, setTrashOpen] = useState(false);
  // 산출물 단은 펼친 채로 — 방금 나온 답의 표·차트가 여기 서므로 접혀 있으면
  // 답이 나와도 화면이 안 움직인 것처럼 보인다.
  const [artifactsOpen, setArtifactsOpen] = useState(true);
  // 메시지 단 — 산출물과 같은 이유로 펼친 채 시작.
  const [messagesOpen, setMessagesOpen] = useState(true);
  // 명시 입력 카드(분류에서 [메시지] 선택) 열림.
  const [messageInputOpen, setMessageInputOpen] = useState(false);
  // [데이터 추가] 분류 메뉴 — 버튼 하나가 표/메시지 두 통로로 갈라지는 자리.
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  // 요청 카드 접힘 — null = 전부 펼침. 단 제목 줄의 아이콘이 여기를 쥔다.
  const [openRequestKeys, setOpenRequestKeys] = useState<string[] | null>(null);
  /**
   * 방금 등록된 카드 — 잠깐 강조하고 화면 안으로 끌어온다. 전역 Ctrl+V 등록은
   * 스크롤 밖(목록 끝)에서 일어날 수 있어, 피드백이 없으면 "아무 일도 안
   * 일어났다"로 읽힌다. 등록 경로 셋(모달·Ctrl+V·드롭·요청 카드)이 전부 여길
   * 지나므로 한 곳에서 해결된다.
   */
  const [flashId, setFlashId] = useState<string | null>(null);
  const flashTimerRef = useRef<number | null>(null);
  const flash = useCallback((id: string) => {
    setFlashId(id);
    if (flashTimerRef.current !== null) {
      window.clearTimeout(flashTimerRef.current);
    }
    flashTimerRef.current = window.setTimeout(() => setFlashId(null), 1800);
  }, []);
  useEffect(
    () => () => {
      if (flashTimerRef.current !== null) {
        window.clearTimeout(flashTimerRef.current);
      }
    },
    [],
  );
  const includedCount = snapshots.filter((s) => s.included).length;
  const showDetail = detailVisible ?? expanded;
  // 요청 카드를 가리켰는데 단이 접혀 있으면 보여줄 수가 없다 — 먼저 편다.
  useEffect(() => {
    if (requestFocusNonce === 0) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRequestsOpen(true);
  }, [requestFocusNonce]);
  const dataCount = groups
    ? groups.reduce((n, g) => n + g.snapshots.length, 0)
    : snapshots.length;
  // 그룹 안 요청 카드의 "전부 접기/펼치기" 기본값을 계산할 원본 키 목록.
  const allRequestKeys = (groups ?? []).flatMap((g) =>
    g.requests.map((r) => r.request.queryKey),
  );
  const shownGroups = groups ?? [];

  /**
   * 확장 모드의 상세 대상 — 스냅샷의 표이거나 산출물의 그림이다. 명시 선택이
   * 사라졌으면(삭제 등) 첫 스냅샷으로 물러난다 — 빈 오른쪽 면을 사용자가
   * 채워야 할 이유가 없다.
   */
  const [picked, setPicked] = useState<{
    kind: "snapshot" | "artifact";
    id: string;
  } | null>(null);
  const pickedImage =
    expanded && picked?.kind === "artifact"
      ? (artifacts.find(
          (a): a is Artifact & { kind: "image" } =>
            a.id === picked.id && a.kind === "image",
        ) ?? null)
      : null;
  const detailTarget =
    expanded && !pickedImage
      ? (snapshots.find((s) => picked?.kind === "snapshot" && s.id === picked.id) ??
        snapshots[0] ??
        null)
      : null;

  const handleAdd = useCallback(
    (input: string) => {
      const result = onAdd(input);
      if (result.ok) flash(result.snapshot.id);
      return result;
    },
    [onAdd, flash],
  );

  const handleFulfill = useCallback(
    (
      input: string,
      label: string,
      opts: { include: boolean; queryKey: string; sourceSql?: string },
    ) => {
      const result = onFulfill(input, label, opts);
      if (result.ok) flash(result.snapshot.id);
      return result;
    },
    [onFulfill, flash],
  );

  const handleRegisterEmpty = useCallback(
    (
      label: string,
      opts: { queryKey: string; columns?: string[]; sourceSql?: string },
    ) => {
      const result = onRegisterEmpty(label, opts);
      if (result.ok) flash(result.snapshot.id);
      return result;
    },
    [onRegisterEmpty, flash],
  );

  /** 텍스트 한 덩이를 등록한다 — 실패하면 그 텍스트를 안고 모달을 연다. */
  const registerText = useCallback(
    (text: string) => {
      if (text.trim().length === 0) return;
      const result = handleAdd(text);
      if (!result.ok) {
        setSeed({
          text,
          error: { code: result.code, message: result.message },
        });
        setAddOpen(true);
      }
    },
    [handleAdd],
  );

  /** 그림 몇 장을 산출물로 올린다 — 못 받은 것은 이유를 남긴다. */
  const registerImages = useCallback(
    async (files: File[]) => {
      let rejected: string | null =
        files.length > MAX_IMAGES_PER_INGEST
          ? `한 번에 ${MAX_IMAGES_PER_INGEST}장까지 받습니다 — 나머지는 다시 붙여넣어 주세요.`
          : null;
      for (const file of files.slice(0, MAX_IMAGES_PER_INGEST)) {
        const reason = imageRejectReason(file);
        if (reason) {
          rejected = reason;
          continue;
        }
        try {
          onAddArtifact({
            kind: "image",
            label: imageLabel(file),
            dataUrl: await readAsDataUrl(file),
          });
          // 접어 둔 단에 넣으면 등록이 없던 일처럼 보인다 — 펴서 보여 준다.
          setArtifactsOpen(true);
        } catch {
          rejected = "그림을 읽지 못했습니다.";
        }
      }
      setIngestError(rejected);
    },
    [onAddArtifact],
  );

  // Ctrl+V 즉시 등록 — 클립보드에 실린 것을 보고 표·주소·그림을 가른다.
  // 텍스트 입력 요소에 하는 **텍스트** 붙여넣기는 건드리지 않는다(채팅 입력·
  // 모달 textarea 는 각자의 붙여넣기가 있다). 그림은 텍스트 입력 안에서
  // 붙여넣어도 거기서는 아무 일도 일어나지 않으므로 이쪽이 받는다.
  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      // 이미 자기 붙여넣기를 처리한 곳(채팅 입력창의 이미지 첨부)은 건드리지
      // 않는다 — 한 번의 Ctrl+V 가 첨부와 산출물로 두 번 등록되면 안 된다.
      if (e.defaultPrevented) return;
      const plan = planClipboardIngest(e.clipboardData);
      if (plan.kind === "none") return;
      if (plan.kind === "text" || plan.kind === "link") {
        const target = e.target as HTMLElement | null;
        if (target?.closest("input, textarea, [contenteditable='true']")) return;
        e.preventDefault();
        if (plan.kind === "link") {
          // 이름은 비워 보낸다 — 호스트에서 짓는 규칙이 이미 한 곳에 있다.
          onAddArtifact({ kind: "link", label: "", url: plan.url });
          setArtifactsOpen(true);
          setIngestError(null);
          return;
        }
        // 메시지 판정 왕복 먼저(BE #64) — 메시지로 서면 표 등록은 없던 일이고,
        // 비메시지·실패면 지금까지의 로컬 표 파싱으로 폴백한다(fail-open).
        if (onTryMessagePaste) {
          void onTryMessagePaste(plan.text).then((becameMessage) => {
            if (becameMessage) {
              setMessagesOpen(true);
              setIngestError(null);
            } else {
              registerText(plan.text);
            }
          });
          return;
        }
        registerText(plan.text);
        return;
      }
      // [데이터 추가] 모달이 떠 있으면 받지 않는다 — 등록 결과도 실패 이유도
      // 모달 뒤에 가려서, 붙여넣은 사람에게는 아무 일도 안 일어난 화면이 된다.
      if (addOpen) return;
      e.preventDefault();
      void registerImages(plan.files);
    }
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [registerText, registerImages, onAddArtifact, addOpen, onTryMessagePaste]);

  // 넓게 보기로 들어가면 서랍은 닫는다 — 열어 둔 채 넓히면 읽으려던 상세 면이
  // 덮인 채로 시작한다. 닫아 두면 돌아왔을 때도 놀랄 것이 없다.
  useEffect(() => {
    if (!expanded) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTrashOpen(false);
  }, [expanded]);

  // 덮은 것은 Esc 로 걷힌다 — 모달과 같은 관례(AddDataModal).
  useEffect(() => {
    if (!trashOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setTrashOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [trashOpen]);

  // 분류 메뉴도 같은 관례 — Esc 로 닫힌다.
  useEffect(() => {
    if (!addMenuOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setAddMenuOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [addMenuOpen]);

  async function handleDroppedFiles(files: FileList) {
    const { images, others } = splitDroppedFiles(Array.from(files));
    if (images.length > 0) await registerImages(images);
    for (const file of others) {
      const text = await file.text();
      registerText(text);
    }
  }

  return (
    <aside
      aria-label="데이터 패널"
      className={[
        // px↔% 폭 전환 — 모던 브라우저는 calc 보간으로 애니메이션되고,
        // 안 되는 환경은 즉시 전환될 뿐이라 기능 손실이 없다.
        "relative shrink-0 flex flex-col rounded-xl border border-brand-hairline bg-brand-canvas overflow-hidden transition-[width] duration-300",
        expanded ? "w-[70%]" : "w-[400px]",
      ].join(" ")}
      onDragEnter={(e) => {
        if (e.dataTransfer.types.includes("Files")) {
          e.preventDefault();
          setDragOver(true);
        }
      }}
    >
      <div className="flex items-center justify-between px-lg h-16 border-b border-brand-hairline">
        <h2 className="font-sans text-title-md text-brand-ink">
          데이터
          {includedCount > 0 && (
            <span className="ml-xs text-caption text-brand-muted font-normal">
              {includedCount}개 포함
            </span>
          )}
          <JudgeLight judging={judging} />
        </h2>
        <div className="shrink-0 flex items-center gap-xxs">
        {/* 전체 보기 토글 — 기본은 오른쪽 설비 패널에서 담은 것만. 문구는 늘
            같고, 켜져 있음은 선택 표시(색·배경)로만 말한다. */}
        {onToggleScope && (
          <button
            type="button"
            aria-pressed={scopeAll}
            onClick={onToggleScope}
            title="저장분 전부 보기 — 선택·세션 필터 해제"
            className={[
              "shrink-0 h-7 px-xs rounded-sm text-caption transition-colors",
              "focus:outline-none focus:ring-2 focus:ring-brand-primary/15",
              scopeAll
                ? "bg-brand-primary/10 text-brand-primary font-medium"
                : "text-brand-muted hover:text-brand-primary hover:bg-brand-ink-translucent-04",
            ].join(" ")}
          >
            전체 보기
          </button>
        )}
        {/*
          휴지통 — 버린 것은 **단이 아니라 서랍**이다. 데이터·산출물과 나란히
          단으로 서면 같은 급의 목록으로 읽히는데, 실제로는 찾을 때만 여는
          곳이다. 그래서 헤더 아이콘으로 올리고 열면 목록 위를 덮는다.
          비어 있으면 아이콘도 없다 — 빈 서랍은 채울 것이 있다는 신호가 된다.
        */}
        {trashed.length > 0 && (
          <button
            type="button"
            onClick={() => setTrashOpen((v) => !v)}
            // 넓게 보기에서는 열지 않는다 — 서랍이 상세 면까지 덮어, 데이터를
            // 읽으려고 넓힌 화면을 버린 것들이 가린다.
            disabled={expanded}
            aria-expanded={trashOpen}
            aria-label={`휴지통 ${trashed.length}개`}
            title={
              expanded
                ? "휴지통은 원래대로 돌린 뒤에 열 수 있습니다"
                : `휴지통 — 버린 ${trashed.length}개`
            }
            className={[
              "shrink-0 inline-flex items-center gap-[3px] h-8 px-xs rounded-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/15 transition-colors",
              "disabled:text-brand-muted-soft disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-brand-muted-soft",
              "hover:bg-brand-ink-translucent-04",
              trashOpen
                ? "text-brand-primary bg-brand-primary/10"
                : "text-brand-muted hover:text-brand-primary",
            ].join(" ")}
          >
            <TrashIcon />
            <span className="text-[11px] leading-none tabular-nums">
              {trashed.length}
            </span>
          </button>
        )}
        {/* 패널 전체 접기 — 두 단을 한 번에. */}
        <button
          type="button"
          onClick={() => {
            const collapse = requestsOpen || dataOpen;
            setRequestsOpen(!collapse);
            setDataOpen(!collapse);
          }}
          title={!requestsOpen && !dataOpen ? "전체 펼치기" : "전체 접기"}
          aria-label={!requestsOpen && !dataOpen ? "전체 펼치기" : "전체 접기"}
          className="shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-sm text-brand-muted hover:text-brand-primary hover:bg-brand-ink-translucent-04 focus:outline-none focus:ring-2 focus:ring-brand-primary/15 transition-colors"
        >
          <FoldIcon collapsed={!requestsOpen && !dataOpen} />
        </button>
        {/* 슬라이드 버튼(#136) — 70% 마스터-디테일 확장/복귀. */}
        <button
          type="button"
          onClick={onToggleExpanded}
          aria-expanded={expanded}
          aria-label={expanded ? "데이터 패널 원래대로" : "데이터 패널 넓게 보기"}
          title={expanded ? "원래대로" : "넓게 보기"}
          className="shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-sm text-brand-muted hover:text-brand-primary hover:bg-brand-ink-translucent-04 focus:outline-none focus:ring-2 focus:ring-brand-primary/15 transition-colors"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
            className={expanded ? "rotate-180" : ""}
          >
            <polyline points="13 17 18 12 13 7" />
            <polyline points="6 17 11 12 6 7" />
          </svg>
        </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex">
        {/* 목록 컬럼 — 접힘 모드에선 패널 전체, 확장 모드에선 왼쪽 마스터. */}
        <div
          className={[
            "flex flex-col min-h-0",
            expanded
              // 접힘 모드의 패널 폭과 **같은 값**이어야 한다 — 다르면 확장
              // 전후로 카드 폭이 달라져 목록이 다시 흐른다.
              ? "w-[400px] shrink-0 border-r border-brand-hairline-soft"
              : "flex-1 min-w-0",
          ].join(" ")}
        >
          <div className="flex-1 overflow-y-auto scrollbar-none">
            {/* 상단 요청 섹션 — 스칼라 입력 요청만. 데이터 요청 카드는 각 설비·
                분석 그룹 안에 산다. */}
            {inputRequests.length > 0 && (
              <CollapsibleSection
                title={`요청받은 데이터 (${inputRequests.length})`}
                open={requestsOpen}
                onToggle={() => setRequestsOpen((v) => !v)}
              >
                <div className="flex flex-col gap-xs">
                  {inputRequests.map((p) => (
                    <InputCard
                      key={`${p.request.skill} ${p.request.key}`}
                      request={p.request}
                      onSubmit={onSubmitInput}
                    />
                  ))}
                </div>
              </CollapsibleSection>
            )}

            {/*
              이 섹션에는 **아직 조달 전인 요청 카드도 함께** 산다(설비 하나를
              한 자리에서 보려고 그렇게 묶는다). 그래서 제목을 "등록된
              데이터"라고 하면 요청됨 카드가 등록된 것처럼 읽힌다 — 내용에 맞춰
              이름과 수를 나눈다.
            */}
            <CollapsibleSection
              title={`설비별 데이터 (등록 ${dataCount}${
                allRequestKeys.length > 0
                  ? ` · 요청 ${allRequestKeys.length}`
                  : ""
              })`}
              open={dataOpen}
              onToggle={() => setDataOpen((v) => !v)}
              action={
                <CollapseCardsButton
                  collapsed={openGroupKeys?.length === 0}
                  onClick={() => onSetAllGroups?.(openGroupKeys?.length === 0)}
                  title={
                    openGroupKeys?.length === 0
                      ? "그룹 전부 펼치기"
                      : "그룹 전부 접기"
                  }
                />
              }
            >
              {/* 데이터는 상시 그룹 — 같은 설비·구간·category 에서 나온 카드가
                  하나의 둥근 틀로 묶인다. `groups` 가 없으면 예전처럼 평평한
                  목록(확장 모드의 마스터 컬럼도 이 경로를 그대로 쓴다). */}
              {groups ? (
                <div className="flex flex-col gap-xs">
                  {shownGroups.length === 0 ? (
                    <p className="text-caption text-brand-muted-soft">
                      아직 등록된 데이터가 없습니다. 채팅이 요청한 조회 결과를
                      붙여넣으면 그룹으로 쌓입니다.
                    </p>
                  ) : (
                    shownGroups.map((g) => (
                      <SnapshotGroup
                        key={g.key}
                        label={g.label}
                        sublabel={g.sublabel}
                        count={g.snapshots.length + g.requests.length}
                        open={
                          openGroupKeys === null || openGroupKeys.includes(g.key)
                        }
                        onToggle={() => onToggleGroup?.(g.key)}
                        focused={g.key === focusGroupKey}
                        focusNonce={focusNonce}
                      >
                        {/* 대기 요청 카드를 그룹 안에 얹는다 — '아직 오는 것'이
                            위, 가진 데이터가 아래. */}
                        {g.requests.map((p) => (
                            <RequestCard
                              key={p.request.queryKey}
                              request={p.request}
                              open={
                                openRequestKeys === null ||
                                openRequestKeys.includes(p.request.queryKey)
                              }
                              onToggle={() =>
                                setOpenRequestKeys((prev) => {
                                  const base = prev ?? allRequestKeys;
                                  return base.includes(p.request.queryKey)
                                    ? base.filter(
                                        (k) => k !== p.request.queryKey,
                                      )
                                    : [...base, p.request.queryKey];
                                })
                              }
                              focused={p.request.queryKey === focusRequestKey}
                              focusNonce={requestFocusNonce}
                              onFulfill={handleFulfill}
                              onRegisterEmpty={handleRegisterEmpty}
                            />
                          ))}
                        {g.snapshots.map((s) => (
                          // 카드는 그룹 바탕보다 한 톤 밝게 — 묶여 있으면서도
                          // 각각이 떠 보여야 한다.
                          <div key={s.id} className="rounded-lg bg-brand-canvas">
                            <SnapshotCard
                              snapshot={s}
                              onToggleIncluded={onToggleIncluded}
                              onRemove={onRemove}
                              onRename={onRename}
                              onSetQuery={onSetQuery}
                              flash={s.id === flashId}
                              onSelect={
                                expanded
                                  ? () =>
                                      setPicked({ kind: "snapshot", id: s.id })
                                  : undefined
                              }
                              selected={expanded && s.id === detailTarget?.id}
                              {...(onSnapshotAsMessage
                                ? { onAsMessage: () => onSnapshotAsMessage(s.id) }
                                : {})}
                            />
                          </div>
                        ))}
                        {g.snapshots.length === 0 &&
                          g.requests.length === 0 && (
                            <p className="px-xxs pb-xs text-caption text-brand-muted-soft">
                              이 그룹은 아직 비어 있습니다.
                            </p>
                          )}
                      </SnapshotGroup>
                    ))
                  )}
                </div>
              ) : snapshots.length === 0 ? (
                <p className="text-caption text-brand-muted-soft">
                  DB 에 붙지 못하는 상황이면, 직접 실행한 조회 결과를 아래 [+
                  데이터 추가]로 붙여넣어 두세요. 체크된 데이터만 질문에 함께
                  나갑니다.
                </p>
              ) : (
                <div className="flex flex-col gap-xs">
                  {snapshots.map((s) => (
                    <SnapshotCard
                      key={s.id}
                      snapshot={s}
                      onToggleIncluded={onToggleIncluded}
                      onRemove={onRemove}
                      onRename={onRename}
                      onSetQuery={onSetQuery}
                      flash={s.id === flashId}
                      onSelect={
                        expanded
                          ? () => setPicked({ kind: "snapshot", id: s.id })
                          : undefined
                      }
                      selected={expanded && s.id === detailTarget?.id}
                      {...(onSnapshotAsMessage
                        ? { onAsMessage: () => onSnapshotAsMessage(s.id) }
                        : {})}
                    />
                  ))}
                </div>
              )}
            </CollapsibleSection>

            {/*
              메시지 단(BE #64 MVP) — 표(스냅샷)와 정체가 다른 근거라 단을
              나눈다. 목록은 설비별 제목 줄만, 내용은 상세 모달로(메시지가
              건마다 카드로 서면 패널이 스택으로 부푼다 — 사용자 결정).
            */}
            {(dataMessages.length > 0 || messageInputOpen) && (
              <CollapsibleSection
                title={`메시지 (${dataMessages.length})`}
                open={messagesOpen}
                onToggle={() => setMessagesOpen((v) => !v)}
              >
                <MessageSection
                  messages={dataMessages}
                  onRemove={(id) => onRemoveMessage?.(id)}
                  inputOpen={messageInputOpen}
                  onCloseInput={() => setMessageInputOpen(false)}
                  onSubmitInput={onSubmitMessage ?? (() => Promise.resolve(false))}
                />
              </CollapsibleSection>
            )}

            {/*
              답변 산출물 — 원래 대화 옆 페어 패널에 붙던 것들이 여기로 왔다.
              스냅샷과 **섞지 않는다**: 스냅샷은 사람이 올린 근거고 이쪽은 모델이
              만든 결과라, 한 목록이 되면 "이 답의 근거가 뭐였지"를 못 되짚는다.
            */}
            <CollapsibleSection
              title={`답변 산출물 (${artifacts.length})`}
              open={artifactsOpen}
              onToggle={() => setArtifactsOpen((v) => !v)}
            >
              {artifacts.length === 0 ? (
                <p className="text-caption text-brand-muted-soft">
                  아직 없습니다. 답이 표·차트·그림을 내놓으면 여기에 쌓이고,
                  화면 캡처나 주소를 붙여넣어도 여기에 섭니다.
                </p>
              ) : (
                <div className="flex flex-col gap-xs">
                  {artifacts.map((a, i) => (
                    // 맨 위(가장 최근 답의 첫 산출물)만 펼쳐 둔다 — 방금 나온
                    // 것은 누르지 않고 보이는 게 맞고, 나머지까지 펼치면 목록이
                    // 스크롤 덩어리가 된다.
                    <ArtifactCard
                      key={a.id}
                      artifact={a}
                      defaultOpen={i === 0}
                      // 크게 볼 것이 있는 건 그림뿐이고, 볼 자리(오른쪽 면)는
                      // 확장 모드에만 있다.
                      onSelect={
                        expanded && a.kind === "image"
                          ? () => setPicked({ kind: "artifact", id: a.id })
                          : undefined
                      }
                      selected={pickedImage?.id === a.id}
                      // 직접 올린 것(messageId === null)만 지울 수 있다.
                      onRemove={
                        a.messageId === null
                          ? () => onRemoveArtifact(a.id)
                          : undefined
                      }
                    />
                  ))}
                </div>
              )}
            </CollapsibleSection>

          </div>

          {/* 하단 넓은 추가 버튼 — 목록이 얼마나 길든 같은 자리에 있다.
              등록 통로가 둘(표/메시지)이 되면서 버튼을 늘리는 대신 분기를 안으로
              접었다: 누르면 분류가 버튼 위에 뜨고, 골라야 입력이 열린다. 메시지
              경로가 배선되지 않은 화면은 분류 없이 예전처럼 바로 모달이다. */}
          <div className="relative shrink-0 px-lg py-md border-t border-brand-hairline">
            {addMenuOpen && onSubmitMessage && (
              <>
                {/* 바깥 클릭 닫기 — 선택지 두 개짜리 메뉴라 모달급 덮개는 과하다. */}
                <div
                  className="fixed inset-0 z-20"
                  onClick={() => setAddMenuOpen(false)}
                  aria-hidden
                />
                <div
                  role="menu"
                  aria-label="데이터 추가 분류"
                  className="absolute bottom-full left-lg right-lg z-30 mb-xs rounded-lg border border-brand-hairline bg-brand-canvas shadow-lg overflow-hidden"
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setAddMenuOpen(false);
                      setSeed(null);
                      setAddOpen(true);
                    }}
                    className="w-full px-sm py-xs text-left hover:bg-brand-ink-translucent-04 focus:outline-none focus:bg-brand-ink-translucent-04"
                  >
                    <span className="block text-body-sm text-brand-ink">
                      표 데이터
                    </span>
                    <span className="block text-caption text-brand-muted-soft">
                      직접 실행한 조회 결과를 붙여넣어 등록합니다
                    </span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setAddMenuOpen(false);
                      setMessageInputOpen(true);
                      setMessagesOpen(true);
                    }}
                    className="w-full px-sm py-xs text-left border-t border-brand-hairline-soft hover:bg-brand-ink-translucent-04 focus:outline-none focus:bg-brand-ink-translucent-04"
                  >
                    <span className="block text-body-sm text-brand-ink">
                      메시지
                    </span>
                    <span className="block text-caption text-brand-muted-soft">
                      설비/카프카 메시지 — 판별 없이 메시지로 변환합니다
                    </span>
                  </button>
                </div>
              </>
            )}
            <button
              type="button"
              onClick={() => {
                if (!onSubmitMessage) {
                  setSeed(null);
                  setAddOpen(true);
                  return;
                }
                setAddMenuOpen((v) => !v);
              }}
              aria-expanded={onSubmitMessage ? addMenuOpen : undefined}
              aria-haspopup={onSubmitMessage ? "menu" : undefined}
              className="w-full inline-flex items-center justify-center gap-xs h-10 rounded-md border border-brand-hairline text-brand-ink text-body-sm hover:border-brand-primary hover:text-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/15 transition-colors"
            >
              <PlusIcon />
              데이터 추가
            </button>
            {ingestError ? (
              <p
                role="alert"
                className="mt-xs text-center text-caption text-brand-error"
              >
                {ingestError}
              </p>
            ) : (
              <p className="mt-xs text-center text-caption text-brand-muted-soft">
                표를 복사해 Ctrl+V 하거나 파일을 끌어놓아도 등록됩니다. 화면
                캡처·주소를 붙여넣으면 산출물에 섭니다.
              </p>
            )}
          </div>
        </div>

        {/* 상세 면 — 확장 모드의 오른쪽. 카드에서 걷어낸 "읽기"가 여기 산다.
            그림을 고르면 표 대신 그림이 이 자리를 쓴다. */}
        {showDetail &&
          (pickedImage ? (
            <ArtifactDetail artifact={pickedImage} />
          ) : detailTarget ? (
            <SnapshotDetail snapshot={detailTarget} />
          ) : (
            <div className="flex-1 min-w-0 flex items-center justify-center">
              <p className="text-caption text-brand-muted-soft">
                등록된 데이터가 없습니다 — 왼쪽 [+ 데이터 추가]로 시작하세요.
              </p>
            </div>
          ))}
      </div>

      {/* 파일 드롭존 오버레이 — 끌어온 동안만 패널을 덮는다. */}
      {dragOver && (
        <div
          className="absolute inset-0 z-10 flex items-center justify-center rounded-xl border-2 border-dashed border-brand-primary bg-brand-primary/10"
          onDragOver={(e) => e.preventDefault()}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            if (e.dataTransfer.files.length > 0) {
              void handleDroppedFiles(e.dataTransfer.files);
            }
          }}
        >
          <p className="text-body-sm font-medium text-brand-primary">
            여기에 놓으면 등록됩니다
          </p>
        </div>
      )}

      {/*
        휴지통 서랍 — 헤더 아래를 덮는다(헤더는 남는다: 연 아이콘이 곧 닫는
        아이콘이다). 목록을 밀어내지 않으므로 되돌린 카드가 어디로 돌아가는지
        보인다.

        영구 삭제를 이 안에만 두는 이유: 카드의 [삭제]가 곧바로 지우면 오클릭
        하나로 SQL 을 다시 돌려야 한다. 진짜 사라지는 문은 하나면 되고, 그
        문은 버린 것들을 눈으로 보는 자리에 있어야 한다.
      */}
      {trashOpen && trashed.length > 0 && (
        <div className="absolute inset-x-0 top-16 bottom-0 z-20 flex flex-col bg-brand-canvas">
          <div className="shrink-0 flex items-center gap-xs px-lg py-sm border-b border-brand-hairline-soft">
            <h3 className="flex-1 min-w-0 font-sans text-body-sm font-medium text-brand-ink">
              휴지통{" "}
              <span className="text-caption text-brand-muted font-normal">
                {trashed.length}개
              </span>
            </h3>
            <button
              type="button"
              onClick={onPurgeAll}
              title="휴지통을 비웁니다 — 되돌릴 수 없습니다"
              className="shrink-0 text-caption text-brand-muted-soft hover:text-brand-error focus:outline-none focus:ring-2 focus:ring-brand-primary/15 rounded-sm px-xxs"
            >
              비우기
            </button>
            <button
              type="button"
              onClick={() => setTrashOpen(false)}
              aria-label="휴지통 닫기"
              title="닫기"
              className="shrink-0 text-caption text-brand-muted-soft hover:text-brand-ink focus:outline-none focus:ring-2 focus:ring-brand-primary/15 rounded-sm px-xxs"
            >
              닫기
            </button>
          </div>
          <ul className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-xxs px-lg py-sm">
            {trashed.map((s) => (
              <li
                key={s.id}
                className="flex items-center gap-xs rounded-md border border-brand-hairline-soft bg-brand-canvas px-sm py-xs"
              >
                <span className="flex-1 min-w-0">
                  <span className="block truncate text-caption text-brand-muted">
                    {s.label}
                  </span>
                  <span className="block text-[11px] leading-[1.5] text-brand-muted-soft">
                    {s.columns.length}열 · {s.rows.length}행
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => onRestoreOne(s.id)}
                  className="shrink-0 text-caption text-brand-primary hover:underline focus:outline-none focus:ring-2 focus:ring-brand-primary/15 rounded-sm px-xxs"
                >
                  되돌리기
                </button>
                <button
                  type="button"
                  onClick={() => onPurge(s.id)}
                  title="영구 삭제 — 되돌릴 수 없습니다"
                  className="shrink-0 text-caption text-brand-muted-soft hover:text-brand-error focus:outline-none focus:ring-2 focus:ring-brand-primary/15 rounded-sm px-xxs"
                >
                  영구 삭제
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <AddDataModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdd={handleAdd}
        seed={seed}
      />
    </aside>
  );
}

/**
 * 좁혀진 한 그룹 — 같은 설비·구간·category 에서 나온 카드들을 하나의 둥근 틀로
 * 묶는다. 머리를 누르면 접힌다(좁힘 자체를 푸는 [전체 보기]는 패널 최상단).
 * `key={label}` 로 렌더하므로 다른 그룹으로 옮기면 펼친 상태로 시작한다.
 */
const FLASH_MS = 1200;

function SnapshotGroup({
  label,
  sublabel,
  count,
  open,
  onToggle,
  focused = false,
  focusNonce = 0,
  children,
}: {
  label: string;
  /** 둘째 줄 — 분석 카드의 파라미터("snsr_id=B"). 없으면 한 줄. */
  sublabel?: string;
  count: number;
  open: boolean;
  onToggle: () => void;
  /** 이번 안내의 대상인가 — 지속 상태가 아니라 한 번의 신호다. */
  focused?: boolean;
  focusNonce?: number;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  // 오른쪽 줄을 누른 순간: 화면 안으로 끌어오고 잠깐 깜빡인다(펼침·접힘 정리는
  // 호스트가 이미 했다). 깜빡임은 렌더 상태가 아니라 클래스로 처리한다 —
  // 끝나면 흔적이 남지 않아야 하기 때문이다.
  useEffect(() => {
    if (!focused || focusNonce === 0) return;
    const el = ref.current;
    if (!el) return;
    el.scrollIntoView({ block: "nearest", behavior: "smooth" });
    el.classList.add("border-brand-primary", "ring-2", "ring-brand-primary/40");
    const timer = window.setTimeout(() => {
      el.classList.remove(
        "border-brand-primary",
        "ring-2",
        "ring-brand-primary/40",
      );
    }, FLASH_MS);
    return () => window.clearTimeout(timer);
  }, [focused, focusNonce]);

  return (
    // 여백은 틀이 아니라 **버튼과 내용**이 나눠 갖는다 — 제목 글자만 눌리면
    // 표적이 너무 작다(요청 단 제목과 같은 규칙).
    <div
      ref={ref}
      className="rounded-lg border border-brand-hairline bg-brand-surface-soft flex flex-col overflow-hidden transition-[box-shadow,border-color] duration-500"
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="w-full flex items-center gap-xs px-sm py-xs text-left hover:bg-brand-ink-translucent-04 focus:outline-none focus:ring-2 focus:ring-brand-primary/15 transition-colors"
      >
        <span className="min-w-0 flex-1 flex flex-col">
          <span className="truncate text-caption font-medium text-brand-ink">
            {label}
          </span>
          {sublabel && (
            <span className="truncate text-caption text-brand-muted-soft">
              {sublabel}
            </span>
          )}
        </span>
        <span className="shrink-0 text-caption text-brand-muted-soft tabular-nums">
          {count}
        </span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
          className={[
            "shrink-0 text-brand-muted-soft transition-transform",
            open ? "rotate-90" : "",
          ].join(" ")}
        >
          <polyline points="9 6 15 12 9 18" />
        </svg>
      </button>
      {open && (
        <div className="px-xs pb-xs flex flex-col gap-xs">{children}</div>
      )}
    </div>
  );
}

/**
 * 안쪽을 한 번에 접고 펴는 아이콘 버튼. 화살표가 **모이면 접기**, **벌어지면
 * 펴기** — 제목 줄은 좁아서 글자 대신 방향으로 말한다.
 */
/** 단 접힘 표시 — 펼쳐지면 위를, 접히면 아래를 가리킨다. */
function SectionChevron({ open }: { open: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={[
        "shrink-0 text-brand-muted transition-transform",
        open ? "rotate-180" : "",
      ].join(" ")}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

/** 안의 카드들을 한 번에 접고 펴는 아이콘 버튼. */
function CollapseCardsButton({
  collapsed,
  onClick,
  title,
}: {
  collapsed: boolean;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className="inline-flex items-center justify-center w-7 h-7 rounded-sm text-brand-muted-soft hover:text-brand-ink hover:bg-brand-ink-translucent-04 focus:outline-none focus:ring-2 focus:ring-brand-primary/15 transition-colors"
    >
      <FoldIcon collapsed={collapsed} />
    </button>
  );
}

function TrashIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}

function FoldIcon({ collapsed }: { collapsed: boolean }) {
  return (
    <svg
      className="shrink-0 text-brand-muted"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {collapsed ? (
        <>
          <polyline points="7 9 12 4 17 9" />
          <polyline points="7 15 12 20 17 15" />
        </>
      ) : (
        <>
          <polyline points="7 4 12 9 17 4" />
          <polyline points="7 20 12 15 17 20" />
        </>
      )}
    </svg>
  );
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/**
 * 목록에 설 이름. 붙여넣은 그림은 브라우저가 죄다 `image.png` 로 주기 때문에
 * 두 장만 올려도 어느 것이 어느 것인지 알 수 없다 — 그럴 때만 시각을 쓴다.
 */
function imageLabel(file: File): string {
  const name = file.name?.trim();
  if (name && name.toLowerCase() !== "image.png") return name;
  const at = new Date().toLocaleTimeString("ko-KR", { hour12: false });
  return `붙여넣은 그림 ${at}`;
}

/** 접을 수 있는 섹션 — 제목 줄 전체가 토글이다. */
function CollapsibleSection({
  title,
  open,
  onToggle,
  action,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  /** 제목 줄 오른쪽 아이콘 — **이 단 안의 카드들**을 한 번에 접는다(단은 그대로). */
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    // 여백은 섹션이 아니라 **버튼**이 갖는다 — 제목 글자만 눌리면 표적이 너무
    // 작다. 제목 줄 전체(좌우 여백 포함)가 눌리는 면이 된다.
    // 접히면 아래 여백도 함께 사라져야 한다 — 내용이 없는데 자리를 차지하면
    // "뭔가 있는데 안 보이는" 빈 칸으로 읽힌다.
    <section
      // 구분선을 두지 않는다 — hover 음영 바로 아래에 실선이 깔리면 음영이
      // 잘린 것처럼 보인다. 단은 제목과 여백만으로 갈린다.
      className={open ? "pb-md" : ""}
    >
      {/* 제목 줄의 두 동작은 층이 다르다:
          · 제목(넓은 면) = **이 단 자체**를 접는다
          · 오른쪽 아이콘 = 단은 두고 **안의 카드들**을 접는다
          음영은 줄 전체에 깔린다 — 둘 다 같은 줄의 동작이기 때문이다. */}
      <div
        className={[
          "flex items-center pl-lg pr-md pt-md hover:bg-brand-ink-translucent-04 transition-colors",
          open ? "pb-sm" : "pb-md",
        ].join(" ")}
      >
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          className="flex-1 min-w-0 flex items-center gap-xs text-left focus:outline-none focus:ring-2 focus:ring-brand-primary/15 rounded-sm"
        >
          <h3 className="flex-1 min-w-0 font-sans text-body-sm font-medium text-brand-ink truncate">
            {title}
          </h3>
          <SectionChevron open={open} />
        </button>
        {action && <span className="shrink-0 pl-xs">{action}</span>}
      </div>
      {open && <div className="px-lg">{children}</div>}
    </section>
  );
}


function PlusIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}
