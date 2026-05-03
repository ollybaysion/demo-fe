import { CONTEXT_LABELS } from "@/config/contextColumns";
import { SCENARIOS } from "@/demo/scenarios";
import type { ContextRow, Message } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TOKEN_INTERVAL_MS = 30;

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
  let responseTable: ReturnType<typeof pickTable> = undefined;
  let responseChart: ReturnType<typeof pickChart> = undefined;
  let responseRecommend: string[] | undefined;
  if (body.demo) {
    const scenario = SCENARIOS.find((s) => s.id === body.demo!.scenarioId);
    const turn = scenario?.turns[body.demo.turnIndex];
    if (turn) {
      responseText = turn.assistant;
      responseTable = pickTable(turn);
      responseChart = pickChart(turn);
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
        // 표(#34) / 차트(#37) / 추천 후속 질문(#40) 은 docs/api.md
        // 스펙대로 `done` 이벤트 페이로드에 번들로 동봉. 백엔드도 같은
        // 형태로 보낼 예정이라 클라이언트가 단일 done 핸들러만 신경 쓰면 됨.
        controller.enqueue(
          encodeSseEvent("done", {
            messageId,
            finishReason: "stop",
            ...(responseTable ? { table: responseTable } : {}),
            ...(responseChart ? { chart: responseChart } : {}),
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

function pickTable(
  turn: { table?: { rows: Record<string, unknown>[]; columns?: string[] } },
): { rows: Record<string, unknown>[]; columns?: string[] } | undefined {
  return turn.table;
}

function pickChart(
  turn: {
    chart?: {
      type: "line" | "bar" | "area";
      data: Record<string, unknown>[];
      options?: {
        title?: string;
        xKey?: string;
        yKeys?: string[];
        xLabel?: string;
        yLabel?: string;
      };
    };
  },
):
  | {
      type: "line" | "bar" | "area";
      data: Record<string, unknown>[];
      options?: {
        title?: string;
        xKey?: string;
        yKeys?: string[];
        xLabel?: string;
        yLabel?: string;
      };
    }
  | undefined {
  return turn.chart;
}
