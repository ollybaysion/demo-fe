"use client";

import { useEffect, useRef, useState } from "react";
import { tableFromSql } from "@/lib/request-store";
import {
  buildCsv,
  buildFullViewHtml,
  csvFileName,
} from "@/lib/snapshot-export";
import type { DataSnapshot } from "@/lib/types";

/**
 * 스냅샷 한 장.
 *
 * 상태 축은 체크박스 하나다 — 체크된 스냅샷은 내용까지 요청에 실리고, 해제하면
 * 아예 실리지 않는다. (NotebookLM 소스 선택과 같은 관례. 동봉/고정 2축은 사용자가
 * 읽지 못해 접었다.)
 *
 * 카드 얼굴은 **이름 + 칩**이다. "3열 · 5행" 같은 카운트 대신 이 데이터가
 * 무엇인지 말해주는 키워드 — 출처 테이블과 컬럼명 — 를 칩으로 나열한다.
 *
 * 좁은 패널에서는 **미리보기를 그리지 않는다** — 3행×4컬럼 발췌는 훑기에도
 * 읽기에도 어중간했다. 데이터 열람은 상시 아이콘 [전체 보기(새 창)] 와
 * [CSV 다운로드]로 나간다(패널 확장 상세 뷰는 #136).
 *
 * 출처 SQL 은 알 때만 안다: 요청 카드를 채우면 요청 SQL 이 자동으로 붙고,
 * 자유 붙여넣기는 상시 버튼 [SQL]이 여는 **모달**에서 직접 붙인다. 붙어
 * 있으면 `FROM` 에서 테이블 칩을 파생하고 모달에서 복사할 수 있다 — 없으면
 * 아무것도 지어내지 않는다.
 *
 * 이름 바꾸기·삭제는 hover 에만 보인다 — 열람·SQL 과 달리 매일 쓰는 동작이
 * 아니라서다(키보드 포커스에는 나타난다).
 */
/** 카드 얼굴에 나열할 컬럼 칩 수 — 나머지는 "+N" 칩의 툴팁으로. */
const CHIP_COLS = 4;

type Props = {
  snapshot: DataSnapshot;
  onToggleIncluded: (id: string) => void;
  onRemove: (id: string) => void;
  /** 라벨 인라인 편집 — 등록은 이름 없이 끝나므로, 식별이 필요해진 시점에 여기서 짓는다. */
  onRename: (id: string, label: string) => void;
  /** 출처 SQL 달기/고치기(빈 값 = 지움) — 테이블 칩이 여기서 파생된다. */
  onSetQuery: (id: string, sql: string | undefined) => void;
  /** 방금 등록됨 — 잠깐 강조하고 화면 안으로 스크롤한다(전역 Ctrl+V 는 소리가 없다). */
  flash?: boolean;
  /** 확장 모드에서만 — 카드 클릭이 상세 뷰의 대상을 고른다. */
  onSelect?: () => void;
  /** 확장 모드에서 상세 뷰가 보여주고 있는 카드. */
  selected?: boolean;
};

