/**
 * 스냅샷 내보내기 — CSV 문자열과 전체 보기 HTML 문서의 순수 생성기.
 *
 * 패널은 미리보기 몇 줄만 보여준다("전부 보기"는 패널의 일이 아니다). 전체가
 * 필요한 사용자는 여기서 만든 산출물로 나간다 — CSV 는 파일로, 전체 표는
 * blob URL 새 창으로. DOM 트리거(다운로드 클릭·window.open)는 컴포넌트가
 * 맡고, 이 모듈은 문자열만 만든다 — 그래야 렌더러 없이 검증된다.
 */

/** CSV 셀 하나. 쉼표·따옴표·개행이 있으면 감싸고, 따옴표는 두 번 쓴다. */
function csvCell(value: string | null): string {
  // NULL 은 빈 칸으로 접는다 — CSV 에는 NULL 표기가 없다(재등록하면 빈
  // 문자열이 된다는 손실을 감수한 표준 관례).
  if (value === null) return "";
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/**
 * CSV 전문. 선두에 BOM — 사내 Excel 이 UTF-8 한글을 제대로 열게 하는 표식.
 */
export function buildCsv(
  columns: string[],
  rows: (string | null)[][],
): string {
  const lines = [
    columns.map(csvCell).join(","),
    ...rows.map((row) => row.map(csvCell).join(",")),
  ];
  return "\uFEFF" + lines.join("\r\n") + "\r\n";
}

/** 파일명으로 못 쓰는 문자를 접는다. */
export function csvFileName(label: string): string {
  const safe = label.replace(/[\\/:*?"<>|]/g, "_").trim() || "snapshot";
  return `${safe}.csv`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * 전체 데이터 보기 — 자급자족 HTML 한 장. blob URL 로 새 창에 띄운다.
 * NULL 은 빈 칸과 구별해 기울임으로 남긴다(엔진이 구별해 준 것을 접지 않는다).
 */
export function buildFullViewHtml(snapshot: {
  label: string;
  capturedAt: string;
  columns: string[];
  rows: (string | null)[][];
}): string {
  const title = escapeHtml(snapshot.label);
  const meta = `${snapshot.columns.length}열 · ${snapshot.rows.length}행${
    snapshot.capturedAt ? ` · ${escapeHtml(snapshot.capturedAt)}` : ""
  }`;
  const head = snapshot.columns
    .map((c) => `<th>${escapeHtml(c)}</th>`)
    .join("");
  const body = snapshot.rows
    .map(
      (row) =>
        `<tr>${row
          .map((cell) =>
            cell === null
              ? `<td class="null">NULL</td>`
              : `<td>${escapeHtml(cell)}</td>`,
          )
          .join("")}</tr>`,
    )
    .join("\n");
  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<title>${title}</title>
<style>
  body { margin: 0; padding: 24px; font: 13px/1.5 ui-monospace, monospace; color: #1f1e1b; background: #faf9f5; }
  h1 { font-size: 16px; margin: 0 0 4px; font-family: ui-sans-serif, system-ui, sans-serif; }
  p.meta { margin: 0 0 16px; color: #8a857c; }
  table { border-collapse: collapse; }
  th, td { border: 1px solid #e3ddd2; padding: 4px 10px; text-align: left; white-space: nowrap; }
  thead th { position: sticky; top: 0; background: #efe9de; }
  td.null { color: #b3ada2; font-style: italic; }
</style>
</head>
<body>
<h1>${title}</h1>
<p class="meta">${meta}</p>
<table>
<thead><tr>${head}</tr></thead>
<tbody>
${body}
</tbody>
</table>
</body>
</html>`;
}
