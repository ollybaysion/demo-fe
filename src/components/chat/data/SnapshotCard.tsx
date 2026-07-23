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
 * 규모는 펼친 미리보기("… 외 N행")가 말한다.
 *
 * 출처 쿼리는 알 때만 안다: 요청 카드를 채우면 요청 SQL 이 자동으로 붙고,
 * 자유 붙여넣기는 [쿼리]에서 직접 붙일 수 있다. 붙어 있으면 `FROM` 에서
 * 테이블 칩을 파생하고 펼친 자리에서 복사할 수 있다 — 없으면 아무것도
 * 지어내지 않는다.
 *
 * 표를 다 보여주지 않는다 — 좁은 패널에서 수천 행을 그리면 패널이 쓸모없어진다.
 * 카드 본문을 누르면(쉐브런이 그 신호다) **예시 몇 줄 × 앞 몇 컬럼**만 미리보기로
 * 펼친다(넓은 표를 가로 스크롤로 밀면 어색하다 — 행을 "… 외 N행"으로 접듯 컬럼도
 * "+N"으로 접는다). 전체가 필요하면 펼친 자리의 [전체 보기(새 창)] 또는
 * [CSV 다운로드]로 나간다.
 *
 * 이름 바꾸기·삭제는 hover 에만 보인다 — 카드마다 상시 아이콘 두 개는 목록
 * 전체를 소음으로 만든다(키보드 포커스에는 나타난다).
 */
const PREVIEW_ROWS = 3;
const PREVIEW_COLS = 4;
/** 카드 얼굴에 나열할 컬럼 칩 수 — 나머지는 "+N" 칩의 툴팁으로. */
const CHIP_COLS = 4;
/** 셀 하나가 미리보기 폭을 다 먹지 않게 — 전문은 title 로. */
const CELL_MAX_W = "max-w-[120px]";

type Props = {
  snapshot: DataSnapshot;
  onToggleIncluded: (id: string) => void;
  onRemove: (id: string) => void;
  /** 라벨 인라인 편집 — 등록은 이름 없이 끝나므로, 식별이 필요해진 시점에 여기서 짓는다. */
  onRename: (id: string, label: string) => void;
  /** 출처 쿼리 달기/고치기(빈 값 = 지움) — 테이블 칩이 여기서 파생된다. */
  onSetQuery: (id: string, sql: string | undefined) => void;
  /** 방금 등록됨 — 잠깐 강조하고 화면 안으로 스크롤한다(전역 Ctrl+V 는 소리가 없다). */
  flash?: boolean;
};

