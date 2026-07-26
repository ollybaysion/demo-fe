import { CONTEXT_LABELS } from "@/config/contextColumns";
import { SCENARIOS } from "@/demo/scenarios";
import { IS_MOCK, forwardOrMock } from "@/lib/backend";
import { makeRequestLogger, newRequestId } from "@/lib/logger";
import type {
  ChatDataSnapshot,
  ContextRow,
  DataRequest,
  Message,
} from "@/lib/types";

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
  /** 사용자가 데이터 패널에서 동봉으로 켠 스냅샷들. */
  dataSnapshots?: ChatDataSnapshot[];
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
  // BACKEND_URL 설정 시 채팅도 백엔드로 SSE 를 그대로 forward (스트림 통과).
  // 다른 /api/fdc/v1/* route 와 동일하게 seam 을 통과시켜, 프론트에서 질문을
  // 던지면 백엔드의 실제 응답이 그대로 스트리밍된다. 미설정 시 아래 mock.
  if (!IS_MOCK) {
    return forwardOrMock(request, "/api/fdc/v1/chat", () => {
      // BACKEND_URL 이 있으면 forwardOrMock 은 이 mock 을 호출하지 않는다.
      throw new Error("unreachable: BACKEND_URL is set");
    });
  }

  // 요청 단위 logger + requestId. 응답 헤더에도 첨부해 클라이언트
  // 가 같은 ID 로 서버 로그를 추적할 수 있게.
  const requestId = newRequestId();
  const log = makeRequestLogger(requestId, "POST /api/fdc/v1/chat");
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
  let responseDataRequests: DataRequest[] | undefined;
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
    // 데모 모드에는 데이터 요청을 끼우지 않는다 — 시나리오는 정해진 대사를
    // 순서대로 재생하는 것이라, 중간에 사용자 조달을 요구하면 흐름이 끊긴다.
    const missing = missingDataRequests(lastUser.content, body.dataSnapshots);
    if (missing.length > 0) {
      responseDataRequests = missing;
      responseText = buildDataRequestResponse(missing);
    } else {
      const supplied = suppliedLabels(body.dataSnapshots);
      responseText =
        supplied.length > 0
          ? `제공해주신 ${supplied.join(", ")} 을(를) 근거로 답변합니다.\n\n` +
            buildMockResponse(lastUser.content, body.context, body.timeRange)
          : buildMockResponse(lastUser.content, body.context, body.timeRange);
    }
    responseRecommend = recommendNext(lastUser.content);
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
            ...(responseDataRequests && responseDataRequests.length > 0
              ? { dataRequests: responseDataRequests }
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

/**
 * mock 이 조달을 요구할 수 있는 데이터 목록.
 *
 * 실제 백엔드에서는 모델이 "이 질문에 답하려면 무엇이 없는지"를 판단하겠지만,
 * mock 은 그럴 수 없으므로 키워드로 흉내 낸다. 요청 카드 왕복을 화면에서 실제로
 * 걸어볼 수 있게 하는 것이 목적이다.
 */
const REQUESTABLE: Array<DataRequest & { triggers: string[] }> = [
  {
    queryKey: "sensor_list",
    label: "챔버별 센서 목록",
    triggers: ["센서", "sensor"],
    columns: ["CHAMBER", "SENSOR_ID", "SENSOR_NAME"],
    sql: "SELECT chamber, sensor_id, sensor_name\n  FROM fdc_sensor_master\n WHERE equipment_id = :equipment_id\n ORDER BY chamber, sensor_id",
  },
  {
    queryKey: "recipe_steps",
    label: "레시피 STEP 구성",
    triggers: ["레시피", "recipe", "step"],
    columns: ["RECIPE_ID", "STEP_NO", "STEP_NAME", "DURATION_SEC"],
    sql: "SELECT recipe_id, step_no, step_name, duration_sec\n  FROM fdc_recipe_step\n WHERE recipe_id = :recipe_id\n ORDER BY step_no",
  },
  // 설비 계열도 조달 대상이다 — 전용 조회 API 를 걷어낸 뒤로 설비 정보는
  // "요청 → 붙여넣기"로만 들어온다.
  {
    queryKey: "equipment_detail",
    label: "설비 기본 정보",
    triggers: ["설비 정보", "설비 상세", "상세 정보"],
    columns: ["EQP_ID", "EQP_NAME", "MODEL_CD", "VENDOR", "USE_YN"],
    sql: "SELECT eqp_id, eqp_name, model_cd, vendor, use_yn\n  FROM fdc_equipment\n WHERE eqp_id = :equipment_id",
  },
  {
    queryKey: "equipment_peers",
    label: "동종 설비 목록",
    triggers: ["동종", "피어", "peer"],
    columns: ["EQP_ID", "EQP_NAME", "MODEL_CD"],
    sql: "SELECT eqp_id, eqp_name, model_cd\n  FROM fdc_equipment\n WHERE model_cd = (SELECT model_cd FROM fdc_equipment WHERE eqp_id = :equipment_id)\n   AND eqp_id <> :equipment_id\n ORDER BY eqp_id",
  },
  {
    queryKey: "setup_events",
    label: "설비 셋업·정비 이력",
    triggers: ["셋업", "정비 이력"],
    columns: ["EVT_DT", "EVT_TYPE_CD", "EVT_LABEL"],
    sql: "SELECT evt_dt, evt_type_cd, evt_label\n  FROM fdc_setup_event\n WHERE eqp_id = :equipment_id\n ORDER BY evt_dt DESC",
  },
];

/** 질문이 건드리는 데이터 중, 아직 동봉되지 않은 것들. */
function missingDataRequests(
  question: string,
  supplied: ChatRequestBody["dataSnapshots"],
): DataRequest[] {
  const q = question.toLowerCase();
  const have = new Set((supplied ?? []).map((s) => s.queryKey));
  return REQUESTABLE.filter(
    (r) =>
      !have.has(r.queryKey) &&
      r.triggers.some((t) => q.includes(t.toLowerCase())),
  ).map((r) => ({
    queryKey: r.queryKey,
    label: r.label,
    columns: r.columns,
    sql: r.sql,
  }));
}

function suppliedLabels(supplied: ChatRequestBody["dataSnapshots"]): string[] {
  return (supplied ?? []).map((s) => s.label);
}

/**
 * 다음 걸음 추천 — 백엔드 `MockLlm.followupSuggestions` 와 같은 규칙.
 * 데이터 요청 왕복(sensor_list ↔ recipe_steps)이 추천 클릭만으로 이어지게
 * 반대쪽 REQUESTABLE 을 먼저 둔다.
 */
function recommendNext(question: string): string[] {
  if (question.includes("센서 목록")) {
    return [
      "레시피 STEP 구성 알려줘",
      "ETCH-01 상세 정보 보여줘",
      "ETCH-01 동종 설비 알려줘",
    ];
  }
  if (question.includes("레시피")) {
    return [
      "챔버별 센서 목록 보여줘",
      "ETCH-01 상세 정보 보여줘",
      "ETCH-01 셋업 이력 알려줘",
    ];
  }
  return [
    "챔버별 센서 목록 보여줘",
    "레시피 STEP 구성 알려줘",
    "ETCH-01 상세 정보 보여줘",
  ];
}

function buildDataRequestResponse(missing: DataRequest[]): string {
  const names = missing.map((r) => `**${r.label}**`).join(", ");
  return (
    `이 질문에 답하려면 ${names} 이(가) 필요한데, 지금은 DB 에 직접 조회할 수 없습니다.\n\n` +
    "데이터 패널 카드의 SQL 을 실행하고 결과를 붙여넣어 등록해 주세요. " +
    '등록을 마치고 채팅에 "등록 완료"라고 알려주시면 그 데이터로 이어서 분석하겠습니다. ' +
    "없는 데이터를 추정해서 답하지 않겠습니다."
  );
}

