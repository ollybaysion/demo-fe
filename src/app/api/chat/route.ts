import { CONTEXT_LABELS } from "@/config/contextColumns";
import { SCENARIOS } from "@/demo/scenarios";
import type { ContextRow, Message } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TOKEN_INTERVAL_MS = 30;

/**
 * Request body 한도 (#83 보안).
 *
 * 제한 없는 size 의 payload 가 들어오면 백엔드 / mock 모두 자원 낭비
 * 또는 DoS 위험. 일반 데모 / 운영 사용 패턴에서는 충분히 큰 값으로
 * 잡아 정상 사용에 영향 없음.
 *
 * 위반 시 400 + 구조화된 에러: { error, limit, actual }.
 */
const MAX_MESSAGES = 100;
const MAX_MESSAGE_CONTENT_CHARS = 10_000;
const MAX_CONTEXT_ROWS = 50;

function rejectTooLarge(
  error: string,
  limit: number,
  actual: number,
): Response {
  return Response.json({ error, limit, actual }, { status: 400 });
}

type ChatTimeRange = { start?: string; end?: string };

type ChatDemoMeta = {
  scenarioId: string;
  /**
   * 0-based index into Scenario.turns. The route returns
   * turns[turnIndex].assistant. Out-of-range or unknown scenario falls
   * back to the regular echo behavior.
   */
  turnIndex: number;
};

type ChatRequestBody = {
  messages: Message[];
  /** Optional 설비 정보 table (#16) included by the client. */
  context?: ContextRow[];
  /** Optional 발생 시간 범위 (datetime-local strings). */
  timeRange?: ChatTimeRange;
  /** Optional demo-mode metadata (#19) — bypasses echo with scripted text. */
  demo?: ChatDemoMeta;
};

function encodeSseEvent(event: string, data: unknown): Uint8Array {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  return new TextEncoder().encode(payload);
}

function formatContextRow(row: ContextRow): string {
  const head = row.equipment.trim() || "(미입력)";

  const chamberParts: string[] = [];
  for (const chamber of row.chambers) {
    const cName = chamber.name.trim();
    const sensors = chamber.sensors
      .map((s) => s.name.trim())
      .filter((s) => s.length > 0);

    if (!cName && sensors.length === 0) continue;

    const cLabel = cName || "(미입력)";
    const sensorPart =
      sensors.length > 0
        ? ` ${CONTEXT_LABELS.sensor.label} ${sensors.join(", ")}`
        : "";
    chamberParts.push(`${cLabel}${sensorPart}`);
  }

  if (chamberParts.length === 0) return head;
  return `${head} (${CONTEXT_LABELS.chamber.label} ${chamberParts.join(" · ")})`;
}

function formatContext(context: ContextRow[]): string {
  return context.map(formatContextRow).join("; ");
}

function buildMockResponse(
  lastUserContent: string,
  context?: ContextRow[],
  timeRange?: ChatTimeRange,
): string {
  const parts: string[] = [];
  if (context && context.length > 0) {
    parts.push(`설비: ${formatContext(context)}`);
  }
  if (timeRange && (timeRange.start || timeRange.end)) {
    const start = timeRange.start || "(미지정)";
    const end = timeRange.end || "(미지정)";
    parts.push(`발생 시간 ${start} ~ ${end}`);
  }
  const ctxNote = parts.length > 0 ? ` (${parts.join(", ")})` : "";
  return `'${lastUserContent}' 라고 물으셨네요${ctxNote}. 아직 백엔드가 연결되지 않았습니다.`;
}

export async function POST(request: Request): Promise<Response> {
  let body: ChatRequestBody;
  try {
    body = (await request.json()) as ChatRequestBody;
  } catch {
    return Response.json(
      { error: "invalid JSON body" },
      { status: 400 },
    );
  }

  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return Response.json(
      { error: "messages is required" },
      { status: 400 },
    );
  }

  // #83 — size/length 한도 검증.
  if (body.messages.length > MAX_MESSAGES) {
    return rejectTooLarge(
      "messages_too_many",
      MAX_MESSAGES,
      body.messages.length,
    );
  }
  for (const m of body.messages) {
    if (typeof m?.content === "string" && m.content.length > MAX_MESSAGE_CONTENT_CHARS) {
      return rejectTooLarge(
        "message_content_too_long",
        MAX_MESSAGE_CONTENT_CHARS,
        m.content.length,
      );
    }
  }
  if (Array.isArray(body.context) && body.context.length > MAX_CONTEXT_ROWS) {
    return rejectTooLarge(
      "context_too_large",
      MAX_CONTEXT_ROWS,
      body.context.length,
    );
  }

  const lastUser = [...body.messages]
    .reverse()
    .find((m) => m.role === "user");
  if (!lastUser) {
    return Response.json(
      { error: "no user message found" },
      { status: 400 },
    );
  }

  // Demo mode: scripted assistant text bypasses the echo formatter.
  let responseText: string;
  let responseTables: unknown[] | undefined;
  let responseCharts: unknown[] | undefined;
  let responseEventTimelines: unknown[] | undefined;
  let responseRecommend: string[] | undefined;
  if (body.demo) {
    const scenario = SCENARIOS.find((s) => s.id === body.demo!.scenarioId);
    const turn = scenario?.turns[body.demo.turnIndex];
    if (turn) {
      responseText = turn.assistant;
      responseTables = turn.tables ? [...turn.tables] : undefined;
      responseCharts = turn.charts ? [...turn.charts] : undefined;
      responseEventTimelines = turn.eventTimelines
        ? [...turn.eventTimelines]
        : undefined;
      responseRecommend = turn.recommendQuestion;
    } else {
      responseText =
        "데모 시나리오의 마지막 응답을 이미 재생했습니다. 헤더의 '다시 시작' 버튼으로 새 시나리오를 선택하세요.";
    }
  } else {
    responseText = buildMockResponse(
      lastUser.content,
      body.context,
      body.timeRange,
    );
  }
  const characters = [...responseText];
  const messageId = `msg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for (const ch of characters) {
          controller.enqueue(encodeSseEvent("token", { content: ch }));
          await sleep(TOKEN_INTERVAL_MS);
        }
        // 표(#34) / 차트(#37, 다중 #45) / 추천 후속 질문(#40) 은 docs/api.md
        // 스펙대로 `done` 이벤트 페이로드에 번들로 동봉. 백엔드도 같은
        // 형태로 보낼 예정이라 클라이언트가 단일 done 핸들러만 신경 쓰면 됨.
        controller.enqueue(
          encodeSseEvent("done", {
            messageId,
            finishReason: "stop",
            ...(responseTables && responseTables.length > 0
              ? { tables: responseTables }
              : {}),
            ...(responseCharts && responseCharts.length > 0
              ? { charts: responseCharts }
              : {}),
            ...(responseEventTimelines && responseEventTimelines.length > 0
              ? { eventTimelines: responseEventTimelines }
              : {}),
            ...(responseRecommend && responseRecommend.length > 0
              ? { recommendQuestion: responseRecommend }
              : {}),
          }),
        );
        controller.close();
      } catch (err) {
        const message = err instanceof Error ? err.message : "stream error";
        controller.enqueue(encodeSseEvent("error", { message }));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

