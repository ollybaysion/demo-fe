import { describe, expect, it } from "vitest";

import type { Skill } from "./skills";
import {
  EMPTY_WORKBENCH,
  fulfillRequestCard,
  loadWorkbench,
  openAnalysis,
  ownerOfSnapshot,
  reconcileRequestCards,
  referencedSnapshotIds,
  removeAnalysis,
  removeEquipment,
  runRefOf,
  sameRun,
  saveWorkbench,
  toRunDecls,
  upsertEquipment,
  type Workbench,
} from "./workbench-cards";

const SKILL: Skill = {
  skill: "fdc_explain_sensor",
  name: "fdc-explain-sensor",
  unit: "센서",
  focus: "상태",
  description: "센서 설명",
  inputs: [{ key: "snsr_id", label: "센서", required: true }],
  steps: [],
} as unknown as Skill;

function seeded(): { wb: Workbench; analysisId: string } {
  const { wb, analysis } = openAnalysis(
    EMPTY_WORKBENCH,
    "CVD-01",
    "L1",
    SKILL,
    { snsr_id: "B" },
  );
  return { wb, analysisId: analysis.id };
}

describe("설비 카드", () => {
  it("같은 이름은 같은 설비로 병합된다 — id 는 이름에서 결정적", () => {
    let wb = upsertEquipment(EMPTY_WORKBENCH, "CVD-01", null);
    wb = upsertEquipment(wb, "CVD-01", "L2");
    expect(wb.equipments).toHaveLength(1);
    expect(wb.equipments[0].line).toBe("L2");
  });

  it("라인을 안 고른 재등록이 앞서 고른 라인을 지우지 않는다", () => {
    let wb = upsertEquipment(EMPTY_WORKBENCH, "CVD-01", "L1");
    wb = upsertEquipment(wb, "CVD-01", null);
    expect(wb.equipments[0].line).toBe("L1");
  });
});

describe("분석 카드", () => {
  it("개설하면 설비 안에 실제로 들어간다 — 소속은 위치", () => {
    const { wb } = seeded();
    expect(wb.equipments[0].analyses).toHaveLength(1);
    expect(wb.equipments[0].analyses[0].args).toEqual({ snsr_id: "B" });
  });

  it("같은 설비에 같은 run 을 다시 열면 기존 카드를 돌려준다", () => {
    const first = seeded();
    const again = openAnalysis(first.wb, "CVD-01", null, SKILL, {
      snsr_id: "B",
    });
    expect(again.analysis.id).toBe(first.analysisId);
    expect(again.wb.equipments[0].analyses).toHaveLength(1);
  });

  it("선언은 트리의 분석 카드 그대로다", () => {
    const { wb } = seeded();
    expect(toRunDecls(wb)).toEqual([
      { skill: "fdc-explain-sensor", args: { snsr_id: "B" } },
    ]);
    expect(toRunDecls(EMPTY_WORKBENCH)).toBeUndefined();
  });
});

describe("판정 반영 (request 카드)", () => {
  const RUN = { skill: "fdc-explain-sensor", args: { snsr_id: "B" } };
  const REQ1 = {
    queryKey: "fdc-explain-sensor#1__snsr_id=B",
    label: "2단계",
    sql: "SELECT 1",
    columns: ["A"],
    run: RUN,
  };

  it("run 이 맞는 분석 카드 안에 request 카드로 선다", () => {
    const { wb } = seeded();
    const { wb: next, unmatched } = reconcileRequestCards(wb, [REQ1]);
    expect(unmatched).toHaveLength(0);
    const cards = next.equipments[0].analyses[0].cards;
    expect(cards).toHaveLength(1);
    expect(cards[0]).toMatchObject({ type: "request", queryKey: REQ1.queryKey });
  });

  it("목록에서 사라진 request 카드는 내려간다 — 전량 교체", () => {
    const { wb } = seeded();
    const opened = reconcileRequestCards(wb, [REQ1]).wb;
    const closed = reconcileRequestCards(opened, []).wb;
    expect(closed.equipments[0].analyses[0].cards).toHaveLength(0);
  });

  it("내용이 같으면 기존 카드 객체를 유지한다 — 깜빡임 방지", () => {
    const { wb } = seeded();
    const first = reconcileRequestCards(wb, [REQ1]).wb;
    const again = reconcileRequestCards(first, [{ ...REQ1 }]).wb;
    expect(again.equipments[0].analyses[0].cards[0]).toBe(
      first.equipments[0].analyses[0].cards[0],
    );
  });

  it("어느 분석과도 안 맞는 요청은 unmatched 로 돌려준다 — 지어내지 않는다", () => {
    const { wb } = seeded();
    const alien = { ...REQ1, run: { skill: "other", args: {} } };
    const { wb: next, unmatched } = reconcileRequestCards(wb, [alien]);
    expect(unmatched).toEqual([alien]);
    expect(next.equipments[0].analyses[0].cards).toHaveLength(0);
  });

  it("로컬에 같은 키의 스냅샷이 있으면 요청 대신 data 카드로 백필한다", () => {
    const { wb } = seeded();
    const { wb: next, backfilled } = reconcileRequestCards(
      wb,
      [REQ1],
      (key) => (key === REQ1.queryKey ? "snap-old" : undefined),
    );
    expect(backfilled).toBe(1);
    const cards = next.equipments[0].analyses[0].cards;
    expect(cards).toHaveLength(1);
    expect(cards[0]).toMatchObject({
      type: "data",
      queryKey: REQ1.queryKey,
      snapshotId: "snap-old",
    });
  });

  it("data 로 전이한 자리는 낡은 echo 가 다시 열지 못한다", () => {
    const { wb } = seeded();
    const opened = reconcileRequestCards(wb, [REQ1]).wb;
    const filled = fulfillRequestCard(opened, REQ1.queryKey, "snap-1");
    const echoed = reconcileRequestCards(filled, [REQ1]).wb;
    const cards = echoed.equipments[0].analyses[0].cards;
    expect(cards).toHaveLength(1);
    expect(cards[0].type).toBe("data");
  });
});

