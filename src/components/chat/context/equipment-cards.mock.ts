/**
 * 오른쪽 패널 시안용 임시 데이터.
 *
 * 화면 모양을 먼저 정하기 위한 것이라 여기 값은 전부 가짜다. 실제로는
 * **데이터 요청**(설비 / 시간 구간 / category)에서 파생된다 — 요청이 나가는
 * 순간 줄이 `pending` 으로 생기고, 사용자가 결과를 붙여넣으면 `filled` 이 된다.
 * 파생 배선이 붙는 순간 이 파일은 사라진다.
 */

import type { PendingRequest } from "@/lib/request-store";
import type { DataSnapshot } from "@/lib/types";
import { formatRange } from "@/lib/format-range";

export type EquipmentLineStatus = "pending" | "filled";

/** 한 줄 = "이 설비의 이 구간의 이 category 데이터". 오른쪽 패널의 선택 단위. */
export type EquipmentLine = {
  key: string;
  /** ISO(분 단위). 표시 형식은 화면이 만든다. */
  start: string;
  end: string;
  category: string;
  status: EquipmentLineStatus;
  /** 이 줄에 딸린 데이터 표 수 — 대기 중이면 0. */
  tableCount: number;
  /** 대기 줄이 가리키는 요청 카드(왼쪽) — 누르면 그 카드로 데려간다. */
  requestKey?: string;
};

export type EquipmentCardModel = {
  id: string;
  equipment: string;
  /**
   * 이 설비가 속한 라인 — AKG 가 가진 목록에서 고른 값. 채팅에서 파생된 카드는
   * 라인을 알 길이 없으므로 `null` 이다(모르는 것을 순번으로 지어내지 않는다).
   */
  line: string | null;
  /**
   * 설비를 설명하는 값들(설비명·모델…) — "설비 정보" category 조회가 채운다.
   * 칩 여러 개가 아니라 **한 줄 텍스트**로 이어 붙인다: 좁은 패널에서 칩 3개는
   * 이름과 무게가 같아져 위계를 무너뜨린다. 아직 조회 전이면 빈 배열.
   */
  descriptors: string[];
  /** 가동 상태 — 유일하게 색(중립 점)을 받는 값. 모르면 null. */
  status: string | null;
  lines: EquipmentLine[];
};

export const MOCK_EQUIPMENT_CARDS: EquipmentCardModel[] = [
  {
    id: "eq-cvd-01",
    equipment: "CVD-01",
    line: "L1",
    descriptors: ["증착기 1호", "AMAT CV-800"],
    status: "가동",
    lines: [
      {
        key: "cvd-01|2026-05-11T09:00|2026-05-11T18:00|수집값",
        start: "2026-05-11T09:00",
        end: "2026-05-11T18:00",
        category: "수집값",
        status: "filled",
        tableCount: 3,
      },
      {
        key: "cvd-01|2026-05-11T09:00|2026-05-11T18:00|Spec-out",
        start: "2026-05-11T09:00",
        end: "2026-05-11T18:00",
        category: "Spec-out",
        status: "filled",
        tableCount: 1,
      },
      {
        key: "cvd-01|2026-05-09T00:00|2026-05-10T00:00|수집값",
        start: "2026-05-09T00:00",
        end: "2026-05-10T00:00",
        category: "수집값",
        status: "pending",
        tableCount: 0,
        requestKey: "cvd01_collected_0509",
      },
    ],
  },
  {
    id: "eq-etch-01",
    equipment: "ETCH-01",
    line: "L2",
    descriptors: ["식각기 1호", "LAM Kiyo"],
    status: "가동",
    lines: [
      {
        key: "etch-01|2026-05-10T00:00|2026-05-11T00:00|수집값",
        start: "2026-05-10T00:00",
        end: "2026-05-11T00:00",
        category: "수집값",
        status: "filled",
        tableCount: 2,
      },
    ],
  },
  {
    id: "eq-cmp-02",
    equipment: "CMP-02",
    line: "L3",
    descriptors: [],
    status: null,
    lines: [
      {
        key: "cmp-02|2026-05-11T13:00|2026-05-11T15:30|Spec-out",
        start: "2026-05-11T13:00",
        end: "2026-05-11T15:30",
        category: "Spec-out",
        status: "pending",
        tableCount: 0,
        requestKey: "cmp02_specout_0511",
      },
    ],
  },
];

