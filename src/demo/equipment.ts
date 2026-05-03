/**
 * Mock equipment / chamber / sensor / peer 데이터 (#27 Phase 1).
 *
 * 칼럼은 데모용으로 col1~col10. Phase 2 에서 백엔드 API
 *   GET /api/equipment/:id
 *   GET /api/equipment/:id/peers
 * 와 같은 형태로 교체될 예정 — 그 시점에 칼럼명도 실제 도메인 필드로
 * 교체. UI는 lookup 함수만 호출하고 데이터 출처에 무지하도록 작성.
 */

export const COL_NAMES = [
  "col1",
  "col2",
  "col3",
  "col4",
  "col5",
  "col6",
  "col7",
  "col8",
  "col9",
  "col10",
] as const;

export type ChamberDetail = {
  id: string;
  values: string[]; // length === COL_NAMES.length
};

export type SensorDetail = {
  id: string;
  values: string[];
};

export type EquipmentDetail = {
  id: string;
  /** ContextRow.equipment 와 매칭되는 키. */
  name: string;
  /** peer(동종 설비) 매칭에만 쓰는 내부 키 — UI에 노출되지 않음. */
  model: string;
  values: string[];
  chambers: ChamberDetail[];
  sensors: SensorDetail[];
};

// 더미 행 생성: 접두사 기반으로 col1..col10 채우기. 행마다 값이 달라
// 보이도록 prefix 를 섞어 식별성만 유지.
function mkRow(prefix: string): string[] {
  return Array.from({ length: COL_NAMES.length }, (_, i) => `${prefix}-v${i + 1}`);
}

const ETCH: EquipmentDetail[] = [
  {
    id: "ETCH-01",
    name: "ETCH-01",
    model: "EtcherX-2000",
    values: mkRow("ETCH-01"),
    chambers: [
      { id: "ETCH-01-A", values: mkRow("ETCH-01-A") },
      { id: "ETCH-01-B", values: mkRow("ETCH-01-B") },
    ],
    sensors: [
      { id: "ETCH-01-APC", values: mkRow("ETCH-01-APC") },
      { id: "ETCH-01-RFF", values: mkRow("ETCH-01-RFF") },
    ],
  },
  {
    id: "ETCH-02",
    name: "ETCH-02",
    model: "EtcherX-2000",
    values: mkRow("ETCH-02"),
    chambers: [
      { id: "ETCH-02-A", values: mkRow("ETCH-02-A") },
      { id: "ETCH-02-B", values: mkRow("ETCH-02-B") },
    ],
    sensors: [
      { id: "ETCH-02-APC", values: mkRow("ETCH-02-APC") },
      { id: "ETCH-02-RFF", values: mkRow("ETCH-02-RFF") },
    ],
  },
  {
    id: "ETCH-03",
    name: "ETCH-03",
    model: "EtcherX-2000",
    values: mkRow("ETCH-03"),
    chambers: [
      { id: "ETCH-03-A", values: mkRow("ETCH-03-A") },
      { id: "ETCH-03-B", values: mkRow("ETCH-03-B") },
      { id: "ETCH-03-C", values: mkRow("ETCH-03-C") },
    ],
    sensors: [
      { id: "ETCH-03-TC1", values: mkRow("ETCH-03-TC1") },
      { id: "ETCH-03-APC", values: mkRow("ETCH-03-APC") },
    ],
  },
];

const CVD: EquipmentDetail[] = [
  {
    id: "CVD-01",
    name: "CVD-01",
    model: "VaporPro-1000",
    values: mkRow("CVD-01"),
    chambers: [
      { id: "CVD-01-A", values: mkRow("CVD-01-A") },
      { id: "CVD-01-B", values: mkRow("CVD-01-B") },
    ],
    sensors: [
      { id: "CVD-01-T", values: mkRow("CVD-01-T") },
      { id: "CVD-01-G", values: mkRow("CVD-01-G") },
    ],
  },
  {
    id: "CVD-02",
    name: "CVD-02",
    model: "VaporPro-1000",
    values: mkRow("CVD-02"),
    chambers: [
      { id: "CVD-02-A", values: mkRow("CVD-02-A") },
      { id: "CVD-02-B", values: mkRow("CVD-02-B") },
    ],
    sensors: [
      { id: "CVD-02-T", values: mkRow("CVD-02-T") },
      { id: "CVD-02-G", values: mkRow("CVD-02-G") },
    ],
  },
  {
    id: "CVD-03",
    name: "CVD-03",
    model: "VaporPro-1000",
    values: mkRow("CVD-03"),
    chambers: [
      { id: "CVD-03-A", values: mkRow("CVD-03-A") },
      { id: "CVD-03-B", values: mkRow("CVD-03-B") },
    ],
    sensors: [
      { id: "CVD-03-T", values: mkRow("CVD-03-T") },
      { id: "CVD-03-G", values: mkRow("CVD-03-G") },
    ],
  },
];

