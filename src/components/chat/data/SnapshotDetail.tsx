"use client";

import { useState } from "react";
import { tableFromSql } from "@/lib/request-store";
import type { DataSnapshot } from "@/lib/types";
import { formatCapturedAt } from "./SnapshotCard";

/**
 * 스냅샷 상세 — 확장 모드(#136)의 오른쪽 면.
 *
 * 카드에서 뺀 것들이 전부 여기로 온다: 전체 컬럼·전체 행의 표, 규모(N열 ·
 * M행), 출처 쿼리 전문. 카드는 "무엇인지"만 말하고, 실제 *읽기*는 이 화면이
 * 담당한다 — 새 창(blob HTML)으로 나가지 않고 채팅 옆에서 데이터를 확인하며
 * 질문을 이어가게.
 *
 * 행은 이미 브라우저 메모리에 다 있으므로 비용은 렌더뿐이다 — 한 번에
 * `PAGE_ROWS` 씩 그리고 [더 보기]로 잇는다(가상 스크롤은 이 규모에선 과잉).
 */
const PAGE_ROWS = 500;
/** 셀 하나가 표 폭을 다 먹지 않게 — 전문은 title 로. */
const CELL_MAX_W = "max-w-[360px]";

export function SnapshotDetail({ snapshot }: { snapshot: DataSnapshot }) {
  const [limit, setLimit] = useState(PAGE_ROWS);
  const [copied, setCopied] = useState(false);

  // 스냅샷이 바뀌면 렌더 한도·복사 상태를 처음으로 — effect 대신 렌더 중
  // 상태 조정 관례(AddDataModal 의 seed 적용과 같은 패턴).
  const [prevId, setPrevId] = useState(snapshot.id);
  if (snapshot.id !== prevId) {
    setPrevId(snapshot.id);
    setLimit(PAGE_ROWS);
    setCopied(false);
  }

  const rows = snapshot.rows.slice(0, limit);
  const hidden = snapshot.rows.length - rows.length;
  const sourceTable = tableFromSql(snapshot.sourceSql);

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

  return (
    <div className="flex-1 min-w-0 flex flex-col">
      <div className="shrink-0 px-lg pt-md pb-sm border-b border-brand-hairline-soft">
        <div className="flex items-baseline gap-xs min-w-0">
          <h3
            className="min-w-0 truncate font-sans text-body-md font-medium text-brand-ink"
            title={snapshot.label}
          >
            {snapshot.label}
          </h3>
          {sourceTable && (
            <span className="shrink-0 inline-flex items-center rounded-[4px] bg-brand-primary/10 px-[6px] py-[3px] font-mono text-[11px] leading-none font-medium text-brand-primary">
              {sourceTable}
            </span>
          )}
        </div>
        {/* 카드에서 걷어낸 카운트의 자리가 여기다 — 상세를 보러 온 사람에겐
            규모가 곧 정보다. */}
        <p className="mt-[2px] text-caption text-brand-muted">
          {snapshot.columns.length}열 · {snapshot.rows.length}행 ·{" "}
          {formatCapturedAt(snapshot.capturedAt)}
          {!snapshot.included && " · 요청에 미포함"}
        </p>

        {snapshot.sourceSql && (
          <div className="relative mt-xs">
            <pre className="text-[12px] font-mono text-brand-body bg-brand-ink-translucent-04 rounded-sm px-sm py-xs pr-xl whitespace-pre-wrap max-h-[9rem] overflow-y-auto">
              {snapshot.sourceSql}
            </pre>
            <button
              type="button"
              onClick={copySql}
              aria-label={copied ? "복사됨" : "SQL 복사"}
              title={copied ? "복사됨" : "SQL 복사"}
              className="absolute top-xxs right-xxs p-xxs rounded-sm text-brand-muted hover:text-brand-primary hover:bg-brand-primary/10 focus:outline-none focus:ring-2 focus:ring-brand-primary/15 transition-colors"
            >
              {copied ? <CheckIcon /> : <CopyIcon />}
            </button>
          </div>
        )}
      </div>

      {snapshot.rows.length === 0 ? (
        <p className="px-lg py-md text-caption text-brand-muted-soft">
          조회 결과가 0행입니다 — 데이터가 없다는 사실로 전달됩니다.
        </p>
      ) : (
        <div className="flex-1 min-h-0 overflow-auto">
          <table className="border-collapse min-w-full">
            <thead>
              <tr>
                {snapshot.columns.map((c, i) => (
                  // 실데이터엔 중복 컬럼명이 온다(조인 SELECT 등) — key 는 위치가 정체성.
                  <th
                    key={`${i}-${c}`}
                    className="sticky top-0 z-10 bg-brand-canvas text-left font-sans font-medium text-[11px] tracking-[0.4px] text-brand-muted-soft border-b border-brand-hairline px-sm py-xs whitespace-nowrap"
                  >
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr
                  key={i}
                  className="border-b border-brand-hairline-soft last:border-b-0"
                >
                  {row.map((cell, j) => (
                    <td
                      key={j}
                      className="font-mono text-[12px] text-brand-body px-sm py-[5px] whitespace-nowrap"
                    >
                      {/* NULL 과 빈 문자열은 다른 것이다 — 화면에서도 접지 않는다. */}
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
                </tr>
              ))}
            </tbody>
          </table>
          {hidden > 0 && (
            <div className="px-sm py-sm">
              <button
                type="button"
                onClick={() => setLimit((v) => v + PAGE_ROWS)}
                className="text-caption text-brand-primary hover:underline focus:outline-none focus:ring-2 focus:ring-brand-primary/15 rounded-sm"
              >
                더 보기 — 남은 {hidden}행 중 {Math.min(hidden, PAGE_ROWS)}행
              </button>
            </div>
          )}
        </div>
      )}
    </div>
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
