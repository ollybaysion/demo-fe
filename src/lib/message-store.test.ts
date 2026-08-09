import { describe, expect, it } from "vitest";
import {
  buildMessageRows,
  equipmentsOf,
  filterByEquipment,
  labelFromRaw,
  messageStamp,
  migrateMessages,
  removeMessage,
  sortMessages,
  timeKey,
  upsertMessage,
  visibleMessages,
} from "./message-store";
import type { DataMessage } from "./types";

function msg(over: Partial<DataMessage>): DataMessage {
  return {
    id: "dmsg-1",
    label: "LotProcessResult",
    createdAt: "2026-08-09T00:00:00.000Z",
    raw: "LotProcessResult{eqpId=CVD-01}",
    json: { eqpId: "CVD-01" },
    ...over,
  };
}

describe("upsertMessage", () => {
  it("같은 원문 재판정은 정체를 유지한 채 본문만 갈아끼운다", () => {
    const first = msg({ id: "dmsg-1" });
    const list = [first];
    const again = msg({ id: "dmsg-2", comment: "새 코멘트" });
    const result = upsertMessage(list, again);
    expect(result.replacedExisting).toBe(true);
    expect(result.list).toHaveLength(1);
    // id·등록 시각은 기존 것 — 화면·저장소 참조가 끊기지 않는다.
    expect(result.stored.id).toBe("dmsg-1");
    expect(result.stored.comment).toBe("새 코멘트");
  });

  it("다른 원문은 새 항목이다", () => {
    const result = upsertMessage([msg({})], msg({ id: "dmsg-2", raw: "Other{a=1}" }));
    expect(result.replacedExisting).toBe(false);
    expect(result.list).toHaveLength(2);
  });
});

describe("timeKey", () => {
  it("표기가 흔들려도 같은 자릿수로 편다 — 사전순 비교가 곧 시간순", () => {
    expect(timeKey("2026-08-08T11:58:03.412765")).toBe("20260808115803412765000");
    // 공백 구분·오프셋·초 생략 — LLM 이 뽑는 값이라 이 정도는 흔들린다.
    expect(timeKey("2026-08-08 11:58:03.412765")).toBe(timeKey("2026-08-08T11:58:03.412765"));
    expect(timeKey("2026-08-08T11:58:03.412765+09:00")).toBe(
      timeKey("2026-08-08T11:58:03.412765"),
    );
    expect(timeKey("2026-08-08T11:58")).toBe("20260808115800000000000");
    // 3자리와 6자리가 섞여도 순서가 맞는다 — 문자열 비교면 .412 가 앞섰을 자리.
    expect(timeKey("2026-08-08T11:58:03.412")! < timeKey("2026-08-08T11:58:03.412765")!).toBe(
      true,
    );
    expect(timeKey("오전 11시쯤")).toBeNull();
    expect(timeKey("11:58:03")).toBeNull();
    expect(timeKey(undefined)).toBeNull();
  });
});

describe("sortMessages", () => {
  it("발생 시각 최신 순 — 같은 초는 소수초가 가른다", () => {
    const out = sortMessages([
      msg({ id: "a", raw: "1", occurredAt: "2026-08-08T11:58:03.412108" }),
      msg({ id: "b", raw: "2", occurredAt: "2026-08-08T12:03:41.284137" }),
      msg({ id: "c", raw: "3", occurredAt: "2026-08-08T11:58:03.412765" }),
    ]);
    expect(out.map((m) => m.id)).toEqual(["b", "c", "a"]);
  });

  it("발생 시각이 없으면 등록 시각으로 줄 선다", () => {
    const out = sortMessages([
      msg({ id: "a", raw: "1", createdAt: "2026-08-09T00:00:00.000Z" }),
      msg({ id: "b", raw: "2", occurredAt: "2026-08-09T09:00:00" }),
      msg({ id: "c", raw: "3", createdAt: "2026-08-09T10:00:00.000Z" }),
    ]);
    expect(out.map((m) => m.id)).toEqual(["c", "b", "a"]);
  });
});

describe("messageStamp", () => {
  it("소수초는 원문 자릿수 그대로 — 없던 0 을 채우지 않는다", () => {
    const stamp = messageStamp(msg({ occurredAt: "2026-08-08T11:58:03.412" }))!;
    expect(stamp).toMatchObject({ date: "2026-08-08", time: "11:58:03", frac: "412" });
    expect(stamp.exact).toBe(true);
  });

  it("발생 시각이 없으면 등록 시각을 쓰되 exact 가 아니다", () => {
    expect(messageStamp(msg({ createdAt: "2026-08-09T00:00:00.000Z" }))!.exact).toBe(false);
    expect(messageStamp(msg({ createdAt: "" }))).toBeNull();
  });
});