export const EQUIPMENT_DETAILS: readonly EquipmentDetail[] = [...ETCH, ...CVD];

export function getEquipmentDetail(name: string): EquipmentDetail | undefined {
  const trimmed = name.trim();
  if (!trimmed) return undefined;
  return EQUIPMENT_DETAILS.find((e) => e.name === trimmed);
}

/** 같은 모델의 다른 설비 (자기 자신 제외). */
export function getPeers(name: string): EquipmentDetail[] {
  const me = getEquipmentDetail(name);
  if (!me) return [];
  return EQUIPMENT_DETAILS.filter(
    (e) => e.model === me.model && e.id !== me.id,
  );
}

// ────────────────────────────────────────────────────────────────────
// Comparison v2 (#79) — Phase 1 mock
// ────────────────────────────────────────────────────────────────────
//
// 1:1 비교 (현재 설비 vs 단일 동종설비), post-setup 매칭 모드.
// 백엔드 미연결 단계에서 일관된 deterministic mock 을 제공.

export type SensorStats = {
  sensor: string;
  mean: number;
  stddev: number;
  max: number;
  min: number;
  anomalies: number;
};

export type CompareWindowDays = 1 | 7 | 30;

export type CompareSide = {
  equipmentId: string;
  /** ISO 형식 — 마지막 셋업/설비 변경 시점. */
  setupTime: string;
  /** post-setup 매칭으로 잡힌 run. null 이면 윈도우 내 매칭 run 없음. */
  matchedRun: { id: string; startTime: string; durationMin: number } | null;
  sensorStats: SensorStats[];
};

/**
 * 센서별 시계열 (#79 Phase 2). x축은 공정 시작 시점 기준 경과 분 (t=0).
 * key 는 각 설비 id — recharts 가 같은 key 를 두 series 로 쓰지 못하므로
 * UI 에서 series name 을 fold 한다.
 */
export type SensorSeriesPoint = {
  /** 경과 분 (정수). */
  t: number;
  /** equipment id 별 값. */
  [equipmentId: string]: number;
};

export type SensorSeries = {
  sensor: string;
  /** 데이터 포인트 (시간순). 각 point 에 두 설비 값 병합. */
  data: SensorSeriesPoint[];
};

export type CompareData = {
  recipe: string;
  windowDays: CompareWindowDays;
  current: CompareSide;
  baseline: CompareSide;
  /** 센서별 시계열 (#79 Phase 2). 매칭 run 이 한쪽이라도 없으면 빈 배열. */
  series: SensorSeries[];
};

export const COMPARE_RECIPES = ["RECIPE_X", "RECIPE_Y", "RECIPE_Z"] as const;
export const COMPARE_WINDOWS: readonly CompareWindowDays[] = [1, 7, 30];

const COMPARE_SENSORS: ReadonlyArray<{
  name: string;
  base: { mean: number; stddev: number; max: number; min: number };
}> = [
  { name: "APC_PRESSURE", base: { mean: 0.95, stddev: 0.04, max: 1.05, min: 0.85 } },
  { name: "RF_FORWARD", base: { mean: 1720, stddev: 25, max: 1780, min: 1650 } },
  { name: "TEMP_TC1", base: { mean: 243, stddev: 1.2, max: 247, min: 240 } },
  { name: "GAS_FLOW_SiH4", base: { mean: 200, stddev: 3, max: 210, min: 190 } },
];

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function offsetFor(equipmentId: string, recipe: string, sensor: string): number {
  // -0.12 ~ +0.12 — equipment/recipe/sensor 조합별 deterministic.
  const r = hash(equipmentId + "|" + recipe + "|" + sensor) % 100;
  return (r - 50) / 400;
}

function statsFor(
  equipmentId: string,
  recipe: string,
): SensorStats[] {
  return COMPARE_SENSORS.map(({ name, base }) => {
    const o = offsetFor(equipmentId, recipe, name);
    const mean = round(base.mean * (1 + o));
    const stddev = round(base.stddev * (1 + Math.abs(o) * 1.4));
    const max = round(base.max * (1 + Math.max(o, 0) * 1.2));
    const min = round(base.min * (1 + Math.min(o, 0) * 1.2));
    const anomalies = Math.max(0, Math.round(Math.abs(o) * 12));
    return { sensor: name, mean, stddev, max, min, anomalies };
  });
}

