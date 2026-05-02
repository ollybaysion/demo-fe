import type { Message } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TOKEN_INTERVAL_MS = 100;

type ChatRequestBody = {
  messages: Message[];
};

function encodeSseEvent(event: string, data: unknown): Uint8Array {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  return new TextEncoder().encode(payload);
}

function buildMockResponse(lastUserContent: string): string {
  return `'${lastUserContent}' 라고 물으셨네요. 아직 백엔드가 연결되지 않았습니다.`;
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

  const responseText = buildMockResponse(lastUser.content);
  const characters = [...responseText];
  const messageId = `msg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for (const ch of characters) {
          controller.enqueue(encodeSseEvent("token", { content: ch }));
          await sleep(TOKEN_INTERVAL_MS);
        }
        controller.enqueue(
          encodeSseEvent("done", { messageId, finishReason: "stop" }),
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
