import { SCENARIOS } from "@/demo/scenarios";
import { IS_MOCK, forwardOrMock } from "@/lib/backend";
import { makeRequestLogger, newRequestId } from "@/lib/logger";
import type { ChatScope } from "@/lib/query-scope";
import type {
  ChatDataSnapshot,
  ChatInputs,
  ChoiceRequest,
  DataRequest,
  InputRequest,
  Message,
  MessageImage,
  MessageLink,
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
  /** Optional demo-mode metadata — bypasses echo with scripted text. */
  demo?: ChatDemoMeta;
  /** 사용자가 데이터 패널에서 동봉으로 켠 스냅샷들. */
  dataSnapshots?: ChatDataSnapshot[];
  /** 사용자가 입력 카드로 채운 스칼라 값 — 스킬 네임스페이스({skill:{key:value}}). */
  inputs?: ChatInputs;
  /** 사용자가 질의 대상 트레이에 담은 것 — 이 질문이 무엇을 놓고 하는 질문인지. */
  scope?: ChatScope;
};

function encodeSseEvent(event: string, data: unknown): Uint8Array {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  return new TextEncoder().encode(payload);
}

/**
 * 담긴 질의 대상을 한 줄로 — 설비는 이름만, 분석은 그 아래 한 단으로.
 * 실 백엔드의 `[질의 대상]` 섹션과 같은 것을 목에서도 되뇌기 위한 것이다.
 */
function formatScope(scope: ChatScope): string {
  const parts = [
    ...(scope.equipments ?? []),
    ...(scope.analyses ?? []).map((a) =>
      a.focus ? `${a.equipment} › ${a.focus}` : a.equipment,
    ),
  ].filter((s) => s && s.trim().length > 0);
  return parts.join(", ");
}