/* ── 왼쪽 데이터 패널에 뿌릴 목 스냅샷 ───────────────────────────────────
 * 오른쪽 줄을 누르면 "그 설비의 그 구간" 데이터만 남는 것을 보기 위한 시안용.
 * 필터 단위가 **설비 + 구간**인 것은 의도다 — Spec-out 줄을 눌러도 그 구간의
 * 맥락(수집값·이벤트)이 함께 보여야 하므로 category 로는 좁히지 않는다.
 */

export type MockSnapshotEntry = {
  equipment: string;
  /** `${start}|${end}` — 줄과 짝을 맞추는 키. */
  rangeKey: string;
  category: string;
  snapshot: DataSnapshot;
};

function mockSnapshot(
  id: string,
  label: string,
  columns: string[],
  rows: (string | null)[][],
  sourceSql: string,
  timeRange?: { start: string; end: string },
): DataSnapshot {
  return {
    id,
    queryKey: id,
    label,
    capturedAt: "2026-05-11T19:04:00.000Z",
    timeRange,
    columns,
    rows,
    contentHash: id.padEnd(64, "0"),
    included: true,
    warnings: [],
    sourceSql,
  };
}

export const MOCK_SNAPSHOTS: MockSnapshotEntry[] = [
  // CVD-01 · 05-11 09:00~18:00 — 수집값 3장
  {
    equipment: "CVD-01",
    rangeKey: "2026-05-11T09:00|2026-05-11T18:00",
    category: "수집값",
    snapshot: mockSnapshot(
      "mock_cvd_agg",
      "구간 측정 집계",
      ["CNT", "MEAN", "SD", "MINV", "MAXV", "ANOM"],
      [["412", "92.4", "2.77", "83.2", "103.5", "3"]],
      "SELECT COUNT(*) AS CNT, AVG(meas_val) AS MEAN FROM fdc_sensor_reading WHERE eqp_id = 'CVD-01'",
      { start: "2026-05-11T09:00", end: "2026-05-11T18:00" }
    ),
  },
  {
    equipment: "CVD-01",
    rangeKey: "2026-05-11T09:00|2026-05-11T18:00",
    category: "수집값",
    snapshot: mockSnapshot(
      "mock_cvd_eqp",
      "수집 설비",
      ["EQP_ID", "EQP_NAME", "MODEL_CD", "VENDOR", "USE_YN"],
      [["CVD-01", "증착기 1호", "CV-800", "AMAT", "Y"]],
      "SELECT eqp_id, eqp_name, model_cd, vendor, use_yn FROM fdc_equipment WHERE eqp_id = 'CVD-01'",
      { start: "2026-05-11T09:00", end: "2026-05-11T18:00" }
    ),
  },
  {
    equipment: "CVD-01",
    rangeKey: "2026-05-11T09:00|2026-05-11T18:00",
    category: "수집값",
    snapshot: mockSnapshot(
      "mock_cvd_evt",
      "수집 기간 설비 이벤트",
      ["D", "EVT_TYPE_CD", "EVT_LABEL"],
      [
        ["2026-05-11", "PM", "라인 점검"],
        ["2026-05-08", "SETUP", "레시피 변경"],
        ["2026-05-02", "PM", "정기 정비"],
      ],
      "SELECT TO_CHAR(evt_time,'YYYY-MM-DD') AS d, evt_type_cd, evt_label FROM fdc_setup_event WHERE eqp_id = 'CVD-01'",
      { start: "2026-05-11T09:00", end: "2026-05-11T18:00" }
    ),
  },
  // CVD-01 · 같은 구간 — Spec-out 1장 (다른 category, 같은 구간)
  {
    equipment: "CVD-01",
    rangeKey: "2026-05-11T09:00|2026-05-11T18:00",
    category: "Spec-out",
    snapshot: mockSnapshot(
      "mock_cvd_oos",
      "스펙 이탈 목록",
      ["READ_TIME", "MEAS_VAL", "LSL", "USL"],
      [
        ["2026-05-11 11:24", "103.5", "85.0", "100.0"],
        ["2026-05-11 13:02", "102.1", "85.0", "100.0"],
        ["2026-05-11 16:47", "83.2", "85.0", "100.0"],
      ],
      "SELECT read_time, meas_val, lsl, usl FROM fdc_sensor_reading WHERE oo_spec_yn = 'Y'",
      { start: "2026-05-11T09:00", end: "2026-05-11T18:00" }
    ),
  },
  // ETCH-01 · 05-10~05-11 — 2장
  {
    equipment: "ETCH-01",
    rangeKey: "2026-05-10T00:00|2026-05-11T00:00",
    category: "수집값",
    snapshot: mockSnapshot(
      "mock_etch_agg",
      "구간 측정 집계",
      ["CNT", "MEAN", "SD", "MINV", "MAXV", "ANOM"],
      [["1,204", "48.9", "1.12", "45.6", "52.3", "0"]],
      "SELECT COUNT(*) AS CNT, AVG(meas_val) AS MEAN FROM fdc_sensor_reading WHERE eqp_id = 'ETCH-01'",
      { start: "2026-05-10T00:00", end: "2026-05-11T00:00" }
    ),
  },
  {
    equipment: "ETCH-01",
    rangeKey: "2026-05-10T00:00|2026-05-11T00:00",
    category: "수집값",
    snapshot: mockSnapshot(
      "mock_etch_evt",
      "수집 기간 설비 이벤트",
      ["D", "EVT_TYPE_CD", "EVT_LABEL"],
      [["2026-05-10", "SETUP", "챔버 A 셋업"]],
      "SELECT TO_CHAR(evt_time,'YYYY-MM-DD') AS d, evt_type_cd, evt_label FROM fdc_setup_event WHERE eqp_id = 'ETCH-01'",
      { start: "2026-05-10T00:00", end: "2026-05-11T00:00" }
    ),
  },
];

