/**
 * dev 전용 시드 — URL 파라미터로 저장소(IndexedDB)를 표본으로 채우고 param 을
 * 지운다. production 빌드에서는 통째로 꺼진다.
 *
 * - `?seed=20` — 다양한 모양의 스냅샷 20장(`?seed=0` 은 비움). 카드가 스무 장쯤
 *   쌓였을 때 목록이 어떻게 보이는지를 손으로 스무 번 등록하지 않고 보기 위한 것.
 * - `?msgs=days` — 메시지 표본 한 벌(`hour`·`days`·`spread`, `0` 은 비움).
 *   파일/붙여넣기 → N건 분할이 아직 없어, 다건 목록을 볼 수 있는 유일한 길이다.
 */

import { loadMessages, persistMessages, replaceAllSnapshots } from "@/lib/snapshot-idb";
import type { DataMessage, DataSnapshot } from "@/lib/types";

const KINDS: { name: string; cols: string[]; sql?: string }[] = [
  {
    name: "챔버별 센서 목록",
    cols: ["CHAMBER", "SENSOR_ID", "SENSOR_NAME"],
    sql: "SELECT chamber, sensor_id, sensor_name\n  FROM fdc_sensor_master\n WHERE equipment_id = :equipment_id",
  },
  {
    name: "레시피 STEP 구성",
    cols: ["RECIPE_ID", "STEP_NO", "STEP_NAME", "DURATION_SEC"],
    sql: "SELECT recipe_id, step_no, step_name, duration_sec\n  FROM fdc_recipe_step\n ORDER BY step_no",
  },
  {
    name: "지난주 알람 이력",
    cols: ["ALARM_ID", "EQPID", "SEVERITY", "OCCURRED_AT", "MESSAGE"],
  },
  { name: "설비 목록", cols: ["EQPID", "MODEL", "BAY", "STATE"] },
  {
    name: "PARAM 임계값",
    cols: ["PARAM_INDEX", "PARAM_NAME", "LO", "HI", "UNIT", "REV", "OWNER", "UPDATED_AT"],
    sql: "SELECT *\n  FROM fdc_param_threshold\n WHERE eqpid = :eqpid",
  },
  {
    name: "이벤트 타임라인",
    cols: ["TS", "EQPID", "EVENT", "DETAIL", "OPERATOR", "SHIFT", "NOTE", "CODE", "SRC", "DUR"],
  },
  // 상세 화면 극단 케이스 — 컬럼 스무 개짜리 넓은 표(가로 스크롤·sticky 헤더).
  {
    name: "랏 계측 이력 (넓은 표)",
    cols: [
      "LOT_ID", "WAFER_ID", "SLOT_NO", "EQPID", "CHAMBER", "RECIPE_ID", "STEP_NO",
      "PARAM_INDEX", "PARAM_NAME", "VALUE", "LO_LIMIT", "HI_LIMIT", "UNIT",
      "RESULT", "JUDGE_CODE", "START_TS", "END_TS", "OPERATOR", "SHIFT", "REMARK",
    ],
    sql: "SELECT *\n  FROM fdc_lot_metrology_hist\n WHERE lot_id = :lot_id",
  },
  // 상세 화면 극단 케이스 — 아주 긴 컬럼명 + 자유문 장문 값(셀 truncate·title 전문).
  {
    name: "알람 전문 로그",
    cols: ["ALARM_ID", "OCCURRED_AT", "SEVERITY", "FULL_MESSAGE", "PREVIOUS_MAINTENANCE_ACTION_SUMMARY_TEXT"],
  },
];

/** 자유문 장문 값 — 결정론(행 번호 기반)으로 만들되 셀 폭을 확실히 넘긴다. */
function longText(c: string, r: number): string {
  return (
    `${c}_${r + 1} — 챔버 상부 압력 편차 감지 후 레시피 스텝 재시도, ` +
    `히터 존 3 온도 드리프트 동반. 유지보수 이력 대조 결과 직전 PM 이후 ` +
    `누적 랏 수 임계 초과로 예방 점검 권고. `
  ).repeat(3).trim();
}

