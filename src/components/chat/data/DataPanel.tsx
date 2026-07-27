"use client";

import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import type { PendingInput } from "@/lib/input-store";
import type { DerivedGroup } from "../context/derive-cards";
import type { DataSnapshot } from "@/lib/types";
import { AddDataModal } from "./AddDataModal";
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
 * 등록 경로는 셋, 전부 같은 `onAdd` 로 합류한다:
 *  1. 하단 [+ 데이터 추가] 모달 — 기본 경로.
 *  2. **Ctrl+V 즉시 등록** — 채팅 입력창 등 텍스트 입력이 아닌 곳에서
 *     붙여넣으면 바로 등록. SQL Developer 복사 → 앱 클릭 → Ctrl+V 로 끝.
 *  3. **파일 드롭** — CSV/TSV/텍스트 파일을 패널에 끌어놓으면 읽어 등록
 *     (UTF-8 기준). 실패하면 그 텍스트를 안고 모달이 열린다 — 붙여넣은
 *     것을 잃지 않고 원인을 보여 주기 위해.
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
  onToggleIncluded: (id: string) => void;
  onRemove: (id: string) => void;
  onRename: (id: string, label: string) => void;
  /** 출처 쿼리 달기/고치기(빈 값 = 지움) — 카드의 테이블 칩이 여기서 파생된다. */
  onSetQuery: (id: string, sql: string | undefined) => void;
  /** 마지막으로 삭제된 스냅샷 — 있으면 목록 위에 되돌리기 스트립이 뜬다. */
  lastRemoved: DataSnapshot | null;
  onRestore: () => void;
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
   * 좌측 그룹을 묶는 축. `equipment` = 설비별 통합(요청+데이터 한 그룹),
   * `type` = 요청/데이터 유형별 분리(요청은 상단, 데이터는 아래 그룹).
   */
  viewMode?: "equipment" | "type";
  onToggleView?: () => void;
  /** 데이터 스코프 — 참이면 전역 저장분 전부, 거짓이면 현재 세션 등록분만. */
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
};