/** 줄 키 → 그 줄(대기 포함). 없으면 null. */
export function findMockLineByKey(lineKey: string | null): EquipmentLine | null {
  const found = findMockLine(lineKey);
  return found ? found.line : null;
}

/** 줄 키 → 그 줄이 속한 설비·구간. 없으면 null. */
export function findMockLine(
  lineKey: string | null,
): { equipment: string; line: EquipmentLine } | null {
  if (!lineKey) return null;
  for (const card of MOCK_EQUIPMENT_CARDS) {
    const line = card.lines.find((l) => l.key === lineKey);
    if (line) return { equipment: card.equipment, line };
  }
  return null;
}

/**
 * 선택된 줄에 딸린 목 스냅샷 — 선택이 없으면 전부 보여준다(필터 해제 상태).
 *
 * 좁히는 기준은 **줄 그대로**(설비 + 구간 + category)다. 한 요청이 스킬 스텝
 * 수만큼 여러 표를 낳으므로 "관련 데이터 싹 다"는 그 줄 안에서 이미 성립한다 —
 * 구간까지만 좁히면 같은 구간의 다른 줄이 같은 목록을 보여 줄을 나눈 의미가 없다.
 */
export function visibleMockSnapshots(lineKey: string | null): DataSnapshot[] {
  const found = findMockLine(lineKey);
  if (!found) return MOCK_SNAPSHOTS.map((m) => m.snapshot);
  const rangeKey = `${found.line.start}|${found.line.end}`;
  return MOCK_SNAPSHOTS.filter(
    (m) =>
      m.equipment === found.equipment &&
      m.rangeKey === rangeKey &&
      m.category === found.line.category,
  ).map((m) => m.snapshot);
}

