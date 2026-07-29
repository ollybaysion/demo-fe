import { describe, expect, it } from "vitest";
import {
  EMPTY_WORKBENCH,
  isEmptyWorkbench,
  parseWorkbench,
  sameWorkbench,
  type Workbench,
} from "@/lib/workbench";
import type { Skill, SkillSession } from "@/lib/skills";

const TRACE: Skill = {
  skill: "fdc_trace_reading",
  name: "fdc-trace-reading",
  unit: "센서",
  focus: "센서 측정값",
  description: "…",
  inputs: [{ key: "param_index", required: true }],
};

function session(id: string, equipment = "CVD-01"): SkillSession {
  return { id, equipment, skill: TRACE, values: { param_index: "7" } };
}

const FULL: Workbench = {
  seedEquipments: ["CVD-01", "ETCH-07"],
  equipmentLines: { "CVD-01": "L2", "ETCH-07": "L3" },
  skillSessions: [session("s1")],
  sessionSnapshotIds: ["snap-1", "snap-2"],
  queryScope: [{ kind: "equipment", equipment: "CVD-01" }],
};

describe("작업판 읽기", () => {
  it("저장분이 없으면 빈 작업판", () => {
    expect(parseWorkbench(null)).toEqual(EMPTY_WORKBENCH);
    expect(parseWorkbench("깨진 값")).toEqual(EMPTY_WORKBENCH);
    expect(isEmptyWorkbench(parseWorkbench(undefined))).toBe(true);
  });

  it("왕복해도 그대로다", () => {
    expect(parseWorkbench(JSON.parse(JSON.stringify(FULL)))).toEqual(FULL);
  });

  it("못 읽는 조각만 접는다 — 나머지는 살린다", () => {
    // 스킬 하나가 깨졌다고 등록해 둔 설비까지 잃을 이유는 없다.
    const parsed = parseWorkbench({
      seedEquipments: ["CVD-01", 42, null],
      equipmentLines: { "CVD-01": "L2", "ETCH-07": 7 },
      skillSessions: [session("s1"), { id: "s2" }, null],
      sessionSnapshotIds: ["snap-1", {}],
      queryScope: [
        { kind: "equipment", equipment: "CVD-01" },
        { kind: "analysis", equipment: "CVD-01" },
        { kind: "누구세요", equipment: "CVD-01" },
      ],
    });
    expect(parsed.seedEquipments).toEqual(["CVD-01"]);
    expect(parsed.equipmentLines).toEqual({ "CVD-01": "L2" });
    expect(parsed.skillSessions.map((s) => s.id)).toEqual(["s1"]);
    expect(parsed.sessionSnapshotIds).toEqual(["snap-1"]);
    expect(parsed.queryScope).toEqual([
      { kind: "equipment", equipment: "CVD-01" },
    ]);
  });

  it("모르는 필드는 버린다 — 화면이 읽는 모양만 남는다", () => {
    const parsed = parseWorkbench({ ...FULL, 낡은필드: "값" });
    expect(Object.keys(parsed).sort()).toEqual(
      Object.keys(EMPTY_WORKBENCH).sort(),
    );
  });
});

describe("작업판 같음 판정", () => {
  it("내용이 같으면 같다 — 라인 맵의 키 순서가 달라도", () => {
    const reordered: Workbench = {
      ...FULL,
      equipmentLines: { "ETCH-07": "L3", "CVD-01": "L2" },
    };
    // 여기서 다르다고 하면 복원 직후의 되쓰기가 사이드바 정렬을 흔든다.
    expect(sameWorkbench(FULL, reordered)).toBe(true);
  });

  it("값이 바뀌면 다르다", () => {
    expect(
      sameWorkbench(FULL, { ...FULL, seedEquipments: ["CVD-01"] }),
    ).toBe(false);
    expect(
      sameWorkbench(FULL, {
        ...FULL,
        equipmentLines: { "CVD-01": "L2", "ETCH-07": "L4" },
      }),
    ).toBe(false);
    expect(
      sameWorkbench(FULL, { ...FULL, sessionSnapshotIds: ["snap-2", "snap-1"] }),
    ).toBe(false);
  });

  it("등록 순서가 다르면 다르다 — 카드가 서는 순서다", () => {
    expect(
      sameWorkbench(FULL, {
        ...FULL,
        seedEquipments: ["ETCH-07", "CVD-01"],
      }),
    ).toBe(false);
  });
});

describe("빈 작업판", () => {
  it("한 자리라도 차 있으면 빈 것이 아니다", () => {
    expect(isEmptyWorkbench(EMPTY_WORKBENCH)).toBe(true);
    expect(
      isEmptyWorkbench({ ...EMPTY_WORKBENCH, seedEquipments: ["CVD-01"] }),
    ).toBe(false);
    expect(
      isEmptyWorkbench({ ...EMPTY_WORKBENCH, skillSessions: [session("s1")] }),
    ).toBe(false);
    expect(
      isEmptyWorkbench({ ...EMPTY_WORKBENCH, equipmentLines: { a: "L1" } }),
    ).toBe(false);
  });
});
