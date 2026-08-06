import { forwardOrMock } from "@/lib/backend";
import { logger } from "@/lib/logger";
import type { ChatDataSnapshot, DataRequest, RequestState } from "@/lib/types";
import type { RunDecl } from "@/lib/chat-data";
import type { Skill, SkillQuery } from "@/lib/skills";
import { GENERATED_SKILLS } from "../../skills/mock-catalog";
import { MOCK_SKILLS } from "../../skills/route";

/**
 * `POST /api/fdc/v1/chat/data` — panel-judge 인렛 (BE 계약 = fdc-agent-be-spring
 * #38·#60). `BACKEND_URL` 설정 시 실 BE 로 forward, 미설정 시 여기의 mock 판정.
 *
 * mock 은 BE `PanelJudge` 의 축소판이다: 선언된 run 의 조달 **전량**을 상태와 함께
 * 원장으로 내고(`dataRequests`), 절차가 끝나면 canned 서술을 스트리밍한다.
 *
 * **바인드 체이닝이 여기 있는 이유**: spec v3 부터 카드의 진실원이 서버다. 화면은
 * 스킬을 읽어 SQL 을 완성하지 않으므로, 그 일을 아무도 안 하면 BE 없는 데모가 두
 * 번째 조회에서 멈춘다. 서버 흉내를 내는 자리에 두는 것이 맞고, 규칙이 화면으로
 * 되돌아가면 안 된다.
 *
 * 재현하지 않는 것: 채움 폭포 2·3차(다른 표에서 찾기), 갈림길, `when` 게이트의
 * 정밀 판정. 그건 실 BE 만 한다 — **실 데이터는 언제나 `BACKEND_URL` 을 붙여서 본다.**
 */

const log = logger.child({ route: "chat/data" });

export const runtime = "nodejs";

type JudgeBody = {
  eventId?: string;
  revision?: number;
  event?: { type?: string; queryKey?: string };
  snapshots?: ChatDataSnapshot[];
  runs?: RunDecl[];
};

/** 도착한 표 하나 — 판정이 값을 읽는 창구. */
type Arrival = { columns: string[]; rows: (string | null)[][]; empty: boolean };

export async function POST(request: Request): Promise<Response> {
  return forwardOrMock(request, "/api/fdc/v1/chat/data", () => mockJudge(request));
}

async function mockJudge(request: Request): Promise<Response> {
  let body: JudgeBody = {};
  try {
    body = (await request.json()) as JudgeBody;
  } catch {
    return Response.json({ error: "body_required" }, { status: 400 });
  }

  const arrived = new Map<string, Arrival>();
  for (const s of body.snapshots ?? []) {
    if (!s?.queryKey) continue;
    const rows = s.rows ?? [];
    const empty = s.rows ? rows.length === 0 : s.rowCount === 0;
    if (!s.rows && s.rowCount !== 0) continue; // 카탈로그만 — 도착이 아니다.
    arrived.set(s.queryKey, { columns: s.columns ?? [], rows, empty });
  }

  const ledger: DataRequest[] = [];
  const terminalRuns: string[] = [];
  let narratedRun: string | undefined;

  for (const run of body.runs ?? []) {
    const skill = findSkill(run.skill);
    if (!skill) continue;
    const args = run.args ?? {};
    const argsPart = queryArgsPart(skill, args);
    const label = argsPart
      ? `${skill.name} (${argsPart.replaceAll("&", ", ")})`
      : skill.name;

    const rows = ledgerOf(skill, run.skill, args, argsPart, arrived);
    ledger.push(...rows);

    // 종결 = 더 조달할 것이 없을 때. 열려 있는(ready·blocked) 줄이 남으면 진행 중이다.
    const open = rows.some((r) => r.state === "ready" || r.state === "blocked");
    if (!open) {
      terminalRuns.push(label);
      // 이번 이벤트가 그 절차의 조회를 등록한 것이면 지금 끝난 것이니 서술한다.
      const eventKey = body.event?.queryKey;
      if (eventKey && arrived.has(eventKey) && eventKey.startsWith(`${skill.name}#`)) {
        narratedRun = label;
      }
    }
  }

  const narration = narratedRun
    ? `요청하신 조회 절차가 완료됐습니다.\n- ${narratedRun}\n\n(mock 판정 — 실 백엔드 연결 시 도착 데이터로 서술합니다)`
    : "";

  const done = {
    messageId: `msg_${Date.now().toString(36)}`,
    ...(body.eventId ? { eventId: body.eventId } : {}),
    ...(body.revision !== undefined ? { revision: body.revision } : {}),
    poolRev: "mock",
    dataRequests: ledger,
    runsProgress: [],
    ...(terminalRuns.length > 0 ? { terminalRuns } : {}),
    ...(narratedRun ? { narratedRun } : {}),
  };

  log.info(
    { rows: ledger.length, narrated: !!narratedRun },
    "chat/data mock judge",
  );

  const stream = [...narration]
    .map((ch) => sseEvent("token", { content: ch }))
    .join("");
  return new Response(stream + sseEvent("done", done), {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
    },
  });
}

