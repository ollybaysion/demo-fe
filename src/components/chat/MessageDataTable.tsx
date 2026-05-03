"use client";

import type { MessageTable } from "@/lib/types";

/**
 * 어시스턴트 메시지의 좌측 gutter 에 paired 되는 데이터 표 (#34).
 *
 * - 칼럼 순서: `table.columns` 가 있으면 그 순서, 없으면 첫 row 의 키 순서
 * - read-only — 정렬 / 필터 / 편집 없음 (spec out-of-scope)
 * - 칼럼이 많으면 내부 가로 스크롤
 *
 * 백엔드(/api/fdc/v1/chat) 페이로드의 `table` 필드를 그대로 받음.
 */
export function MessageDataTable({ table }: { table: MessageTable }) {
  const columns =
    table.columns ??
    (table.rows.length > 0 ? Object.keys(table.rows[0]) : []);

  if (table.rows.length === 0 || columns.length === 0) return null;

  // 디자인: 각진 사각형 + 얇은 검정 테두리. 헤더는 약간 회색 음영.
  // 표가 컨테이너 폭을 넘어가는 경우의 처리는 별도 이슈(추후) 참고.
  return (
    <div className="border border-brand-ink bg-brand-canvas overflow-hidden">
      <div className="overflow-x-auto">
        <table className="text-body-sm font-mono w-full border-collapse">
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