describe("buildMessageRows", () => {
  const at = (id: string, occurredAt: string, eqpId = "CVD-01") =>
    msg({ id, raw: id, occurredAt, eqpId });

  it("시각 축 — 날짜가 바뀔 때만 구분선이 선다", () => {
    const rows = buildMessageRows(
      [
        at("a", "2026-08-08T12:00:00.100000"),
        at("b", "2026-08-08T11:00:00.100000"),
        at("c", "2026-08-08T10:50:00.100000"),
        at("d", "2026-08-07T23:00:00.100000"),
      ],
      "time",
    );
    // 한 시간이 비어도 줄은 이어진다 — 유입 간격은 목록이 말할 일이 아니다.
    expect(rows.map((r) => r.kind)).toEqual([
      "message", // a
      "message", // b
      "message", // c
      "daybreak",
      "message", // d
    ]);
    expect(rows[3]).toMatchObject({ label: "8월 7일 (금)" });
  });

  it("설비 축 — 이름순, 미분류는 맨 뒤", () => {
    const rows = buildMessageRows(
      [
        at("a", "2026-08-08T12:00:00.000000", "ETCH-02"),
        msg({ id: "b", raw: "b", occurredAt: "2026-08-08T11:00:00.000000" }),
        at("c", "2026-08-08T10:00:00.000000", "CVD-01"),
      ],
      "eqp",
    );
    expect(rows.filter((r) => r.kind === "header").map((r) => r.label)).toEqual([
      "CVD-01",
      "ETCH-02",
      "미분류",
    ]);
    expect(visibleMessages(rows).map((m) => m.id)).toEqual(["c", "a", "b"]);
  });

  it("날짜 축 — 최신 날짜부터, 머리에 건수", () => {
    const rows = buildMessageRows(
      [
        at("a", "2026-08-07T12:00:00.000000"),
        at("b", "2026-08-08T09:00:00.000000"),
        at("c", "2026-08-08T08:00:00.000000"),
      ],
      "date",
    );
    expect(rows[0]).toMatchObject({ kind: "header", label: "8월 8일 (토)", count: 2 });
    expect(visibleMessages(rows).map((m) => m.id)).toEqual(["b", "c", "a"]);
  });

  it("보이는 순서가 곧 상세 순회 순서다", () => {
    const list = [
      at("a", "2026-08-08T12:00:00.000000", "ETCH-02"),
      at("b", "2026-08-08T11:00:00.000000", "CVD-01"),
    ];
    expect(visibleMessages(buildMessageRows(list, "time")).map((m) => m.id)).toEqual(["a", "b"]);
    // 같은 목록이라도 설비 축에서는 CVD-01 이 먼저 — 순회도 그 순서를 따른다.
    expect(visibleMessages(buildMessageRows(list, "eqp")).map((m) => m.id)).toEqual(["b", "a"]);
  });
});

describe("equipmentsOf · filterByEquipment", () => {
  it("고른 설비가 없으면 전체다", () => {
    const list = [
      msg({ id: "a", raw: "a", eqpId: "ETCH-02" }),
      msg({ id: "b", raw: "b", eqpId: "CVD-01" }),
      msg({ id: "c", raw: "c" }),
    ];
    expect(equipmentsOf(list)).toEqual(["CVD-01", "ETCH-02"]);
    expect(filterByEquipment(list, [])).toHaveLength(3);
    expect(filterByEquipment(list, ["CVD-01"]).map((m) => m.id)).toEqual(["b"]);
  });
});

describe("removeMessage", () => {
  it("id 로 지운다", () => {
    expect(removeMessage([msg({})], "dmsg-1")).toHaveLength(0);
  });
});

describe("labelFromRaw", () => {
  it("첫 줄 머리 40자 — 비면 '메시지'", () => {
    expect(labelFromRaw("Abc{x=1}\n2행")).toBe("Abc{x=1}");
    expect(labelFromRaw("   ")).toBe("메시지");
  });
});

describe("migrateMessages", () => {
  it("모양이 어긋난 항목은 조용히 버린다(부분 수용)", () => {
    const ok = msg({});
    const out = migrateMessages([ok, { id: "x" }, null, "junk"]);
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe("dmsg-1");
  });

  it("json 이 없어도 받는다 — 변환 실패 건은 원문으로 서야 한다", () => {
    const out = migrateMessages([
      { id: "a", raw: "AlarmEvent{alarmId=AL-201}", createdAt: "t", label: "" },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].json).toBeUndefined();
    expect(out[0].label).toBe("AlarmEvent{alarmId=AL-201}");
  });

  it("모양이 어긋난 발생 시각은 떼고 받는다 — 정렬 키로 쓸 수 없다", () => {
    const out = migrateMessages([
      msg({ occurredAt: "2026-08-08T11:58:03.412765" }),
      msg({ id: "dmsg-2", raw: "r2", occurredAt: "오전 11시쯤" }),
    ]);
    expect(out[0].occurredAt).toBe("2026-08-08T11:58:03.412765");
    expect(out[1].occurredAt).toBeUndefined();
  });

  it("label 이 없으면 원문에서 만든다", () => {
    const out = migrateMessages([
      { id: "a", raw: "Kryo{q=1}", json: {}, createdAt: "t", label: "" },
    ]);
    expect(out[0].label).toBe("Kryo{q=1}");
  });
});