/** 이 절차의 조달 전량을 상태와 함께 — BE 원장의 축소판. */
function ledgerOf(
  skill: Skill,
  declaredSkill: string,
  args: Record<string, string>,
  argsPart: string,
  arrived: Map<string, Arrival>,
): DataRequest[] {
  const keyOf = (queryId: string) =>
    argsPart ? `${skill.name}#${queryId}__${argsPart}` : `${skill.name}#${queryId}`;
  const run = { skill: declaredSkill, args };

  return skill.queries.map((query) => {
    const queryKey = keyOf(query.id);
    const needs = skill.needs
      .filter((n) => n.filledBy.some((f) => f.query === query.id))
      .map((n) => n.id);
    const base = { queryKey, label: query.label, run, needs };

    if (arrived.has(queryKey)) {
      return { ...base, state: "arrived" as RequestState };
    }
    const resolved = resolveBinds(query, args, keyOf, arrived);
    if (resolved.kind !== "ready") {
      return {
        ...base,
        state: resolved.kind as RequestState,
        blocked: resolved.reason,
      };
    }
    return {
      ...base,
      state: "ready" as RequestState,
      sql: renderSql(query.sql, resolved.binds),
    };
  });
}

type Resolved =
  | { kind: "ready"; binds: Record<string, string> }
  | { kind: "blocked" | "unreachable"; reason: string };

/**
 * 바인드 해석 — 인자에서, 또는 **도착한 다른 조회의 표에서**. BE `BindResolver` 의
 * 축소판이다. 갈림길(값 여럿)은 고르지 않고 잠근다: 지어내느니 멈추는 편이 낫다.
 */
function resolveBinds(
  query: SkillQuery,
  args: Record<string, string>,
  keyOf: (queryId: string) => string,
  arrived: Map<string, Arrival>,
): Resolved {
  const binds: Record<string, string> = {};
  const wiring = query.binds ?? {};
  for (const [bind, src] of Object.entries(wiring)) {
    if (src.from === "arg") {
      const value = args[src.arg]?.trim();
      if (!value) {
        return { kind: "blocked", reason: `인자 ${src.arg} 값이 필요합니다.` };
      }
      binds[bind] = value;
      continue;
    }
    const upstream = arrived.get(keyOf(src.query));
    if (!upstream) {
      return { kind: "blocked", reason: `${src.query} 결과가 먼저 필요합니다.` };
    }
    if (upstream.empty) {
      return {
        kind: "unreachable",
        reason: `${src.query} 결과가 0행이라 이어갈 수 없습니다.`,
      };
    }
    const values = columnValues(upstream, src.column);
    if (values.length === 0) {
      return {
        kind: "unreachable",
        reason: `${src.query} 결과에 ${src.column} 값이 없습니다.`,
      };
    }
    if (values.length > 1) {
      return {
        kind: "blocked",
        reason: `${src.query} 결과의 ${src.column} 이 여러 값입니다: ${values.join(", ")}`,
      };
    }
    binds[bind] = values[0];
  }
  return { kind: "ready", binds };
}

/** 그 컬럼에 실제로 있는 값들(중복·공백 제거). 컬럼 이름은 대소문자를 가리지 않는다. */
function columnValues(table: Arrival, column: string): string[] {
  const at = table.columns.findIndex(
    (c) => c?.trim().toLowerCase() === column.trim().toLowerCase(),
  );
  if (at < 0) return [];
  const seen = new Set<string>();
  for (const row of table.rows) {
    const cell = row[at];
    if (cell !== null && cell !== undefined && cell.trim() !== "") {
      seen.add(cell.trim());
    }
  }
  return [...seen];
}

/** BE `QueryPool.byId` 의 표기 흡수 축소판 — 하이픈/언더스코어·대소문자. */
function findSkill(name: string | undefined): Skill | undefined {
  if (!name) return undefined;
  const wanted = name.trim().replaceAll("-", "_").toLowerCase();
  return [...MOCK_SKILLS, ...GENERATED_SKILLS].find(
    (s) =>
      s.name.replaceAll("-", "_").toLowerCase() === wanted ||
      s.skill.replaceAll("-", "_").toLowerCase() === wanted,
  );
}

/** BE `QueryKey` 와 같은 이름표 — 필수 인자 정렬, 구분자는 `_` 로 접는다. */
function queryArgsPart(skill: Skill, args: Record<string, string>): string {
  return skill.inputs
    .filter((i) => i.required)
    .map((i) => i.key)
    .sort()
    .filter((key) => args[key]?.trim())
    .map((key) => `${key}=${args[key].trim().replace(/[#&=]/g, "_")}`)
    .join("&");
}

function renderSql(sql: string, binds: Record<string, string>): string {
  let out = sql;
  for (const [bind, raw] of Object.entries(binds)) {
    const literal = /^-?\d+(\.\d+)?$/.test(raw)
      ? raw
      : `'${raw.replaceAll("'", "''")}'`;
    out = out.replaceAll(`:${bind}`, literal);
  }
  return out;
}

function sseEvent(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}