function buildSeed(count: number): DataSnapshot[] {
  return Array.from({ length: count }, (_, i) => {
    const kind = KINDS[i % KINDS.length];
    const rowCount = 5 + ((i * 37) % 480);
    const rows = Array.from({ length: rowCount }, (_, r) =>
      kind.cols.map((c, j) => {
        if (r % 7 === 3 && j === kind.cols.length - 1) return null;
        if (c.endsWith("MESSAGE") || c.endsWith("_TEXT")) return longText(c, r);
        return `${c}_${r + 1}`;
      }),
    );
    // `autoLabel` 과 같은 골격 — 자동 라벨을 단 카드가 목록에서 어떻게 보이는지 재현.
    const autoish = kind.cols.slice(0, 2).join(" · ");
    return {
      id: `snap-seed-${i}`,
      queryKey: `snap-seed-${i}`,
      label: i % 3 === 0 ? `${kind.name} #${i + 1}` : autoish,
      capturedAt: new Date(Date.now() - i * 5_400_000).toISOString(),
      columns: kind.cols,
      rows,
      contentHash: String(i % 100).padStart(2, "0").repeat(32),
      included: i % 4 !== 1,
      warnings: ["INTEGRITY_ABSENT"],
      // 쿼리를 아는 종류의 절반만 단다 — 칩 있는/없는 카드가 섞인 목록을 보기 위해.
      ...(kind.sql && i % 2 === 0 ? { sourceSql: kind.sql } : {}),
    };
  });
}

// ── 메시지 표본 ──────────────────────────────────────────────────────────

const EQPS = ["CVD-01", "ETCH-02", "PHOTO-07"];

/** 메시지 종류 — 제목이 서로 어떻게 구별되는지 보려고 같은 클래스를 섞어 둔다. */
const MSG_KINDS = [
  {
    className: "LotProcessResult",
    title: (n: number) => `LOT-${24100 + n} · R-88`,
    comment: (n: number) => `랏 LOT-${24100 + n} 정상 종료 — 챔버 온도 412.5℃`,
    fields: (n: number) => ({ lotId: `LOT-${24100 + n}`, recipeId: "R-88", result: "OK" }),
  },
  {
    className: "AlarmEvent",
    title: () => "ALARM · RF_POWER",
    comment: () => "RF 출력이 상한을 2.4% 넘었습니다",
    fields: (n: number) => ({ alarmId: `AL-${200 + (n % 30)}`, severity: "WARN", param: "RF_POWER" }),
  },
  {
    className: "LotProcessResult",
    title: (n: number) => `LOT-${24100 + n} · R-90`,
    comment: () => "압력 2.31Torr, 정상 종료",
    fields: (n: number) => ({ lotId: `LOT-${24100 + n}`, recipeId: "R-90", result: "OK" }),
  },
  {
    className: "StepChange",
    title: (n: number) => `STEP ${1 + (n % 6)} → ${2 + (n % 6)}`,
    comment: () => "레시피 스텝 전환",
    fields: (n: number) => ({ stepNo: 1 + (n % 6), state: "RUN" }),
  },
];

const MSG_SAMPLES: Record<
  string,
  { count: number; seed: number; dates: string[]; hours: number[]; eqps: string[] }
> = {
  // 한 시간대 — 소수초로만 갈리는 줄들이 얼마나 읽히는지.
  hour: { count: 27, seed: 7, dates: ["2026-08-08"], hours: [11, 12], eqps: EQPS.slice(0, 2) },
  // 여러 날 — [시각] 축과 [날짜] 축이 정말 다른 화면인지(축 3개가 필요한지).
  days: {
    count: 34,
    seed: 21,
    dates: ["2026-08-08", "2026-08-07", "2026-08-06", "2026-08-01"],
    hours: [9, 10, 14, 15, 20],
    eqps: EQPS,
  },
  // 하루 안에 흩어진 시간대 — 공백 마커가 제 일을 하는지.
  spread: {
    count: 30,
    seed: 33,
    dates: ["2026-08-08"],
    hours: [0, 3, 6, 9, 13, 18, 22, 23],
    eqps: EQPS,
  },
};

