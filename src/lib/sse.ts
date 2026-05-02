/**
 * SSE (Server-Sent Events) parser for `fetch().body` streams.
 *
 * EventSource doesn't support POST, so we read the ReadableStream ourselves
 * and yield parsed events. Per api.md §4 each event has the form:
 *
 *   event: <name>
 *   data: <json>
 *   <blank line>
 *
 * `data:` may span multiple lines; values are accumulated and joined with
 * newlines before JSON.parse.
 */
export type SseEvent<T = unknown> = {
  event: string;
  data: T;
};

export async function* parseSseStream<T = unknown>(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<SseEvent<T>, void, unknown> {
  const reader = body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // Split on blank-line boundary; keep the trailing partial chunk in buffer.
      let separatorIndex: number;
      while ((separatorIndex = buffer.indexOf("\n\n")) !== -1) {
        const block = buffer.slice(0, separatorIndex);
        buffer = buffer.slice(separatorIndex + 2);
        const event = parseEventBlock<T>(block);
        if (event) yield event;
      }
    }

    // Flush any remaining buffered text after stream end.
    buffer += decoder.decode();
    if (buffer.trim().length > 0) {
      const event = parseEventBlock<T>(buffer);
      if (event) yield event;
    }
  } finally {
    reader.releaseLock();
  }
}

function parseEventBlock<T>(block: string): SseEvent<T> | null {
  let eventName = "message"; // SSE default per spec
  const dataLines: string[] = [];

  for (const rawLine of block.split("\n")) {
    const line = rawLine.replace(/\r$/, "");
    if (line.length === 0 || line.startsWith(":")) continue;

    const colon = line.indexOf(":");
    const field = colon === -1 ? line : line.slice(0, colon);
    let value = colon === -1 ? "" : line.slice(colon + 1);
    if (value.startsWith(" ")) value = value.slice(1);

    if (field === "event") eventName = value;
    else if (field === "data") dataLines.push(value);
    // ignore id / retry / unknown fields for now
  }

  if (dataLines.length === 0) return null;

  const dataStr = dataLines.join("\n");
  let data: T;
  try {
    data = JSON.parse(dataStr) as T;
  } catch (err) {
    throw new Error(
      `Failed to parse SSE data as JSON: ${dataStr.slice(0, 120)}`,
      { cause: err },
    );
  }
  return { event: eventName, data };
}
