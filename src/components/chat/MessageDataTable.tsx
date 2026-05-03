"use client";

import { useEffect, useRef, useState } from "react";
import type { MessageTable } from "@/lib/types";

/**
 * 어시스턴트 메시지의 좌측 gutter 에 paired 되는 데이터 표 (#34).
 *
 * - 칼럼 순서: `table.columns` 가 있으면 그 순서, 없으면 첫 row 의 키 순서
 * - 너비: content-sized + 부모 폭을 max — 칼럼 합계가 부모를 넘으면 가로 스크롤
 * - 높이: 부모(`ChatMessage`)에서 측정한 풍선 높이를 `maxHeight` 로 받아
 *   기본은 풍선 높이로 cap 하고 내부 세로 스크롤. 사용자가 우측 하단
 *   "전체 보기" 토글로 풀 펼침 가능
 * - read-only — 정렬 / 필터 / 편집 없음 (spec out-of-scope)
 *
 * 백엔드(/api/fdc/v1/chat) 페이로드의 `table` 필드를 그대로 받음.
 */
type Props = {
  table: MessageTable;
  /** 풍선 높이(px). 표를 풍선 높이로 cap 하기 위함. null/undefined 면 cap 없음. */
  maxHeight?: number | null;
  /** true 면 maxHeight 무시하고 풀 펼침. */
  expanded?: boolean;
  /** 토글 버튼 핸들러. 없으면 토글 버튼 자체를 노출하지 않음. */
  onToggleExpand?: () => void;
};

export function MessageDataTable({
  table,
  maxHeight,
  expanded,
  onToggleExpand,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  // collapsed 상태에서 콘텐츠가 cap 보다 길어 잘리고 있는지. 잘리지 않으면
  // "전체 보기" 토글이 의미 없어 숨김.
  const [overflows, setOverflows] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const check = () => {
      // 1px 정도의 오차는 무시 (서브픽셀 round 으로 깜빡임 방지).
      setOverflows(el.scrollHeight - el.clientHeight > 1);
    };
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [maxHeight, expanded, table]);

  const columns =
    table.columns ??
    (table.rows.length > 0 ? Object.keys(table.rows[0]) : []);

  if (table.rows.length === 0 || columns.length === 0) return null;

  const effectiveMaxHeight =
    !expanded && maxHeight != null ? maxHeight : undefined;
  const showToggle = !!onToggleExpand && (overflows || !!expanded);

  // 디자인: 각진 사각형 + 얇은 검정 테두리. 헤더는 약간 회색 음영.
  return (
    <div className="w-fit max-w-full border border-brand-ink bg-brand-canvas">
      <div
        ref={scrollRef}
        className="overflow-auto"
        style={
          effectiveMaxHeight != null
            ? { maxHeight: effectiveMaxHeight }
            : undefined
        }
      >
        <table className="text-body-sm font-mono border-collapse">
          <thead className="bg-brand-surface-soft border-b border-brand-ink">
            <tr>
              {columns.map((c) => (
                <th
                  key={c}
                  scope="col"
                  className="text-left text-caption text-brand-muted px-sm py-xxs whitespace-nowrap"
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, i) => (
              <tr
                key={i}
                className="border-b border-brand-ink last:border-b-0"
              >
                {columns.map((c) => (
                  <td
                    key={c}
                    className="px-sm py-xxs text-brand-ink whitespace-nowrap align-top"
                  >
                    {formatCell(row[c])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showToggle && (
        <button
          type="button"
          onClick={onToggleExpand}
          aria-expanded={!!expanded}
          className="block w-full border-t border-brand-ink py-xxs text-caption text-brand-muted hover:bg-brand-ink-translucent-04 hover:text-brand-ink focus:outline-none focus:ring-2 focus:ring-brand-primary/15 transition-colors"
        >
          {expanded ? "접기 ▲" : "전체 보기 ▼"}
        </button>
      )}
    </div>
  );
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  // 중첩 객체 자동 펼치기는 spec out-of-scope — 임시로 JSON 문자열로.
  return JSON.stringify(value);
}