function buildMockResponse(
  lastUserContent: string,
  scope?: ChatScope,
): string {
  // 이 질문의 범위를 말하는 것은 **담긴 대상 하나**다. 폼이 따로 나르던 설비·시간은
  // 더 이상 없다 — 화면의 [질의 대상] 뱃지와 답이 다른 설비를 말할 여지도 함께 사라진다.
  const scopeText = scope ? formatScope(scope) : "";
  const ctxNote = scopeText ? ` (질의 대상: ${scopeText})` : "";
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
  let responseInputRequests: InputRequest[] | undefined;
  let responseChoiceRequests: ChoiceRequest[] | undefined;
  let responseImages: MessageImage[] | undefined;
  let responseLinks: MessageLink[] | undefined;
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
    // 데모 모드에는 요청을 끼우지 않는다 — 시나리오는 정해진 대사를 순서대로
    // 재생하는 것이라, 중간에 사용자 조달을 요구하면 흐름이 끊긴다.
    // 스킬 인자(스칼라)가 없으면 입력 요청을 먼저 — 조달 SQL 보다 선행이다.
    const missingInputs = missingInputRequests(lastUser.content, body.inputs);
    // 입력 요청(스칼라 값)이 먼저다 — 값이 아예 없으면 후보를 좁힐 수도 없다.
    const missingChoices =
      missingInputs.length === 0 ? missingChoiceRequests(lastUser.content) : [];
    const missing = missingDataRequests(
      lastUser.content,
      body.dataSnapshots,
      body.scope,
    );
    if (missingInputs.length > 0) {
      responseInputRequests = missingInputs;
      responseText = buildInputRequestResponse(missingInputs);
    } else if (missingChoices.length > 0) {
      responseChoiceRequests = missingChoices;
      responseText = buildChoiceRequestResponse(missingChoices);
    } else if (missing.length > 0) {
      responseDataRequests = missing;
      responseText = buildDataRequestResponse(missing);
    } else {
      const answer = buildMockResponse(lastUser.content, body.scope);
      responseText = [...suppliedNotes(body.dataSnapshots), answer].join("\n\n");
    }
    responseRecommend = recommendNext(lastUser.content);
    // 조달을 청하는 답에는 붙이지 않는다 — 없는 데이터를 말하면서 그림을
    // 내미는 건 앞뒤가 안 맞는다.
    if (!responseDataRequests && !responseInputRequests && !responseChoiceRequests) {
      const images = mockImages(lastUser.content);
      const links = mockLinks(lastUser.content);
      if (images.length > 0) responseImages = images;
      if (links.length > 0) responseLinks = links;
    }
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
            ...(responseInputRequests && responseInputRequests.length > 0
              ? { inputRequests: responseInputRequests }
              : {}),
            ...(responseChoiceRequests && responseChoiceRequests.length > 0
              ? { choiceRequests: responseChoiceRequests }
              : {}),
            ...(responseImages && responseImages.length > 0
              ? { images: responseImages }
              : {}),
            ...(responseLinks && responseLinks.length > 0
              ? { links: responseLinks }
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
 * 그림·링크 — 실 백엔드에서는 모델이 MCP 로 읽어온 것이 여기 실린다. mock 은
 * 그럴 수 없으므로 키워드로 흉내 낸다. 데이터 패널의 `답변 산출물` 단이 실제로
 * 서는지 화면에서 걸어 볼 수 있게 하는 것이 목적이다.
 *
 * 이미지는 외부 요청 없이 그려지도록 inline SVG(data URL)로 둔다 — 사내망에서
 * 바깥 호스트를 때리는 mock 은 그 자체로 거짓 신호다.
 */
const MOCK_DIAGRAM =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="200" viewBox="0 0 480 200">
      <rect width="480" height="200" fill="#f6f4ef"/>
      <rect x="24" y="40" width="120" height="120" rx="8" fill="none" stroke="#8a7f6d" stroke-width="2"/>
      <rect x="180" y="40" width="120" height="120" rx="8" fill="none" stroke="#8a7f6d" stroke-width="2"/>
      <rect x="336" y="40" width="120" height="120" rx="8" fill="none" stroke="#8a7f6d" stroke-width="2"/>
      <text x="84" y="105" font-size="14" text-anchor="middle" fill="#4a4438">PM1</text>
      <text x="240" y="105" font-size="14" text-anchor="middle" fill="#4a4438">PM2</text>
      <text x="396" y="105" font-size="14" text-anchor="middle" fill="#4a4438">PM3</text>
      <text x="240" y="184" font-size="12" text-anchor="middle" fill="#8a7f6d">챔버 배치 (예시)</text>
    </svg>`,
  );

function mockImages(question: string): MessageImage[] {
  const q = question.toLowerCase();
  if (!["도면", "배치", "그림", "이미지", "챔버"].some((t) => q.includes(t))) {
    return [];
  }
  return [
    {
      label: "챔버 배치도",
      dataUrl: MOCK_DIAGRAM,
      alt: "PM1·PM2·PM3 챔버가 나란히 놓인 배치도",
    },
  ];
}

function mockLinks(question: string): MessageLink[] {
  const q = question.toLowerCase();
  if (!["레시피", "규격", "문서", "절차", "센서"].some((t) => q.includes(t))) {
    return [];
  }
  return [
    {
      label: "FDC 센서 명명 규칙",
      url: "https://wiki.example.internal/fdc/sensor-naming",
      description: "PARAM_INDEX 와 센서 이름이 어떻게 대응되는지",
    },
  ];
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
];

/**
 * 데모: 질문에서 설비 id 토큰(CVD-01 꼴)을 뽑는다. FE 의 파생 배선이 요청 라벨의
 * "설비 · category" 를 읽어 우측 설비 카드를 만들므로, 질문이 설비를 대면 그
 * 설비의 카드가 뜨게 된다. 실제 백엔드는 이를 구조화 필드로 실어 보낼 것이다.
 */
function extractEquipment(question: string): string | null {
  const m = /\b([A-Za-z]{2,4}-\d{1,3})\b/.exec(question);
  return m ? m[1].toUpperCase() : null;
}

/** 담긴 대상의 설비 — 통째로 담긴 설비가 먼저, 없으면 담긴 분석의 설비. */
function scopeEquipment(scope?: ChatScope): string | null {
  return scope?.equipments?.[0] ?? scope?.analyses?.[0]?.equipment ?? null;
}

/** 질문이 건드리는 데이터 중, 아직 동봉되지 않은 것들. */
function missingDataRequests(
  question: string,
  supplied: ChatRequestBody["dataSnapshots"],
  scope?: ChatScope,
): DataRequest[] {
  const q = question.toLowerCase();
  // 질문이 설비를 대면 그 설비, 아니면 담긴 대상의 설비. 둘 다 없을 때만 데모
  // 기본값으로 떨어진다 — mock 라우트라 늘 설비 카드가 서게 한다(실제 백엔드는
  // 요청에 진짜 설비를 실어 보낸다). 담긴 대상을 무시하면 요청 카드가 엉뚱한
  // 설비 밑으로 들어가 화면이 어긋난다.
  const eq =
    extractEquipment(question) ?? scopeEquipment(scope) ?? "CVD-01";
  const have = new Set((supplied ?? []).map((s) => s.queryKey));
  return REQUESTABLE.filter(
    (r) =>
      !have.has(r.queryKey) &&
      r.triggers.some((t) => q.includes(t.toLowerCase())),
  ).map((r) => ({
    queryKey: r.queryKey,
    // "설비 · category" 로 — 파생이 그 설비 카드로 묶는다. 구간은 일부러
    // 비운다(요청과 그 충족 스냅샷이 같은 그룹으로 합쳐지도록).
    label: `${eq} · ${r.label}`,
    columns: r.columns,
    sql: r.sql,
  }));
}

/**
 * 동봉된 데이터를 답 앞에 한 줄로 밝힌다 — **0행은 따로 말한다**.
 *
 * 실제 백엔드도 둘을 구분해 프롬프트에 싣는다: 0행은 못 받은 것이 아니라 "그
 * 조건으로는 없다"는 사실이라, 근거 목록에 뭉뚱그리면 화면과 답이 어긋난다.
 */
function suppliedNotes(supplied: ChatRequestBody["dataSnapshots"]): string[] {
  const all = supplied ?? [];
  const isEmpty = (s: ChatDataSnapshot) =>
    s.rows ? s.rows.length === 0 : s.rowCount === 0;
  const filled = all.filter((s) => !isEmpty(s)).map((s) => s.label);
  const empty = all.filter(isEmpty).map((s) => s.label);
  const notes: string[] = [];
  if (filled.length > 0) {
    notes.push(`제공해주신 ${filled.join(", ")} 을(를) 근거로 답변합니다.`);
  }
  if (empty.length > 0) {
    notes.push(
      `${empty.join(", ")} 은(는) 조회 결과가 0행이었습니다 — 그 조건으로는 데이터가 없습니다.`,
    );
  }
  return notes;
}

/**
 * mock 이 스칼라 입력을 청할 수 있는 목록 — 백엔드 `MockLlm` 의 request_input
 * 트리거와 같은 규칙("측정/추적"인데 param_index 가 없으면). 입력 카드 왕복을
 * 화면에서 실제로 걸어볼 수 있게 하는 것이 목적이다.
 */
const REQUESTABLE_INPUTS: Array<InputRequest & { triggers: string[] }> = [
  {
    skill: "fdc_trace_reading",
    key: "param_index",
    label: "PARAM_INDEX",
    description: "센서 파라미터 인덱스 (센서 이름이 아님)",
    triggers: ["측정", "추적", "trace"],
  },
];

/** 질문이 요구하는 스킬 인자 중, 아직 채워지지 않은 것들. */
function missingInputRequests(
  question: string,
  inputs: ChatInputs | undefined,
): InputRequest[] {
  const q = question.toLowerCase();
  return REQUESTABLE_INPUTS.filter(
    (r) =>
      r.triggers.some((t) => q.includes(t.toLowerCase())) &&
      !(inputs?.[r.skill]?.[r.key]?.trim()),
  ).map((r) => ({
    skill: r.skill,
    key: r.key,
    label: r.label,
    description: r.description,
  }));
}

function buildInputRequestResponse(missing: InputRequest[]): string {
  const names = missing.map((r) => `**${r.label}**`).join(", ");
  return (
    `이 질문에 답하려면 ${names} 값이 필요합니다.\n\n` +
    "데이터 패널의 입력 카드에 값을 넣어 주세요. 값을 채우면 그 값으로 이어서 분석하겠습니다. " +
    "없는 값을 추정해서 답하지 않겠습니다."
  );
}

// 센서 ID 패턴(예: S-0004) — 백엔드 `MockLlm` 의 SENSOR_RE 와 같은 규칙.
const SENSOR_RE = /\bS-\d{3,}\b/g;

/**
 * mock 이 선택 카드를 낼 수 있는 경우 — 질문에 서로 다른 센서 ID 가 둘 이상
 * 있으면 "어느 것을 볼지" 후보로 묻는다. 백엔드 `MockLlm` 의 다중 센서 선택
 * 시나리오(#53)와 같은 규칙이라, choice_request 왕복을 화면에서 실제로
 * 걸어볼 수 있다.
 */
function missingChoiceRequests(question: string): ChoiceRequest[] {
  // 카드 회신("선택 — S-0004 / S-0005")도 센서 ID 를 그대로 담고 있으므로 회신
  // 자체는 트리거에서 뺀다 — 안 그러면 답할 때마다 같은 카드가 되돌아온다.
  if (question.startsWith("선택 —")) return [];
  const ids = Array.from(new Set(question.match(SENSOR_RE) ?? []));
  if (ids.length < 2) return [];
  return [
    {
      question: "어느 센서를 분석할까요?",
      options: ids.map((id) => ({ label: id })),
      multiSelect: true,
    },
  ];
}

function buildChoiceRequestResponse(requests: ChoiceRequest[]): string {
  const names = requests.map((r) => `**${r.question}**`).join(", ");
  return (
    `${names}\n\n` +
    "아래 선택 카드에서 골라 주세요. 선택하시면 그 값으로 이어서 분석하겠습니다."
  );
}

/**
 * 다음 걸음 추천 — 백엔드 `MockLlm.followupSuggestions` 와 같은 규칙.
 * 데이터 요청 왕복(sensor_list ↔ recipe_steps)이 추천 클릭만으로 이어지게
 * 반대쪽 REQUESTABLE 을 먼저 둔다.
 */
function recommendNext(question: string): string[] {
  if (question.includes("센서 목록")) return ["레시피 STEP 구성 알려줘"];
  if (question.includes("레시피")) return ["챔버별 센서 목록 보여줘"];
  return ["챔버별 센서 목록 보여줘", "레시피 STEP 구성 알려줘"];
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