export function SnapshotCard({
  snapshot,
  onToggleIncluded,
  onRemove,
  onRename,
  onSetQuery,
  flash = false,
  onSelect,
  selected = false,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [queryOpen, setQueryOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement | null>(null);

  // 등록 직후의 강조 — 목록 밖(스크롤 아래)에서 조용히 등록되면 "아무 일도
  // 안 일어났다"로 읽힌다. 새 카드가 제 발로 화면에 들어온다.
  useEffect(() => {
    if (flash) {
      cardRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [flash]);

  function startEdit() {
    setDraft(snapshot.label);
    setEditing(true);
  }

  function commitEdit() {
    const next = draft.trim();
    if (next.length > 0 && next !== snapshot.label) {
      onRename(snapshot.id, next);
    }
    setEditing(false);
  }

  /** CSV 파일 다운로드 — blob 을 만들어 한 번 클릭시키고 정리한다. */
  function downloadCsv() {
    const blob = new Blob([buildCsv(snapshot.columns, snapshot.rows)], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = csvFileName(snapshot.label);
    a.click();
    // 클릭이 소비된 뒤 해제 — 즉시 해제하면 일부 브라우저에서 다운로드가 끊긴다.
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }

  /** 전체 데이터를 자급자족 HTML 로 새 창에 띄운다 — 라우트·서버 불필요. */
  function openFullView() {
    const blob = new Blob([buildFullViewHtml(snapshot)], {
      type: "text/html;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener");
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  const hoverAction =
    "shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-full text-brand-muted opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:bg-brand-ink-translucent-04 focus:outline-none focus:ring-2 focus:ring-brand-primary/15 transition-opacity";
  const alwaysAction =
    "shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-full text-brand-muted hover:bg-brand-ink-translucent-04 focus:outline-none focus:ring-2 focus:ring-brand-primary/15 transition-colors";

  return (
    // 선택은 포인터 편의다 — 내부 버튼 클릭이 선택으로 번져도 "지금 만지는
    // 카드가 상세에 뜬다"라 자연스럽다. 키보드는 카드 내 버튼 포커스로 충분.
    <div
      ref={cardRef}
      onClick={onSelect}
      className={[
        "group rounded-lg border px-sm py-xs flex flex-col gap-xxs transition-all",
        onSelect ? "cursor-pointer" : "",
        flash
          ? "border-brand-primary/50 ring-2 ring-brand-primary/25"
          : selected
            ? "border-brand-primary/45 bg-brand-primary/5"
            : "border-brand-hairline",
      ].join(" ")}
    >
      <div className="flex items-start gap-xs">
        <span className="relative mt-[3px] shrink-0 inline-flex">
          <input
            type="checkbox"
            checked={snapshot.included}
            onChange={() => onToggleIncluded(snapshot.id)}
            aria-label={`${snapshot.label} 요청에 포함`}
            title={
              snapshot.included
                ? "요청에서 빼기"
                : "요청에 포함 — 내용까지 함께 나갑니다"
            }
            className="peer appearance-none w-4 h-4 rounded-[4px] border border-brand-hairline bg-transparent checked:bg-brand-primary checked:border-brand-primary cursor-pointer transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30"
          />
          <svg
            className="pointer-events-none absolute inset-0 m-auto opacity-0 peer-checked:opacity-100 text-brand-on-primary transition-opacity"
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </span>

        {editing ? (
          <div className="flex-1 min-w-0">
            <input
              autoFocus
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitEdit();
                if (e.key === "Escape") setEditing(false);
              }}
              onBlur={commitEdit}
              aria-label="스냅샷 이름 편집"
              className="w-full min-w-0 bg-brand-canvas text-brand-ink text-body-sm rounded-sm border border-brand-primary px-xs py-[2px] focus:outline-none focus:ring-2 focus:ring-brand-primary/15"
            />
            <Chips snapshot={snapshot} />
          </div>
        ) : (
          <div className="flex-1 min-w-0">
            <span
              className={[
                "block min-w-0 truncate text-body-sm",
                snapshot.included ? "text-brand-ink" : "text-brand-muted",
              ].join(" ")}
              title={snapshot.label}
            >
              {snapshot.label}
            </span>
            <Chips snapshot={snapshot} />
          </div>
        )}

        {/* 액션 클러스터 — 카드 우측 끝에 붙는다. hover 전용(이름·삭제)은 상시
            아이콘 **왼쪽**에 둔다: 안 보일 때도 자리는 차지하므로(레이아웃 점프
            방지), 오른쪽에 두면 상시 아이콘이 가장자리에서 떠 보인다. */}
        <span className="flex items-center gap-[2px] -mr-[4px] -mt-[2px] shrink-0">
          {!editing && (
            <button
              type="button"
              onClick={startEdit}
              aria-label={`${snapshot.label} 이름 바꾸기`}
              title="이름 바꾸기"
              className={`${hoverAction} hover:text-brand-primary`}
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
              </svg>
            </button>
          )}

          <button
            type="button"
            onClick={() => onRemove(snapshot.id)}
            aria-label={`${snapshot.label} 삭제`}
            title="삭제"
            className={`${hoverAction} hover:text-brand-error`}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          {/* 상시 아이콘 셋 — 열람(전체 보기·CSV)과 출처 SQL 은 이 카드의 본업이라
              hover 뒤에 숨기지 않는다. SQL 버튼은 아이콘 대신 글자다 — DB 실린더
              그림은 아무도 "쿼리 입력"으로 읽지 못했다. */}
          <button
            type="button"
            onClick={() => setQueryOpen(true)}
            aria-label={`${snapshot.label} SQL ${snapshot.sourceSql ? "편집" : "입력"}`}
            title={snapshot.sourceSql ? "SQL 편집" : "SQL 입력"}
            className={`${alwaysAction} w-auto px-[5px] hover:text-brand-primary ${snapshot.sourceSql ? "text-brand-primary" : ""}`}
          >
            <span className="font-mono text-[10px] leading-none font-semibold tracking-[0.4px]">
              SQL
            </span>
          </button>

          <button
            type="button"
            onClick={openFullView}
            aria-label={`${snapshot.label} 전체 보기(새 창)`}
            title="전체 보기(새 창)"
            className={`${alwaysAction} hover:text-brand-primary`}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </button>

          <button
            type="button"
            onClick={downloadCsv}
            aria-label={`${snapshot.label} CSV 다운로드`}
            title="CSV 다운로드"
            className={`${alwaysAction} hover:text-brand-primary`}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </button>
        </span>
      </div>

      <QueryModal
        open={queryOpen}
        onClose={() => setQueryOpen(false)}
        label={snapshot.label}
        initialSql={snapshot.sourceSql ?? ""}
        onSave={(sql) => {
          onSetQuery(snapshot.id, sql);
          setQueryOpen(false);
        }}
      />
    </div>
  );
}

/**
 * 출처 SQL 모달 — 카드의 [SQL] 버튼이 연다.
 *
 * 카드 안 슬라이드 대신 모달인 이유: 좁은 패널에서 SQL 여러 줄을 편집하기엔
 * 카드 폭이 모자라고, 카드가 늘었다 줄었다 하며 목록이 출렁인다.
 * 인식된 테이블을 입력 즉시 보여준다 — 저장 전에 칩에 뭐가 붙을지 알게.
 */
function QueryModal({
  open,
  onClose,
  label,
  initialSql,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  label: string;
  initialSql: string;
  onSave: (sql: string) => void;
}) {
  const [text, setText] = useState(initialSql);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // 열릴 때마다 저장분으로 되돌린다 — 지난번에 닫으며 버린 초안이 남지 않게.
  const [appliedInitial, setAppliedInitial] = useState(initialSql);
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen || initialSql !== appliedInitial) {
    setWasOpen(open);
    setAppliedInitial(initialSql);
    if (open) {
      setText(initialSql);
      setCopied(false);
    }
  }

  if (!open) return null;

  const detected = tableFromSql(text);

  async function copySql() {
    if (text.trim().length === 0) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // 클립보드 권한이 없어도 SQL 은 화면에 그대로 있다 — 복사만 실패한다.
      setCopied(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${label} SQL`}
      className="fixed inset-0 z-50 flex items-center justify-center p-md"
    >
      <div
        className="absolute inset-0 bg-brand-ink/40"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative w-full max-w-[32rem] bg-brand-canvas rounded-lg shadow-xl flex flex-col">
        <div className="flex items-center justify-between px-md py-sm border-b border-brand-hairline">
          <h2 className="min-w-0 truncate font-sans text-body-md text-brand-ink">
            SQL — {label}
          </h2>
          <div className="flex items-center gap-xxs">
            <button
              type="button"
              onClick={copySql}
              disabled={text.trim().length === 0}
              aria-label={copied ? "복사됨" : "SQL 복사"}
              title={copied ? "복사됨" : "SQL 복사"}
              className="inline-flex items-center justify-center w-8 h-8 rounded-sm text-brand-muted hover:bg-brand-ink-translucent-04 hover:text-brand-primary disabled:text-brand-muted-soft disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-brand-primary/15 transition-colors"
            >
              {copied ? <CheckIcon /> : <CopyIcon />}
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="닫기"
              className="inline-flex items-center justify-center w-8 h-8 rounded-sm text-brand-muted hover:bg-brand-ink-translucent-04 hover:text-brand-ink focus:outline-none focus:ring-2 focus:ring-brand-primary/15 transition-colors"
            >
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
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        <div className="px-md py-sm flex flex-col gap-sm">
          <label className="block">
            <span className="block text-caption text-brand-muted mb-xxs">
              이 데이터를 만든 쿼리
            </span>
            <textarea
              autoFocus
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={8}
              placeholder="이 데이터를 만든 쿼리를 붙여넣으세요."
              className="w-full min-w-0 bg-brand-canvas text-brand-ink font-mono text-caption rounded-md border border-brand-hairline px-sm py-xs resize-y focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/15 transition-colors"
            />
          </label>

          {/* 저장 전에 결과를 미리 말한다 — 테이블 인식은 FROM 파싱뿐이라
              안 되면 안 된다고 정직하게. */}
          <p className="text-caption text-brand-muted-soft">
            {text.trim().length === 0
              ? "빈 채로 저장하면 쿼리를 지웁니다."
              : detected
                ? `인식된 테이블: ${detected} — 카드에 칩으로 붙습니다.`
                : "테이블을 인식하지 못했습니다 — 쿼리는 저장되지만 칩은 붙지 않습니다."}
          </p>

          <div className="flex items-center justify-end gap-xs">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center h-8 px-md rounded-md text-brand-muted text-body-sm hover:text-brand-ink focus:outline-none focus:ring-2 focus:ring-brand-primary/15 transition-colors"
            >
              취소
            </button>
            <button
              type="button"
              onClick={() => onSave(text)}
              className="inline-flex items-center h-8 px-md rounded-md bg-brand-primary text-brand-on-primary text-body-sm font-medium hover:bg-brand-primary-active focus:outline-none focus:ring-2 focus:ring-brand-primary/40 transition-colors"
            >
              저장
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * 카드 얼굴의 칩들 — 이 데이터가 무엇인지 말하는 키워드만.
 *
 * 출처 테이블은 SQL 에서 결정론적으로 아는 경우에만 붙는다(추측 금지).
 * 컬럼은 앞 몇 개만 칩으로, 나머지는 "+N" 칩의 툴팁으로. 행이 없는 스냅샷은
 * 값이 안 실린다는 사실을 카드에서 바로 말한다 — "모델이 왜 내 데이터를
 * 못 보지?"의 원인을 회색 캡션 뒤에 숨기지 않는다.
 */
function Chips({ snapshot }: { snapshot: DataSnapshot }) {
  const chipCols = snapshot.columns.slice(0, CHIP_COLS);
  const restCols = snapshot.columns.slice(CHIP_COLS);
  const zeroRows = snapshot.warnings.includes("ZERO_ROWS");
  const sourceTable = tableFromSql(snapshot.sourceSql);
  return (
    <span
      className={[
        "mt-[5px] flex flex-wrap items-center gap-[4px]",
        snapshot.included ? "" : "opacity-70",
      ].join(" ")}
    >
      {sourceTable && (
        <span
          className="inline-flex items-center rounded-[4px] bg-brand-primary/10 px-[6px] py-[3px] font-mono text-[11px] leading-none font-medium text-brand-primary max-w-[160px]"
          title="출처 테이블 — 쿼리의 FROM 에서 인식됨"
        >
          <span className="truncate">{sourceTable}</span>
        </span>
      )}
      {chipCols.map((c) => (
        <span
          key={c}
          className="inline-flex items-center rounded-[4px] border border-brand-hairline-soft bg-brand-ink-translucent-04 px-[6px] py-[3px] font-mono text-[11px] leading-none text-brand-muted max-w-[140px]"
          title={c}
        >
          <span className="truncate">{c}</span>
        </span>
      ))}
      {restCols.length > 0 && (
        <span
          className="inline-flex items-center rounded-[4px] border border-brand-hairline-soft px-[6px] py-[3px] font-mono text-[11px] leading-none text-brand-muted-soft"
          title={restCols.join(", ")}
        >
          +{restCols.length}
        </span>
      )}
      {zeroRows && (
        <span
          className="inline-flex items-center rounded-[4px] bg-brand-warning/15 px-[6px] py-[3px] text-[11px] leading-none font-medium text-brand-warning"
          title="행이 없어 표의 존재만 전달됩니다 — 값은 실리지 않습니다"
        >
          값 없음
        </span>
      )}
      <span className="text-[11px] leading-none text-brand-muted-soft">
        {formatCapturedAt(snapshot.capturedAt)}
      </span>
    </span>
  );
}

// 복사 아이콘 한 쌍 — `RequestCard`/`ChatMessage` 와 같은 14px 인라인 SVG 관례.
function CopyIcon() {
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
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckIcon() {
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
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

/** 등록 시각을 짧게. 오늘이면 시:분만, 아니면 월/일. */
export function formatCapturedAt(iso: string): string {
  if (!iso) return "시각 미상";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "시각 미상";
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  if (sameDay) return `${hh}:${mi}`;
  return `${d.getMonth() + 1}/${d.getDate()} ${hh}:${mi}`;
}