export function SnapshotCard({
  snapshot,
  onToggleIncluded,
  onRemove,
  onRename,
  onSetQuery,
  flash = false,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [queryOpen, setQueryOpen] = useState(false);
  const [queryDraft, setQueryDraft] = useState("");
  const [copied, setCopied] = useState(false);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const preview = snapshot.rows.slice(0, PREVIEW_ROWS);
  const hidden = snapshot.rows.length - preview.length;
  const previewCols = snapshot.columns.slice(0, PREVIEW_COLS);
  const hiddenCols = snapshot.columns.length - previewCols.length;

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

  function startQueryEdit() {
    setQueryDraft(snapshot.sourceSql ?? "");
    setQueryOpen(true);
  }

  /** 빈 값 저장 = 쿼리 지움 — 삭제 버튼을 따로 두지 않는다. */
  function commitQuery() {
    onSetQuery(snapshot.id, queryDraft);
    setQueryOpen(false);
  }

  async function copySql() {
    if (!snapshot.sourceSql) return;
    try {
      await navigator.clipboard.writeText(snapshot.sourceSql);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // 클립보드 권한이 없어도 SQL 은 화면에 그대로 있다 — 복사만 실패한다.
      setCopied(false);
    }
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

  return (
    <div
      ref={cardRef}
      className={[
        "group rounded-lg border px-sm py-xs flex flex-col gap-xxs transition-all",
        flash
          ? "border-brand-primary/50 ring-2 ring-brand-primary/25"
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
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            className="flex-1 min-w-0 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/15 rounded-xs"
          >
            <span className="flex items-center gap-xxs">
              <span
                className={[
                  "min-w-0 truncate text-body-sm",
                  snapshot.included ? "text-brand-ink" : "text-brand-muted",
                ].join(" ")}
              >
                {snapshot.label}
              </span>
              {/* 펼침 어포던스 — 이 카드가 열린다는 유일한 시각 신호. */}
              <svg
                className={[
                  "shrink-0 text-brand-muted-soft transition-transform",
                  expanded ? "rotate-180" : "",
                ].join(" ")}
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
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </span>
            <Chips snapshot={snapshot} />
          </button>
        )}

        {!editing && (
          <button
            type="button"
            onClick={startQueryEdit}
            aria-label={`${snapshot.label} 출처 쿼리 ${snapshot.sourceSql ? "편집" : "입력"}`}
            title={snapshot.sourceSql ? "쿼리 편집" : "쿼리 입력"}
            className="shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-full text-brand-muted opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:text-brand-primary hover:bg-brand-ink-translucent-04 focus:outline-none focus:ring-2 focus:ring-brand-primary/15 transition-opacity"
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
              <ellipse cx="12" cy="5" rx="9" ry="3" />
              <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
              <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
            </svg>
          </button>
        )}

        {!editing && (
          <button
            type="button"
            onClick={startEdit}
            aria-label={`${snapshot.label} 이름 바꾸기`}
            title="이름 바꾸기"
            className="shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-full text-brand-muted opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:text-brand-primary hover:bg-brand-ink-translucent-04 focus:outline-none focus:ring-2 focus:ring-brand-primary/15 transition-opacity"
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
          className="shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-full text-brand-muted opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:text-brand-error hover:bg-brand-ink-translucent-04 focus:outline-none focus:ring-2 focus:ring-brand-primary/15 transition-opacity"
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
      </div>

      {queryOpen && (
        <div className="border-t border-brand-hairline-soft pt-xs flex flex-col gap-xxs">
          <textarea
            autoFocus
            value={queryDraft}
            onChange={(e) => setQueryDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setQueryOpen(false);
            }}
            rows={3}
            aria-label={`${snapshot.label} 출처 쿼리`}
            placeholder="이 데이터를 만든 쿼리를 붙여넣으세요 — FROM 의 테이블이 칩으로 붙습니다."
            className="w-full min-w-0 bg-brand-canvas text-brand-ink font-mono text-[12px] rounded-md border border-brand-hairline px-xs py-xxs resize-y focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/15 transition-colors"
          />
          <div className="flex items-center justify-end gap-xs">
            <button
              type="button"
              onClick={() => setQueryOpen(false)}
              className="text-caption text-brand-muted hover:text-brand-ink focus:outline-none focus:ring-2 focus:ring-brand-primary/15 rounded-sm"
            >
              취소
            </button>
            <button
              type="button"
              onClick={commitQuery}
              className="text-caption text-brand-primary font-medium hover:underline focus:outline-none focus:ring-2 focus:ring-brand-primary/15 rounded-sm"
            >
              저장
            </button>
          </div>
        </div>
      )}

      {expanded && (
        <div className="overflow-x-auto border-t border-brand-hairline-soft pt-xs">
          {snapshot.sourceSql && (
            <div className="relative mb-xs">
              <pre className="text-[12px] font-mono text-brand-body bg-brand-ink-translucent-04 rounded-sm px-xs py-xxs pr-xl whitespace-pre-wrap">
                {snapshot.sourceSql}
              </pre>
              <button
                type="button"
                onClick={copySql}
                aria-label={copied ? "복사됨" : "쿼리 복사"}
                title={copied ? "복사됨" : "쿼리 복사"}
                className="absolute top-xxs right-xxs p-xxs rounded-sm text-brand-muted hover:text-brand-primary hover:bg-brand-primary/10 focus:outline-none focus:ring-2 focus:ring-brand-primary/15 transition-colors"
              >
                {copied ? <CheckIcon /> : <CopyIcon />}
              </button>
            </div>
          )}
          {/* 상하 괘선만 긋는다 — 세로선·배경 채움까지 더하면 좁은 패널에서
              표가 카드보다 무거워진다. */}
          <table className="w-full border-collapse">
            <thead>
              <tr>
                {previewCols.map((c) => (
                  <th
                    key={c}
                    className="text-left font-sans font-medium text-[11px] tracking-[0.4px] text-brand-muted-soft border-b border-brand-hairline px-xs pb-[4px] whitespace-nowrap"
                  >
                    <span className={`block truncate ${CELL_MAX_W}`} title={c}>
                      {c}
                    </span>
                  </th>
                ))}
                {hiddenCols > 0 && (
                  <th
                    className="text-left font-sans font-normal text-[11px] text-brand-muted-soft border-b border-brand-hairline px-xs pb-[4px] whitespace-nowrap"
                    title={snapshot.columns.slice(PREVIEW_COLS).join(", ")}
                  >
                    +{hiddenCols}
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {preview.map((row, i) => (
                <tr
                  key={i}
                  className="border-b border-brand-hairline-soft last:border-b-0"
                >
                  {row.slice(0, PREVIEW_COLS).map((cell, j) => (
                    <td
                      key={j}
                      className="font-mono text-[12px] text-brand-body px-xs py-[5px] whitespace-nowrap"
                    >
                      {/* NULL 과 빈 문자열은 다른 것이다 — 엔진이 구별해 담았으니
                          화면에서도 접지 않는다. */}
                      {cell === null ? (
                        <span className="text-brand-muted-soft italic">
                          NULL
                        </span>
                      ) : (
                        <span
                          className={`block truncate ${CELL_MAX_W}`}
                          title={cell}
                        >
                          {cell}
                        </span>
                      )}
                    </td>
                  ))}
                  {hiddenCols > 0 && (
                    <td className="font-mono text-[12px] text-brand-muted-soft px-xs py-[5px]">
                      …
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {hidden > 0 && (
            <p className="text-caption text-brand-muted-soft px-xxs pt-xxs">
              … 외 {hidden}행
            </p>
          )}
          <div className="flex items-center gap-md px-xxs pt-xs">
            <button
              type="button"
              onClick={openFullView}
              className="text-caption text-brand-primary hover:underline focus:outline-none focus:ring-2 focus:ring-brand-primary/15 rounded-sm"
            >
              전체 보기(새 창)
            </button>
            <button
              type="button"
              onClick={downloadCsv}
              className="text-caption text-brand-primary hover:underline focus:outline-none focus:ring-2 focus:ring-brand-primary/15 rounded-sm"
            >
              CSV 다운로드
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * 카드 얼굴의 칩들 — 이 데이터가 무엇인지 말하는 키워드만.
 *
 * 출처 테이블은 요청 SQL 에서 결정론적으로 아는 경우에만 붙는다(추측 금지).
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
          title={`출처 테이블 — 쿼리의 FROM 에서 인식됨`}
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
function formatCapturedAt(iso: string): string {
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