export function DataPanel({
  snapshots,
  inputRequests,
  onSubmitInput,
  onAdd,
  onFulfill,
  onToggleIncluded,
  onRemove,
  onRename,
  onSetQuery,
  lastRemoved,
  onRestore,
  expanded,
  onToggleExpanded,
  detailVisible,
  groups,
  viewMode = "equipment",
  onToggleView,
  scopeAll = false,
  onToggleScope,
  focusGroupKey,
  focusNonce = 0,
  focusRequestKey,
  requestFocusNonce = 0,
  openGroupKeys = null,
  onToggleGroup,
  onSetAllGroups,
}: Props) {
  const [addOpen, setAddOpen] = useState(false);
  const [seed, setSeed] = useState<{
    text: string;
    error: { code: string; message: string };
  } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  // 요청 묶음 전체 접기 — 요청이 여러 건이면 보관 목록이 한참 아래로 밀린다.
  const [requestsOpen, setRequestsOpen] = useState(true);
  // 보관 목록도 같은 급의 단이다 — 요청 단만 접히면 대등하지 않다.
  const [dataOpen, setDataOpen] = useState(true);
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
  // 유형별 모드에서 상단으로 끌어올릴 데이터 요청(그룹에서 평탄화).
  const flatRequests = (groups ?? []).flatMap((g) => g.requests);
  // 유형별 모드에선 요청만 있는 그룹(데이터 없음)은 상단에서 다루므로 감춘다.
  const shownGroups =
    viewMode === "type"
      ? (groups ?? []).filter((g) => g.snapshots.length > 0)
      : (groups ?? []);

  /**
   * 확장 모드의 상세 대상. 명시 선택이 사라졌으면(삭제 등) 첫 카드로
   * 물러난다 — 빈 오른쪽 면을 사용자가 채워야 할 이유가 없다.
   */
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const detailTarget = expanded
    ? (snapshots.find((s) => s.id === selectedId) ?? snapshots[0] ?? null)
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

  // Ctrl+V 즉시 등록 — 텍스트 입력 요소에 하는 붙여넣기는 건드리지 않는다
  // (채팅 입력·모달 textarea 는 각자의 붙여넣기가 있다).
  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target?.closest("input, textarea, [contenteditable='true']")) return;
      const text = e.clipboardData?.getData("text/plain") ?? "";
      if (text.trim().length === 0) return;
      e.preventDefault();
      registerText(text);
    }
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [registerText]);

  async function handleDroppedFiles(files: FileList) {
    for (const file of Array.from(files)) {
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
        </h2>
        <div className="shrink-0 flex items-center gap-xxs">
        {/* 스코프 토글 — 현재 세션 등록분만(기본) vs 전역 저장분 전부. */}
        {onToggleScope && (
          <button
            type="button"
            onClick={onToggleScope}
            title={scopeAll ? "현재 세션 데이터만 보기" : "전체 데이터 보기"}
            className="shrink-0 h-7 px-xs rounded-sm text-caption text-brand-muted hover:text-brand-primary hover:bg-brand-ink-translucent-04 focus:outline-none focus:ring-2 focus:ring-brand-primary/15 transition-colors"
          >
            {scopeAll ? "전체" : "현재 세션"}
          </button>
        )}
        {/* 뷰 토글 — 설비별 통합 vs 요청/데이터 유형별. */}
        {onToggleView && (
          <button
            type="button"
            onClick={onToggleView}
            title={viewMode === "equipment" ? "유형별로 보기" : "설비별로 보기"}
            className="shrink-0 h-7 px-xs rounded-sm text-caption text-brand-muted hover:text-brand-primary hover:bg-brand-ink-translucent-04 focus:outline-none focus:ring-2 focus:ring-brand-primary/15 transition-colors"
          >
            {viewMode === "equipment" ? "설비별" : "유형별"}
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
            {/* 상단 요청 섹션. 설비별 모드에선 스칼라 입력 요청만(데이터 요청은
                각 설비 그룹 안으로). 유형별 모드에선 데이터 요청도 여기로 모은다. */}
            {(inputRequests.length > 0 ||
              (viewMode === "type" && flatRequests.length > 0)) && (
              <CollapsibleSection
                title={`요청받은 데이터 (${
                  inputRequests.length +
                  (viewMode === "type" ? flatRequests.length : 0)
                })`}
                open={requestsOpen}
                onToggle={() => setRequestsOpen((v) => !v)}
                filter={<FilterRow label="요청 필터" />}
              >
                <div className="flex flex-col gap-xs">
                  {inputRequests.map((p) => (
                    <InputCard
                      key={`${p.request.skill} ${p.request.key}`}
                      request={p.request}
                      onSubmit={onSubmitInput}
                    />
                  ))}
                  {viewMode === "type" &&
                    flatRequests.map((p) => (
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
                              ? base.filter((k) => k !== p.request.queryKey)
                              : [...base, p.request.queryKey];
                          })
                        }
                        focused={p.request.queryKey === focusRequestKey}
                        focusNonce={requestFocusNonce}
                        onFulfill={handleFulfill}
                      />
                    ))}
                </div>
              </CollapsibleSection>
            )}

            {/*
              설비별 모드에선 이 섹션에 **아직 조달 전인 요청 카드도 함께** 산다
              (설비 하나를 한 자리에서 보려고 그렇게 묶는다). 그래서 제목을
              "등록된 데이터"라고 하면 요청됨 카드가 등록된 것처럼 읽힌다 —
              내용에 맞춰 이름과 수를 나눈다. 유형별 모드에선 요청이 위 섹션으로
              올라가므로 여기 남는 것은 정말 등록분뿐이다.
            */}
            <CollapsibleSection
              title={
                viewMode === "equipment"
                  ? `설비별 데이터 (등록 ${dataCount}${
                      allRequestKeys.length > 0
                        ? ` · 요청 ${allRequestKeys.length}`
                        : ""
                    })`
                  : `등록된 데이터 (${dataCount})`
              }
              open={dataOpen}
              onToggle={() => setDataOpen((v) => !v)}
              filter={<FilterRow label="데이터 필터" />}
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
              {/* 실수 삭제 구제 — 스냅샷은 SQL 재실행 없이 다시 만들기 번거로워,
                  삭제 직후 한 번은 그 자리에서 되돌릴 수 있어야 한다. */}
              {lastRemoved && (
                <div className="mb-xs flex items-center justify-between gap-xs rounded-md border border-brand-hairline bg-brand-surface-card px-sm py-xs">
                  <span className="min-w-0 truncate text-caption text-brand-muted">
                    “{lastRemoved.label}” 삭제됨
                  </span>
                  <button
                    type="button"
                    onClick={onRestore}
                    className="shrink-0 text-caption text-brand-primary hover:underline focus:outline-none focus:ring-2 focus:ring-brand-primary/15 rounded-sm"
                  >
                    되돌리기
                  </button>
                </div>
              )}

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
                        count={
                          viewMode === "type"
                            ? g.snapshots.length
                            : g.snapshots.length + g.requests.length
                        }
                        open={
                          openGroupKeys === null || openGroupKeys.includes(g.key)
                        }
                        onToggle={() => onToggleGroup?.(g.key)}
                        focused={g.key === focusGroupKey}
                        focusNonce={focusNonce}
                      >
                        {/* 설비별 통합 모드에서만 대기 요청 카드를 그룹 안에 얹는다
                            ('아직 오는 것'이 위, 가진 데이터가 아래). 유형별 모드에선
                            요청은 상단 섹션에 있으니 여기선 데이터만 보인다. */}
                        {viewMode === "equipment" &&
                          g.requests.map((p) => (
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
                                expanded ? () => setSelectedId(s.id) : undefined
                              }
                              selected={expanded && s.id === detailTarget?.id}
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
                        expanded ? () => setSelectedId(s.id) : undefined
                      }
                      selected={expanded && s.id === detailTarget?.id}
                    />
                  ))}
                </div>
              )}
            </CollapsibleSection>
          </div>

          {/* 하단 넓은 추가 버튼 — 목록이 얼마나 길든 같은 자리에 있다. */}
          <div className="shrink-0 px-lg py-md border-t border-brand-hairline">
            <button
              type="button"
              onClick={() => {
                setSeed(null);
                setAddOpen(true);
              }}
              className="w-full inline-flex items-center justify-center gap-xs h-10 rounded-md border border-brand-hairline text-brand-ink text-body-sm hover:border-brand-primary hover:text-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/15 transition-colors"
            >
              <PlusIcon />
              데이터 추가
            </button>
            <p className="mt-xs text-center text-caption text-brand-muted-soft">
              표를 복사해 Ctrl+V 하거나 파일을 끌어놓아도 등록됩니다.
            </p>
          </div>
        </div>

        {/* 상세 면 — 확장 모드의 오른쪽. 카드에서 걷어낸 "읽기"가 여기 산다. */}
        {showDetail &&
          (detailTarget ? (
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
  count,
  open,
  onToggle,
  focused = false,
  focusNonce = 0,
  children,
}: {
  label: string;
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
        <span className="min-w-0 flex-1 truncate text-caption font-medium text-brand-ink">
          {label}
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
 * 필터 줄 자리표시자 — 아직 기능이 없다. 점선으로 "여기 들어올 것"임을 알린다.
 * 단(섹션)마다 따로 두는 게 규칙이다: 요청과 데이터는 거르는 기준이 다르다.
 */
function FilterRow({
  label,
  action,
}: {
  label: string;
  /** 오른쪽 끝 동작 — 이 단에만 걸린다(예: 전체 축소). */
  action?: ReactNode;
}) {
  return (
    <div className="mb-xs flex items-center gap-xs rounded-md border border-dashed border-brand-hairline px-sm py-[6px]">
      <span className="flex-1 min-w-0 text-caption text-brand-muted-soft truncate">
        {label}
      </span>
      {action}
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

/** 접을 수 있는 섹션 — 제목 줄 전체가 토글이다. */
function CollapsibleSection({
  title,
  open,
  onToggle,
  filter,
  action,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  /** 이 단에만 걸리는 필터 줄 — 펼쳐져 있을 때 목록 맨 위에 놓인다. */
  filter?: ReactNode;
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
      {open && (
        <div className="px-lg">
          {filter}
          {children}
        </div>
      )}
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
