/**
 * dev 전용 스냅샷 시드 — URL 에 `?seed=20` 을 붙여 열면 다양한 모양의
 * 스냅샷 N개를 저장소(IndexedDB)에 채우고 param 을 지운다. `?seed=0` 은 비움.
 *
 * 카드가 스무 장쯤 쌓였을 때 목록이 어떻게 보이는지(밀도·스크롤·정렬 욕구)를
 * 손으로 스무 번 등록하지 않고 확인하기 위한 것. production 빌드에서는
 * 통째로 꺼진다.
 */

import { replaceAllSnapshots } from "@/lib/snapshot-idb";
import type { DataSnapshot } from "@/lib/types";

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
];

function buildSeed(count: number): DataSnapshot[] {
  return Array.from({ length: count }, (_, i) => {
    const kind = KINDS[i % KINDS.length];
    const rowCount = 5 + ((i * 37) % 480);
    const rows = Array.from({ length: rowCount }, (_, r) =>
      kind.cols.map((c, j) =>
        r % 7 === 3 && j === kind.cols.length - 1 ? null : `${c}_${r + 1}`,
      ),
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

/** 스토리지를 읽기 전에 호출 — seed param 이 있으면 쓰고 URL 에서 지운다. */
export async function maybeApplyDevSeed(): Promise<void> {
  if (process.env.NODE_ENV === "production") return;
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  const raw = params.get("seed");
  if (raw === null) return;

  const count = Math.min(Math.max(Number.parseInt(raw, 10) || 0, 0), 100);
  // seed=0 → 빈 목록으로 교체 = 전부 비움(localStorage 세대까지 같이 지운다).
  await replaceAllSnapshots(count === 0 ? [] : buildSeed(count));

  params.delete("seed");
  const qs = params.toString();
  window.history.replaceState(
    null,
    "",
    window.location.pathname + (qs ? `?${qs}` : ""),
  );
}