function round(v: number): number {
  // 작은 값(<10)은 소수 3자리, 중간 값(<100)은 1자리, 큰 값은 정수.
  if (v < 10) return Math.round(v * 1000) / 1000;
  if (v < 100) return Math.round(v * 10) / 10;
  return Math.round(v);
}

function setupTimeFor(equipmentId: string): string {
  // equipment 별로 deterministic — 4월 둘째~넷째 주 사이 임의 일자.
  const day = 10 + (hash("setup|" + equipmentId) % 18);
  const hh = (hash("h|" + equipmentId) % 14) + 7;
  const mm = (hash("m|" + equipmentId) % 4) * 15;
  return `2026-04-${pad2(day)}T${pad2(hh)}:${pad2(mm)}`;
}

function matchedRunFor(
  equipmentId: string,
  recipe: string,
  windowDays: CompareWindowDays,
): CompareSide["matchedRun"] {
  // 일부 (equipment + recipe + window) 조합은 "매칭 없음" — 좁은 window 예외 검증.
  const skip = hash("skip|" + equipmentId + recipe) % 7 === 0;
  if (skip && windowDays === 1) return null;
  const setupTs = new Date(setupTimeFor(equipmentId) + "Z").getTime();
  const offsetH =
    (hash("run|" + equipmentId + recipe) % (windowDays * 24 - 4)) + 2;
  const start = new Date(setupTs + offsetH * 3_600_000);
  const id = `RUN-${equipmentId}-${recipe}-${pad2(start.getUTCDate())}${pad2(start.getUTCHours())}`;
  const durationMin = 35 + (hash("dur|" + equipmentId + recipe) % 25);
  return { id, startTime: isoLocalMinute(start), durationMin };
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}
function isoLocalMinute(d: Date): string {
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}T${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}`;
}

/**
 * 센서 시계열 mock 생성 — deterministic. 각 설비/센서/recipe 별로
 * 약간 다른 패턴.
 */
function seriesFor(
  currentId: string,
  baselineId: string,
  recipe: string,
  durationMin: number,
): SensorSeries[] {
  // 1분 간격 — durationMin 까지. 너무 길어지지 않도록 cap.
  const points = Math.min(durationMin + 1, 90);
  return COMPARE_SENSORS.map(({ name, base }) => {
    const oc = offsetFor(currentId, recipe, name);
    const ob = offsetFor(baselineId, recipe, name);
    const data: SensorSeriesPoint[] = [];
    for (let t = 0; t < points; t++) {
      const phase = t / points;
      // STEP 형태로 ramp up → 평탄 → ramp down. 이상 위해 mid 에 살짝 spike.
      const shape =
        phase < 0.15
          ? phase / 0.15
          : phase > 0.85
            ? (1 - phase) / 0.15
            : 1;
      const wobbleC = Math.sin((t + hash(currentId + name)) / 4) * 0.02;
      const wobbleB = Math.sin((t + hash(baselineId + name)) / 4) * 0.02;
      const valueC = base.mean * shape * (1 + oc + wobbleC);
      const valueB = base.mean * shape * (1 + ob + wobbleB);
      data.push({
        t,
        [currentId]: round(valueC),
        [baselineId]: round(valueB),
      });
    }
    return { sensor: name, data };
  });
}

/**
 * 1:1 비교 mock. (#79 Phase 1 + Phase 2 — post-setup 모드)
 */
export function getCompareData(
  currentId: string,
  baselineId: string,
  recipe: string,
  windowDays: CompareWindowDays,
): CompareData {
  const currentRun = matchedRunFor(currentId, recipe, windowDays);
  const baselineRun = matchedRunFor(baselineId, recipe, windowDays);
  const dur = Math.min(
    currentRun?.durationMin ?? 0,
    baselineRun?.durationMin ?? 0,
  );
  return {
    recipe,
    windowDays,
    current: {
      equipmentId: currentId,
      setupTime: setupTimeFor(currentId),
      matchedRun: currentRun,
      sensorStats: statsFor(currentId, recipe),
    },
    baseline: {
      equipmentId: baselineId,
      setupTime: setupTimeFor(baselineId),
      matchedRun: baselineRun,
      sensorStats: statsFor(baselineId, recipe),
    },
    series:
      currentRun && baselineRun
        ? seriesFor(currentId, baselineId, recipe, dur)
        : [],
  };
}