/** 왼쪽 패널이 상시로 묶어 보여줄 한 그룹. */
export type SnapshotGroupModel = {
  key: string;
  label: string;
  snapshots: DataSnapshot[];
};

/** 그룹 키 — 설비 + 구간 + category 가 한 묶음의 정체다. */
function groupKey(equipment: string, rangeKey: string, category: string): string {
  return `${equipment}|${rangeKey}|${category}`;
}

/** 오른쪽에서 고른 줄이 왼쪽의 어느 그룹인지. */
export function groupKeyForLine(lineKey: string | null): string | null {
  const found = findMockLine(lineKey);
  if (!found) return null;
  return groupKey(
    found.equipment,
    `${found.line.start}|${found.line.end}`,
    found.line.category,
  );
}

/**
 * 목 스냅샷을 상시 그룹으로 묶는다 — 좁혀져 있든 아니든 왼쪽은 늘 그룹 단위로
 * 보인다. 등장 순서를 유지해 화면이 요청 순서대로 쌓이게 한다.
 */
export const MOCK_GROUPS: SnapshotGroupModel[] = (() => {
  const byKey = new Map<string, SnapshotGroupModel>();
  for (const m of MOCK_SNAPSHOTS) {
    const key = groupKey(m.equipment, m.rangeKey, m.category);
    const [start, end] = m.rangeKey.split("|");
    const existing = byKey.get(key);
    if (existing) {
      existing.snapshots.push(m.snapshot);
      continue;
    }
    byKey.set(key, {
      key,
      label: `${m.equipment} · ${formatRange(start, end)} · ${m.category}`,
      snapshots: [m.snapshot],
    });
  }
  return [...byKey.values()];
})();

/**
 * 대기(pending) 줄과 짝을 이루는 **요청 카드** — 오른쪽에서 "요청만 나간 상태"라고
 * 말하려면 왼쪽 `요청받은 데이터`에 그 요청이 실제로 있어야 한다. 둘은 같은
 * 사건의 양면이라 목 데이터에서도 짝을 맞춘다.
 */
export const MOCK_REQUESTS: PendingRequest[] = [
  {
    request: {
      queryKey: "cvd01_collected_0509",
      label: "CVD-01 · 수집값",
      timeRange: { start: "2026-05-09T00:00", end: "2026-05-10T00:00" },
      sql: "SELECT COUNT(*) AS CNT, ROUND(AVG(meas_val), 2) AS MEAN, ROUND(STDDEV(meas_val), 2) AS SD\n  FROM fdc_sensor_reading\n WHERE eqp_id = 'CVD-01'\n   AND read_time BETWEEN TO_DATE('2026-05-09', 'YYYY-MM-DD') AND TO_DATE('2026-05-10', 'YYYY-MM-DD')",
      columns: ["CNT", "MEAN", "SD"],
    },
    originMessageId: "mock-msg-1",
    fulfilled: false,
  },
  {
    request: {
      queryKey: "cmp02_specout_0511",
      label: "CMP-02 · Spec-out",
      timeRange: { start: "2026-05-11T13:00", end: "2026-05-11T15:30" },
      sql: "SELECT read_time, meas_val, lsl, usl\n  FROM fdc_sensor_reading\n WHERE eqp_id = 'CMP-02' AND oo_spec_yn = 'Y'\n   AND read_time BETWEEN TO_DATE('2026-05-11 13:00', 'YYYY-MM-DD HH24:MI') AND TO_DATE('2026-05-11 15:30', 'YYYY-MM-DD HH24:MI')",
      columns: ["READ_TIME", "MEAS_VAL", "LSL", "USL"],
    },
    originMessageId: "mock-msg-1",
    fulfilled: false,
  },
];
