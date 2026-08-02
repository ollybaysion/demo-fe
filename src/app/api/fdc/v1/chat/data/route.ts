import { forwardOrMock } from "@/lib/backend";
import { logger } from "@/lib/logger";
import type { ChatDataSnapshot, DataRequest } from "@/lib/types";
import type { RunDecl } from "@/lib/chat-data";
import type { Skill } from "@/lib/skills";
import { GENERATED_SKILLS } from "../../skills/mock-catalog";

/**
 * `POST /api/fdc/v1/chat/data` — panel-judge 인렛 (BE 계약 = fdc-agent-be-spring
 * #38). `BACKEND_URL` 설정 시 실 BE 로 forward, 미설정 시 여기의 mock 판정.
 *
 * mock 판정은 BE `PanelJudge` 의 축소판이다: 선언된 run 의 스텝 중 **사용자가
 * 채울 수 있고 아직 도착하지 않은 것**을 카드로 세우고, 0행 등록 이벤트가
 * 절차를 끝내면 canned 서술을 스트리밍한다. 목적은 BE 없는 데모에서 판정
 * 루프(등록 → 카드 갱신 → 종결 안내)가 눈에 보이게 하는 것이지 판정의 재현이
 * 아니다 — 바인드 체이닝·pick 은 실 BE 만 한다.
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

  // 도착 집합 — queryKey → 행 수(0 = 0행 확인). BE 와 같은 세 상태 규칙이다.
  const arrived = new Map<string, number>();
  for (const s of body.snapshots ?? []) {
    if (!s?.queryKey) continue;
    arrived.set(s.queryKey, s.rows ? s.rows.length : s.rowCount);
  }

  const openRequests: DataRequest[] = [];
  const terminalRuns: string[] = [];
  let narratedRun: string | undefined;

  for (const run of body.runs ?? []) {
    const skill = findSkill(run.skill);
    if (!skill) continue;
    const argsPart = queryArgsPart(skill, run.args ?? {});
    const label = argsPart
      ? `${skill.name} (${argsPart.replaceAll("&", ", ")})`
      : skill.name;

    let emptyAt = false;
    skill.steps.forEach((step, i) => {
      const queryKey = stepKey(skill.name, i, argsPart);
      const rowCount = arrived.get(queryKey);
      if (rowCount === 0) emptyAt = true;
      if (rowCount !== undefined || emptyAt) return;
      // 사용자가 채울 수 있는 스텝만 — 앞 스텝 결과 바인드는 실 BE 의 몫이다.
      if (step.priorStepBinds.length > 0) return;
      if (Object.values(step.argBinds).some((arg) => !run.args?.[arg]?.trim())) {
        return;
      }
      openRequests.push({
        queryKey,
        label: `${step.title}${argsPart ? ` (${argsPart.replaceAll("&", ", ")})` : ""}`,
        sql: renderSql(step.sql, step.argBinds, run.args ?? {}),
      });
    });

    if (emptyAt) {
      terminalRuns.push(label);
      // 이번 이벤트가 그 0행 등록이면 — 절차가 지금 끝난 것이니 서술한다.
      const eventKey = body.event?.queryKey;
      if (eventKey && arrived.get(eventKey) === 0 && eventKey.startsWith(`${skill.name}#`)) {
        narratedRun = label;
      }
    }
  }

  const narration = narratedRun
    ? `요청하신 조회 절차가 완료됐습니다.\n- ${narratedRun}: 조회 결과 0행 — 데이터가 없음이 확인됐습니다.\n\n(mock 판정 — 실 백엔드 연결 시 도착 데이터로 서술합니다)`
    : "";

  const done = {
    messageId: `msg_${Date.now().toString(36)}`,
    ...(body.eventId ? { eventId: body.eventId } : {}),
    ...(body.revision !== undefined ? { revision: body.revision } : {}),
    poolRev: "mock",
    openRequests,
    runsProgress: [],
    ...(terminalRuns.length > 0 ? { terminalRuns } : {}),
    ...(narratedRun ? { narratedRun } : {}),
  };

  log.info(
    { cards: openRequests.length, narrated: !!narratedRun },
    "chat/data mock judge",
  );

  const body2 = [...narration]
    .map((ch) => sseEvent("token", { content: ch }))
    .join("");
  return new Response(body2 + sseEvent("done", done), {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
    },
  });
}

/** BE `QueryPool.byId` 의 표기 흡수 축소판 — 하이픈/언더스코어·대소문자. */
function findSkill(name: string | undefined): Skill | undefined {
  if (!name) return undefined;
  const wanted = name.trim().replaceAll("-", "_").toLowerCase();
  return GENERATED_SKILLS.find(
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

function stepKey(skillName: string, step: number, argsPart: string): string {
  return argsPart
    ? `${skillName}#${step}__${argsPart}`
    : `${skillName}#${step}`;
}

function renderSql(
  sql: string,
  argBinds: Record<string, string>,
  args: Record<string, string>,
): string {
  let out = sql;
  for (const [bind, argName] of Object.entries(argBinds)) {
    const raw = args[argName]?.trim();
    if (!raw) continue;
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