/** 결정론 난수 — 표본이 매번 같아야 "지난번보다 나아졌나"를 비교할 수 있다. */
function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1103515245) + 12345) >>> 0) / 4294967296);
}

function buildMessageSeed(name: string): DataMessage[] {
  const spec = MSG_SAMPLES[name];
  if (!spec) return [];
  const rand = lcg(spec.seed);
  const pick = <T,>(xs: T[]): T => xs[Math.floor(rand() * xs.length)]!;
  const pad = (n: number, w = 2) => String(n).padStart(w, "0");

  const stamps = Array.from({ length: spec.count }, () => ({
    date: pick(spec.dates),
    time:
      `${pad(pick(spec.hours))}:${pad(Math.floor(rand() * 60))}:${pad(Math.floor(rand() * 60))}` +
      `.${pad(Math.floor(rand() * 1_000_000), 6)}`,
  })).sort((a, b) => (a.date + a.time < b.date + b.time ? 1 : -1));
  // 같은 초에 두 건 — 소수초 없이는 순서도 구별도 불가능한 자리를 표본에 심는다.
  if (stamps.length > 4) {
    stamps[4] = { date: stamps[3].date, time: stamps[3].time.slice(0, 8) + ".104223" };
    stamps[3] = { ...stamps[3], time: stamps[3].time.slice(0, 8) + ".104871" };
  }

  const now = Date.now();
  return stamps.map((stamp, i) => {
    const kind = MSG_KINDS[i % MSG_KINDS.length];
    const eqpId = pick(spec.eqps);
    const fields = { eqpId, eventTime: `${stamp.date}T${stamp.time}`, ...kind.fields(i) };
    const dump = `${kind.className}{${Object.entries(fields)
      .map(([k, v]) => `${k}=${v}`)
      .join(", ")}}`;
    return {
      id: `dmsg-seed-${i}`,
      label: kind.title(i),
      createdAt: new Date(now - i * 1000).toISOString(),
      raw: dump,
      json: fields,
      comment: kind.comment(i),
      eqpId,
      className: kind.className,
      occurredAt: `${stamp.date}T${stamp.time}`,
    };
  });
}

/**
 * 스토리지를 읽기 전에 호출 — seed·msgs param 이 있으면 쓰고 URL 에서 지운다.
 *
 * 스냅샷과 메시지는 각자의 훅이 따로 읽는다. 둘 다 이걸 먼저 기다리되 실제 시딩은
 * 한 번만 돌아야 하므로 약속을 기억해 둔다 — 안 그러면 늦게 읽는 쪽이 시딩 전
 * 빈 저장소를 보거나(경합), 지워진 param 때문에 시딩이 통째로 건너뛰어진다.
 */
let seeded: Promise<void> | null = null;

export function maybeApplyDevSeed(): Promise<void> {
  seeded ??= applyDevSeed();
  return seeded;
}

async function applyDevSeed(): Promise<void> {
  if (process.env.NODE_ENV === "production") return;
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  const raw = params.get("seed");
  const msgs = params.get("msgs");
  if (raw === null && msgs === null) return;

  if (raw !== null) {
    const count = Math.min(Math.max(Number.parseInt(raw, 10) || 0, 0), 100);
    // seed=0 → 빈 목록으로 교체 = 전부 비움(localStorage 세대까지 같이 지운다).
    await replaceAllSnapshots(count === 0 ? [] : buildSeed(count));
  }
  if (msgs !== null) {
    // 교체다 — 표본을 갈아 끼울 때마다 지난 표본이 섞이면 비교가 안 된다.
    await persistMessages(await loadMessages(), buildMessageSeed(msgs));
  }

  params.delete("seed");
  params.delete("msgs");
  const qs = params.toString();
  window.history.replaceState(
    null,
    "",
    window.location.pathname + (qs ? `?${qs}` : ""),
  );
}
