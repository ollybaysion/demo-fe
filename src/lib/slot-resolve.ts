/**
 * 슬롯 로컬 해석 — dataList 의 결정론 코어.
 *
 * BE `QueryKey`/`SqlRender`/`BindResolver`(fdc-agent-be-spring)의 FE 패리티
 * 포트다. 분석 카드의 각 데이터 슬롯이 판정 왕복 없이 자기 상태를 스스로
 * 파생한다: 바인드가 다 차면 **요청**(SQL 확정), 앞 슬롯 결과가 아직이면
 * **미정**(숨김), 본문이 붙었으면 **도착**. BE 는 같은 규칙으로 채팅 경로를
 * 계속 판정하므로, 두 구현이 갈라지면 안 된다 — queryKey·SQL 골든 테스트가
 * 실 BE 응답을 기준으로 잡는 이유다.
 *
 * 갈림길(앞 슬롯 결과의 후보 값이 여러 개)은 없는 상황을 가정한다(BE #50) —
 * 나오면 그 슬롯은 미정으로 남는다(지어내지 않는다).
 */

import type { SkillBind } from "./skills";

// ── queryKey (BE QueryKey.of 패리티) ──────────────────────────────────────

/** 구분자 충돌만 막는다 — 값의 다른 문자는 그대로 둔다(사람이 읽는 키다). */
function sanitize(value: string): string {
  return value.trim().replace(/#/g, "_").replace(/&/g, "_").replace(/=/g, "_");
}

/**
 * `skill#step__name=value&…` — step 은 0-기반, 이름표는 **필수 인자 전량**
 * (이름 정렬, 값 없는 이름은 건너뜀). 한 절차의 모든 단계가 같은 이름표를 단다.
 */
export function queryKeyOf(
  skill: string,
  step: number,
  args: Record<string, string>,
  argNames: string[],
): string {
  const parts: string[] = [];
  for (const name of argNames) {
    const value = args[name];
    if (value !== undefined && value.trim() !== "") {
      parts.push(`${name}=${sanitize(value)}`);
    }
  }
  const label = parts.join("&");
  return label ? `${skill}#${step}__${label}` : `${skill}#${step}`;
}

// ── SQL 렌더 (BE SqlRender 패리티) ────────────────────────────────────────

const NUMERIC = /^-?\d+(\.\d+)?$/;
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const DATE_MINUTE = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}$/;
const DATE_SECOND = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}$/;

function toDate(value: string, mask: string): string {
  return `TO_DATE(${quote(value.replace("T", " "))}, '${mask}')`;
}

function quote(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

/**
 * 값 하나를 SQL 리터럴로 — 숫자꼴은 맨값, ISO 날짜꼴은 `TO_DATE`, 나머지는
 * 작은따옴표 + `''` 이스케이프. 날짜 추정 근거는 BE 주석 참조(ORA-01861 회피).
 */
export function sqlLiteral(value: string): string {
  const v = value.trim();
  if (NUMERIC.test(v)) return v;
  if (DATE_SECOND.test(v)) return toDate(v, "YYYY-MM-DD HH24:MI:SS");
  if (DATE_MINUTE.test(v)) return toDate(v, "YYYY-MM-DD HH24:MI");
  if (DATE_ONLY.test(v)) return toDate(v, "YYYY-MM-DD");
  return quote(v);
}

function isIdentStart(c: string): boolean {
  return /[A-Za-z_]/.test(c);
}

function isIdentPart(c: string): boolean {
  return /[A-Za-z0-9_]/.test(c);
}

/**
 * `:var` 자리에 값을 박는다 — 작은따옴표 리터럴 안은 건드리지 않는다.
 * 값이 없는 바인드가 남으면 그 이름들을 돌려준다(호출자가 미정으로 처리).
 */
export function renderSql(
  sql: string,
  binds: Record<string, string>,
): { ok: true; sql: string } | { ok: false; missing: string[] } {
  let out = "";
  const missing = new Set<string>();
  let inQuote = false;
  for (let i = 0; i < sql.length; i++) {
    const c = sql[i];
    if (c === "'") {
      inQuote = !inQuote;
      out += c;
      continue;
    }
    if (inQuote || c !== ":" || i + 1 >= sql.length || !isIdentStart(sql[i + 1])) {
      out += c;
      continue;
    }
    let end = i + 1;
    while (end < sql.length && isIdentPart(sql[end])) end++;
    const name = sql.slice(i + 1, end);
    const value = binds[name];
    if (value === undefined) {
      missing.add(name);
      out += sql.slice(i, end);
    } else {
      out += sqlLiteral(value);
    }
    i = end - 1;
  }
  if (missing.size > 0) return { ok: false, missing: [...missing] };
  return { ok: true, sql: out };
}

// ── 슬롯 상태 파생 (BE BindResolver 패리티) ───────────────────────────────

/** 앞 슬롯 결과 조회 — 도착 안 했으면 null, 0행이면 빈 표. */
export type PriorRows = {
  columns: string[];
  rows: (string | null)[][];
} | null;

export type SlotResolution =
  /** 바인드가 안 풀렸다 — 카드를 그리지 않는다. 사유는 진단용. */
  | { kind: "pending"; reason: "missing-arg" | "upstream" | "empty-upstream" | "no-column" | "ambiguous" }
  /** 쿼리 확정 — 요청 카드로 그린다. */
  | { kind: "ready"; sql: string };

/**
 * 슬롯 하나의 바인드를 해석한다 — 선언 순서로 보고 첫 문제에서 멈춘다(BE 와
 * 같은 규율: 첫 사유를 풀기 전엔 나머지의 유효를 알 수 없다).
 *
 * @param priorRowsOf 앞 슬롯(0-기반 step)의 도착 결과. 미도착이면 null.
 */
export function resolveSlot(
  sql: string,
  binds: Record<string, SkillBind>,
  args: Record<string, string>,
  priorRowsOf: (step: number) => PriorRows,
): SlotResolution {
  const values: Record<string, string> = {};
  for (const [name, src] of Object.entries(binds)) {
    if (src.from === "arg") {
      const v = args[src.arg];
      if (v === undefined || v.trim() === "") {
        return { kind: "pending", reason: "missing-arg" };
      }
      values[name] = v;
      continue;
    }
    const prior = priorRowsOf(src.step);
    if (prior === null) return { kind: "pending", reason: "upstream" };
    if (prior.rows.length === 0) {
      return { kind: "pending", reason: "empty-upstream" };
    }
    const col = prior.columns.findIndex(
      (c) => c.trim().toLowerCase() === src.column.toLowerCase(),
    );
    if (col === -1) return { kind: "pending", reason: "no-column" };
    const distinct = new Set<string>();
    for (const row of prior.rows) {
      const cell = row[col];
      if (cell !== null && cell !== undefined && cell.trim() !== "") {
        distinct.add(cell.trim());
      }
    }
    if (distinct.size === 0) return { kind: "pending", reason: "no-column" };
    // 갈림길 없음 가정(BE #50) — 후보가 여러 개면 고르지 않고 미정으로 남긴다.
    if (distinct.size > 1) return { kind: "pending", reason: "ambiguous" };
    values[name] = [...distinct][0];
  }
  const rendered = renderSql(sql, values);
  if (!rendered.ok) {
    // spec 에 배선이 없는 바인드가 SQL 에 남았다 — 로드 검증이 걸렀어야 할 spec.
    return { kind: "pending", reason: "missing-arg" };
  }
  return { kind: "ready", sql: rendered.sql };
}
