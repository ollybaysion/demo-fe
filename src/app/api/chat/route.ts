import { CONTEXT_LABELS } from "@/config/contextColumns";
import { SCENARIOS } from "@/demo/scenarios";
import { makeRequestLogger, newRequestId } from "@/lib/logger";
import type { ContextRow, Message } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TOKEN_INTERVAL_MS = 30;

/**
 * Request body 한도 (보안).
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

function rejectTooLargeWithId(
  error: string,
  limit: number,
  actual: number,
  requestId: string,
): Response {
  return Response.json(
    { error, limit, actual },
    { status: 400, headers: { "X-Request-Id": requestId } },
  );
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
  /** Optional 설비 정보 table included by the client. */
  context?: ContextRow[];
  /** Optional 발생 시간 범위 (datetime-local strings). */
  timeRange?: ChatTimeRange;
  /** Optional demo-mode metadata — bypasses echo with scripted text. */
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

/**
 * 400 응답에도 X-Request-Id 가 따라가도록 헬퍼.
 */
function badRequest(
  body: Record<string, unknown>,
  requestId: string,
): Response {
  return Response.json(body, {
    status: 400,
    headers: { "X-Request-Id": requestId },
  });
}

export async function POST(request: Request): Promise<Response> {
  // 요청 단위 logger + requestId. 응답 헤더에도 첨부해 클라이언트
  // 가 같은 ID 로 서버 로그를 추적할 수 있게.
  const requestId = newRequestId();
  const log = makeRequestLogger(requestId, "POST /api/chat");
  const startedAt = Date.now();

  let body: ChatRequestBody;
  try {
    body = (await request.json()) as ChatRequestBody;
  } catch {
    log.warn("invalid JSON body");
    return badRequest({ error: "invalid JSON body" }, requestId);
  }

  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    log.warn("messages required");
    return badRequest({ error: "messages is required" }, requestId);
  }

  // size/length 한도 검증.
  if (body.messages.length > MAX_MESSAGES) {
    log.warn(
      { limit: MAX_MESSAGES, actual: body.messages.length },
      "messages_too_many",
    );
    return rejectTooLargeWithId(
      "messages_too_many",
      MAX_MESSAGES,
      body.messages.length,
      requestId,
    );
  }
  for (const m of body.messages) {
    if (typeof m?.content === "string" && m.content.length > MAX_MESSAGE_CONTENT_CHARS) {
      log.warn(
        { limit: MAX_MESSAGE_CONTENT_CHARS, actual: m.content.length },
        "message_content_too_long",
      );
      return rejectTooLargeWithId(
        "message_content_too_long",
        MAX_MESSAGE_CONTENT_CHARS,
        m.content.length,
        requestId,
      );
    }
  }
  if (Array.isArray(body.context) && body.context.length > MAX_CONTEXT_ROWS) {
    log.warn(
      { limit: MAX_CONTEXT_ROWS, actual: body.context.length },
      "context_too_large",
    );
    return rejectTooLargeWithId(
      "context_too_large",
      MAX_CONTEXT_ROWS,
      body.context.length,
      requestId,
    );
  }

  const lastUser = [...body.messages]
    .reverse()
    .find((m) => m.role === "user");
  if (!lastUser) {
    log.warn("no user message found");
    return badRequest({ error: "no user message found" }, requestId);
  }

  log.info(
    {
      messageCount: body.messages.length,
      contextRows: body.context?.length ?? 0,
      demo: body.demo
        ? { scenarioId: body.demo.scenarioId, turnIndex: body.demo.turnIndex }
        : undefined,
    },
    "chat request accepted",
  );

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
        // 표 / 차트 (다중) / 추천 후속 질문 은 `done` 이벤트 페이로드에
        // 번들로 동봉. 백엔드도 같은 형태로 보낼 예정이라 클라이언트가
        // 단일 done 핸들러만 신경 쓰면 됨.
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
        log.info(
          {
            durationMs: Date.now() - startedAt,
            messageId,
            chars: characters.length,
          },
          "chat request done",
        );
        controller.close();
      } catch (err) {
        // production 에서는 stack / 내부 경로 / DB 메시지 등이 SSE
        // payload 로 누출되지 않도록 generic 메시지만 전송. 상세는 server
        // log 로만 남김.
        log.error(
          {
            err: err instanceof Error
              ? { type: err.name, message: err.message, stack: err.stack }
              : { raw: String(err) },
            durationMs: Date.now() - startedAt,
          },
          "stream error",
        );
        const message =
          process.env.NODE_ENV !== "production"
            ? err instanceof Error
              ? err.message
              : "stream error"
            : "stream error";
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
      "X-Request-Id": requestId,
    },
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

