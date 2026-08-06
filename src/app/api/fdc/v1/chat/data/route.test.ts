import { describe, expect, it } from "vitest";

import type { DataRequest } from "@/lib/types";
import { POST } from "./route";

/**
 * mock 판정 — BE 없이 데모가 **끝까지** 도는지가 여기서 갈린다.
 *
 * spec v3 부터 카드의 진실원은 서버다. 화면은 스킬을 읽어 SQL 을 완성하지 않으므로,
 * 바인드 체이닝을 아무도 안 하면 두 번째 조회에서 멈춘다. 그 일이 서버 흉내를 내는
 * 이 자리에 있는지 확인한다.
 */

const RUN = {
  skill: "fdc-explain-sensor",
  args: { snsr_id: "S-0004" },
};
const SENSOR_KEY = "fdc-explain-sensor#sensor_row__snsr_id=S-0004";
const EQUIPMENT_KEY = "fdc-explain-sensor#equipment_row__snsr_id=S-0004";
const EVENT_KEY = "fdc-explain-sensor#setup_event_rows__snsr_id=S-0004";

type Done = {
  dataRequests: DataRequest[];
  terminalRuns?: string[];
  narratedRun?: string;
};

async function judge(body: unknown): Promise<{ done: Done; tokens: string }> {
  const res = await POST(
    new Request("http://localhost/api/fdc/v1/chat/data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
  const text = await res.text();
  const done = text
    .split("\n\n")
    .filter((chunk) => chunk.startsWith("event: done"))
    .map((chunk) => JSON.parse(chunk.slice(chunk.indexOf("data: ") + 6)))[0];
  const tokens = text
    .split("\n\n")
    .filter((chunk) => chunk.startsWith("event: token"))
    .map(
      (chunk) =>
        (JSON.parse(chunk.slice(chunk.indexOf("data: ") + 6)) as { content: string })
          .content,
    )
    .join("");
  return { done: done as Done, tokens };
}

function stateOf(done: Done, queryKey: string): string | undefined {
  return done.dataRequests.find((r) => r.queryKey === queryKey)?.state;
}

describe("mock panel-judge — 조달 원장", () => {
  it("선언만 있으면 인자로 도는 조회만 열리고 나머지는 잠긴다", async () => {
    const { done } = await judge({ eventId: "e1", revision: 1, runs: [RUN] });

    expect(stateOf(done, SENSOR_KEY)).toBe("ready");
    expect(stateOf(done, EQUIPMENT_KEY)).toBe("blocked");
    const sensor = done.dataRequests.find((r) => r.queryKey === SENSOR_KEY)!;
    expect(sensor.sql).toContain("'S-0004'");
    expect(sensor.sql).not.toContain(":id");
    // 소속은 run 이 정본 — 화면이 queryKey 를 역파싱하지 않는다.
    expect(sensor.run).toEqual(RUN);
    // 잠긴 줄은 SQL 없이 사유만.
    const equipment = done.dataRequests.find((r) => r.queryKey === EQUIPMENT_KEY)!;
    expect(equipment.sql).toBeUndefined();
    expect(equipment.blocked).toContain("sensor_row");
  });

  it("앞 조회가 도착하면 그 값으로 다음 SQL 이 완성된다 — 체이닝", async () => {
    const { done } = await judge({
      eventId: "e2",
      revision: 2,
      runs: [RUN],
      snapshots: [
        {
          queryKey: SENSOR_KEY,
          label: "센서",
          columns: ["SNSR_ID", "EQP_ID"],
          rowCount: 1,
          rows: [["S-0004", "CVD-01"]],
        },
      ],
    });

    expect(stateOf(done, SENSOR_KEY)).toBe("arrived");
    const equipment = done.dataRequests.find((r) => r.queryKey === EQUIPMENT_KEY)!;
    expect(equipment.state).toBe("ready");
    // 값은 모델이 아니라 붙여넣은 표에서 나왔다.
    expect(equipment.sql).toContain("'CVD-01'");
  });

  it("앞 조회가 0행이면 잠김이 아니라 도달 불가 — 기다림과 포기가 갈린다", async () => {
    const { done } = await judge({
      eventId: "e3",
      revision: 3,
      runs: [RUN],
      snapshots: [
        {
          queryKey: SENSOR_KEY,
          label: "센서",
          columns: ["SNSR_ID", "EQP_ID"],
          rowCount: 0,
          rows: [],
        },
      ],
    });

    expect(stateOf(done, EQUIPMENT_KEY)).toBe("unreachable");
    expect(stateOf(done, EVENT_KEY)).toBe("unreachable");
  });

  it("여러 값이면 고르지 않고 잠근다 — 지어내느니 멈춘다", async () => {
    const { done } = await judge({
      eventId: "e4",
      revision: 4,
      runs: [RUN],
      snapshots: [
        {
          queryKey: SENSOR_KEY,
          label: "센서",
          columns: ["SNSR_ID", "EQP_ID"],
          rowCount: 2,
          rows: [
            ["S-0004", "CVD-01"],
            ["S-0004", "ETCH-01"],
          ],
        },
      ],
    });

    const equipment = done.dataRequests.find((r) => r.queryKey === EQUIPMENT_KEY)!;
    expect(equipment.state).toBe("blocked");
    expect(equipment.blocked).toContain("여러 값");
  });

  it("더 열 것이 없으면 종결이고, 그 등록이 절차를 끝냈으면 서술이 난다", async () => {
    const { done, tokens } = await judge({
      eventId: "e5",
      revision: 5,
      event: { type: "snapshot-registered", queryKey: SENSOR_KEY },
      runs: [RUN],
      snapshots: [
        {
          queryKey: SENSOR_KEY,
          label: "센서",
          columns: ["SNSR_ID", "EQP_ID"],
          rowCount: 0,
          rows: [],
        },
      ],
    });

    expect(done.terminalRuns).toContain("fdc-explain-sensor (snsr_id=S-0004)");
    expect(done.narratedRun).toBe("fdc-explain-sensor (snsr_id=S-0004)");
    expect(tokens).toContain("조회 절차가 완료");
  });

  it("등재되지 않은 스킬 선언은 원장을 만들지 않는다", async () => {
    const { done } = await judge({
      eventId: "e6",
      revision: 6,
      runs: [{ skill: "no-such-skill", args: {} }],
    });

    expect(done.dataRequests).toEqual([]);
  });
});
