import { describe, expect, it } from "vitest";
import type { PendingRequest } from "@/lib/request-store";
import type { DataSnapshot } from "@/lib/types";
import { derivePanel, parseLabel } from "./derive-cards";

function req(
  queryKey: string,
  label: string,
  timeRange?: { start: string; end: string },
): PendingRequest {
  return {
    request: { queryKey, label, columns: [], sql: "", timeRange },
    originMessageId: "m1",
    fulfilled: false,
  };
}

function snap(
  id: string,
  label: string,
  timeRange?: { start: string; end: string },
): DataSnapshot {
  return {
    id,
    queryKey: id,
    label,
    capturedAt: "2026-05-11T19:04:00.000Z",
    timeRange,
    columns: ["A"],
    rows: [["1"]],
    contentHash: id.padEnd(64, "0"),
    included: true,
    warnings: [],
  };
}

const RANGE = { start: "2026-05-11T09:00", end: "2026-05-11T18:00" };

describe("parseLabel", () => {
  it("'설비 · category' 를 가른다", () => {
    expect(parseLabel("CVD-01 · 수집값")).toEqual({
      equipment: "CVD-01",
      category: "수집값",
    });
  });

  it("구분자가 없으면 설비를 비워 미분류로 흘린다", () => {
    expect(parseLabel("직접 붙여넣은 표")).toEqual({
      equipment: "",
      category: "",
    });
  });
});

describe("derivePanel", () => {
  it("요청 하나 → 우측 설비 카드 + pending 이력 줄", () => {
    const { equipmentCards, groups } = derivePanel(
      [req("q1", "CVD-01 · 수집값", RANGE)],
      [],
    );
    expect(equipmentCards).toHaveLength(1);
    const card = equipmentCards[0];
    expect(card.equipment).toBe("CVD-01");
    expect(card.lines).toHaveLength(1);
    expect(card.lines[0].status).toBe("pending");
    expect(card.lines[0].tableCount).toBe(0);
    expect(card.lines[0].requestKey).toBe("q1");
    // 좌측 그룹에도 그 요청이 대기 카드로 들어 있다.
    expect(groups).toHaveLength(1);
    expect(groups[0].requests).toHaveLength(1);
    expect(groups[0].snapshots).toHaveLength(0);
  });

  it("같은 설비·구간·category 의 요청과 스냅샷은 한 그룹으로, 줄은 filled", () => {
    const { equipmentCards, groups } = derivePanel(
      [req("q1", "CVD-01 · 수집값", RANGE)],
      [snap("s1", "CVD-01 · 수집값", RANGE)],
    );
    expect(groups).toHaveLength(1);
    expect(groups[0].requests).toHaveLength(1);
    expect(groups[0].snapshots).toHaveLength(1);
    // 스냅샷이 있으니 우측 줄은 filled, tableCount 반영.
    expect(equipmentCards[0].lines[0].status).toBe("filled");
    expect(equipmentCards[0].lines[0].tableCount).toBe(1);
  });

  it("한 설비의 서로 다른 구간/category 는 별개 줄", () => {
    const { equipmentCards } = derivePanel(
      [
        req("q1", "CVD-01 · 수집값", RANGE),
        req("q2", "CVD-01 · Spec-out", RANGE),
      ],
      [],
    );
    expect(equipmentCards).toHaveLength(1);
    expect(equipmentCards[0].lines).toHaveLength(2);
  });

  it("설비를 못 읽는 스냅샷은 좌측 미분류 그룹으로만 — 우측 설비 카드는 없다", () => {
    const { equipmentCards, groups } = derivePanel(
      [],
      [snap("s1", "직접 붙여넣기1"), snap("s2", "직접 붙여넣기2")],
    );
    expect(groups).toHaveLength(1);
    expect(groups[0].equipment).toBe("미분류");
    expect(groups[0].snapshots).toHaveLength(2);
    // 미분류는 설비가 아니라 우측 설비 카드로 서지 않는다.
    expect(equipmentCards).toHaveLength(0);
  });

  it("요청/스냅샷이 없으면 빈 결과", () => {
    const { equipmentCards, groups } = derivePanel([], []);
    expect(equipmentCards).toHaveLength(0);
    expect(groups).toHaveLength(0);
  });

  it("직접 등록한 설비는 요청이 없어도 빈 카드로 선다", () => {
    const { equipmentCards, groups } = derivePanel([], [], ["CVD-09"]);
    expect(equipmentCards).toHaveLength(1);
    expect(equipmentCards[0].equipment).toBe("CVD-09");
    expect(equipmentCards[0].lines).toHaveLength(0);
    // 좌측엔 아직 아무것도 없다 — 요청이 붙어야 그룹이 생긴다.
    expect(groups).toHaveLength(0);
  });

  it("등록한 설비에 요청이 붙으면 같은 카드에 줄이 쌓인다", () => {
    const { equipmentCards } = derivePanel(
      [req("q1", "CVD-09 · 측정 분포")],
      [],
      ["CVD-09"],
    );
    expect(equipmentCards).toHaveLength(1);
    expect(equipmentCards[0].lines).toHaveLength(1);
    expect(equipmentCards[0].lines[0].requestKey).toBe("q1");
  });

  it("등록 설비가 먼저, 파생 설비가 뒤 — 등록 순서를 지킨다", () => {
    const { equipmentCards } = derivePanel(
      [req("q1", "ETCH-01 · 수집값")],
      [],
      ["CVD-09"],
    );
    expect(equipmentCards.map((c) => c.equipment)).toEqual([
      "CVD-09",
      "ETCH-01",
    ]);
  });

  it("라인은 등록에서 고른 것만 — 모르는 설비는 null 로 남는다", () => {
    const { equipmentCards } = derivePanel(
      [req("q1", "ETCH-01 · 수집값")],
      [],
      ["CVD-09"],
      { "CVD-09": "L2" },
    );
    // 등록에서 고른 CVD-09 만 라인을 갖는다. 채팅에서 파생된 ETCH-01 은 라인을
    // 알 길이 없으므로 순번을 지어내지 않고 비워 둔다.
    expect(equipmentCards.map((c) => [c.equipment, c.line])).toEqual([
      ["CVD-09", "L2"],
      ["ETCH-01", null],
    ]);
  });
});