describe("request → data 전이", () => {
  const RUN = { skill: "fdc-explain-sensor", args: { snsr_id: "B" } };
  const REQ = {
    queryKey: "fdc-explain-sensor#1__snsr_id=B",
    label: "2단계",
    run: RUN,
  };

  it("같은 자리(id 유지)에서 data 카드가 되고 본문은 snapshotId 로 참조한다", () => {
    const { wb } = seeded();
    const opened = reconcileRequestCards(wb, [REQ]).wb;
    const before = opened.equipments[0].analyses[0].cards[0];
    const filled = fulfillRequestCard(opened, REQ.queryKey, "snap-9");
    const after = filled.equipments[0].analyses[0].cards[0];
    expect(after).toMatchObject({
      type: "data",
      id: before.id,
      snapshotId: "snap-9",
    });
  });

  it("재등록은 참조만 갈아끼운다", () => {
    const { wb } = seeded();
    const filled = fulfillRequestCard(
      reconcileRequestCards(wb, [REQ]).wb,
      REQ.queryKey,
      "snap-1",
    );
    const again = fulfillRequestCard(filled, REQ.queryKey, "snap-2");
    const cards = again.equipments[0].analyses[0].cards;
    expect(cards).toHaveLength(1);
    expect(cards[0]).toMatchObject({ type: "data", snapshotId: "snap-2" });
  });
});

describe("cascade 와 역인덱스", () => {
  const RUN = { skill: "fdc-explain-sensor", args: { snsr_id: "B" } };
  const REQ = {
    queryKey: "fdc-explain-sensor#1__snsr_id=B",
    label: "2단계",
    run: RUN,
  };

  it("분석을 지우면 소속 카드가 함께 사라진다", () => {
    const { wb, analysisId } = seeded();
    const filled = fulfillRequestCard(
      reconcileRequestCards(wb, [REQ]).wb,
      REQ.queryKey,
      "snap-1",
    );
    const removed = removeAnalysis(filled, analysisId);
    expect(removed.equipments[0].analyses).toHaveLength(0);
    expect(referencedSnapshotIds(removed).size).toBe(0);
  });

  it("설비를 지우면 통째로 사라진다", () => {
    const { wb } = seeded();
    const removed = removeEquipment(wb, "eq-cvd-01");
    expect(removed.equipments).toHaveLength(0);
  });

  it("snapshotId → 소속(설비·분석) 역조회", () => {
    const { wb } = seeded();
    const filled = fulfillRequestCard(
      reconcileRequestCards(wb, [REQ]).wb,
      REQ.queryKey,
      "snap-1",
    );
    const owner = ownerOfSnapshot(filled, "snap-1");
    expect(owner?.equipment.name).toBe("CVD-01");
    expect(owner?.analysis.args).toEqual({ snsr_id: "B" });
    expect(ownerOfSnapshot(filled, "snap-없음")).toBeNull();
  });
});

describe("run 대조", () => {
  it("스킬 이름 + 인자 얕은 비교", () => {
    const a = { skill: "s", args: { x: "1" } };
    expect(sameRun(a, { skill: "s", args: { x: "1" } })).toBe(true);
    expect(sameRun(a, { skill: "s", args: { x: "2" } })).toBe(false);
    expect(sameRun(a, { skill: "t", args: { x: "1" } })).toBe(false);
    expect(sameRun(a, undefined)).toBe(false);
  });

  it("runRefOf 는 spec 이름을 쓴다 — BE 풀 정식 표기", () => {
    const { wb } = seeded();
    expect(runRefOf(wb.equipments[0].analyses[0]).skill).toBe(
      "fdc-explain-sensor",
    );
  });
});

describe("영속", () => {
  it("저장→복원 왕복이 트리를 보존하고, 깨진 저장은 빈 작업판으로", () => {
    // node 테스트 환경엔 localStorage 가 없다 — 인메모리 셰임으로 계약만 검증.
    const store = new Map<string, string>();
    (globalThis as { localStorage?: unknown }).localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    };
    const { wb } = seeded();
    saveWorkbench(wb);
    expect(loadWorkbench()).toEqual(wb);
    localStorage.setItem("fdc.workbench.v1", "{broken");
    expect(loadWorkbench()).toEqual(EMPTY_WORKBENCH);
  });
});
