import type { Skill } from "@/lib/skills";

/**
 * mock 스킬 카탈로그 — 백엔드 없이 "설비 추가 → 스킬 선택" 왕복을 굴리기 위한 것.
 *
 * 앞의 둘(`fdc-trace-reading`/`fdc-explain-sensor`)은 BE classpath 번들 spec 을
 * **그대로 옮긴 것**이라 실 응답과 값이 같다. 나머지 28 개는 **고르기 UI 를 30 개
 * 규모에서 확인하려고 지어낸 것**이다 — 단위(센서·설비·레시피·로트) 분포와 인자
 * 개수만 그럴듯하게 맞췄고, SQL 은 형태만 갖춘 자리표시자다.
 *
 * ⚠ 실 데이터는 언제나 `BACKEND_URL` 을 붙여서 본다. 여기 값이 늘어난다고 백엔드
 * 스킬이 늘어나는 게 아니다.
 */

/**
 * 지어낸 스킬 하나의 씨앗 — 아래 `expand` 가 spec v3 카탈로그 항목으로 편다.
 *
 * 씨앗은 v2 어휘(`unit`·`focus`·`steps`)를 그대로 둔다: 이건 **저작 편의**지
 * 계약이 아니고, v3 로 펴는 일은 `expand` 하나가 맡는다. 계약이 어디인지는
 * `@/lib/skills` 의 `Skill` 타입이 말한다.
 */
type Seed = {
  name: string;
  unit: string;
  focus: string;
  table: string;
  /** [인자 이름, 설명] — 전부 required. 첫 인자가 그 스킬의 조회 대상이다. */
  args: Array<[string, string]>;
  /** [조달 제목, 알아내는 것] — bind 는 인자 순서대로 붙는다. */
  steps: Array<[string, string]>;
};

const SEEDS: Seed[] = [
  // ── 센서 (10) ─────────────────────────────────────────────
  {
    name: "fdc-sensor-drift",
    unit: "센서",
    focus: "측정 드리프트 추세",
    table: "FDC_SENSOR_READING",
    args: [
      ["snsr_id", "추세를 볼 센서 (예: S-0004)"],
      ["days", "되돌아볼 일수"],
    ],
    steps: [
      ["1단계 — 일자별 평균", "일자별 평균 추세"],
      ["2단계 — 기울기 추정", "드리프트 방향·크기"],
    ],
  },
  {
    name: "fdc-sensor-spec-out",
    unit: "센서",
    focus: "스펙 이탈 이력",
    table: "FDC_SENSOR_READING",
    args: [
      ["snsr_id", "이탈을 볼 센서"],
      ["start", "구간 시작"],
      ["end", "구간 끝"],
    ],
    steps: [
      ["1단계 — 이탈 건수", "이탈 빈도"],
      ["2단계 — 이탈 구간", "이탈이 몰린 시각대"],
    ],
  },
  {
    name: "fdc-sensor-calibration",
    unit: "센서",
    focus: "교정 이력",
    table: "FDC_SENSOR_CAL",
    args: [["snsr_id", "교정 이력을 볼 센서"]],
    steps: [
      ["1단계 — 교정 기록", "최근 교정 시점·값"],
      ["2단계 — 교정 전후 측정", "교정 효과"],
    ],
  },
  {
    name: "fdc-sensor-replace-history",
    unit: "센서",
    focus: "교체 이력",
    table: "FDC_SENSOR_HIST",
    args: [["snsr_id", "교체 이력을 볼 센서"]],
    steps: [["1단계 — 교체 기록", "교체 시점·사유"]],
  },
  {
    name: "fdc-sensor-peer-compare",
    unit: "센서",
    focus: "동종 센서 대비 편차",
    table: "FDC_SENSOR_READING",
    args: [
      ["snsr_id", "기준 센서"],
      ["start", "구간 시작"],
      ["end", "구간 끝"],
    ],
    steps: [
      ["1단계 — 기준 센서 통계", "기준 분포"],
      ["2단계 — 동종 센서 통계", "동종 대비 편차"],
    ],
  },
  {
    name: "fdc-sensor-missing-data",
    unit: "센서",
    focus: "결측 구간",
    table: "FDC_SENSOR_READING",
    args: [
      ["snsr_id", "결측을 볼 센서"],
      ["start", "구간 시작"],
      ["end", "구간 끝"],
    ],
    steps: [["1단계 — 수집 공백", "결측 구간 목록"]],
  },
  {
    name: "fdc-sensor-alarm-history",
    unit: "센서",
    focus: "알람 발생 이력",
    table: "FDC_ALARM",
    args: [
      ["snsr_id", "알람을 볼 센서"],
      ["days", "되돌아볼 일수"],
    ],
    steps: [
      ["1단계 — 알람 목록", "알람 종류·빈도"],
      ["2단계 — 알람 시각 분포", "알람이 몰린 시간대"],
    ],
  },
  {
    name: "fdc-sensor-threshold",
    unit: "센서",
    focus: "임계값 설정 이력",
    table: "FDC_SENSOR_LIMIT",
    args: [["snsr_id", "임계값을 볼 센서"]],
    steps: [["1단계 — 임계값 변경 기록", "현재·과거 임계값"]],
  },
  {
    name: "fdc-sensor-correlation",
    unit: "센서",
    focus: "센서 간 상관",
    table: "FDC_SENSOR_READING",
    args: [
      ["snsr_id", "기준 센서"],
      ["peer_snsr_id", "비교 센서"],
      ["start", "구간 시작"],
      ["end", "구간 끝"],
    ],
    steps: [["1단계 — 동시 구간 측정", "두 센서의 동시 분포"]],
  },
  {
    name: "fdc-sensor-uptime",
    unit: "센서",
    focus: "가동 상태 변경 이력",
    table: "FDC_SENSOR_HIST",
    args: [["snsr_id", "상태를 볼 센서"]],
    steps: [["1단계 — 사용 여부 변경", "활성/비활성 전환 시점"]],
  },

  // ── 설비 (9) ──────────────────────────────────────────────
  {
    name: "fdc-equipment-status",
    unit: "설비",
    focus: "현재 상태·구성",
    table: "FDC_EQUIPMENT",
    args: [["equipment", "상태를 볼 설비 ID (예: CVD-01)"]],
    steps: [
      ["1단계 — 설비 기본 정보", "설비 정체·상태"],
      ["2단계 — 소속 센서", "구성 센서 목록"],
    ],
  },
  {
    name: "fdc-equipment-downtime",
    unit: "설비",
    focus: "비가동 이력",
    table: "FDC_SETUP_EVENT",
    args: [
      ["equipment", "비가동을 볼 설비"],
      ["days", "되돌아볼 일수"],
    ],
    steps: [
      ["1단계 — 비가동 구간", "정지 시점·길이"],
      ["2단계 — 사유 분류", "정지 사유 분포"],
    ],
  },
  {
    name: "fdc-equipment-pm-history",
    unit: "설비",
    focus: "정기 점검(PM) 이력",
    table: "FDC_SETUP_EVENT",
    args: [["equipment", "PM 이력을 볼 설비"]],
    steps: [["1단계 — PM 기록", "최근 PM 시점·항목"]],
  },
  {
    name: "fdc-equipment-recipe-usage",
    unit: "설비",
    focus: "레시피 사용 분포",
    table: "FDC_RUN",
    args: [
      ["equipment", "사용 분포를 볼 설비"],
      ["days", "되돌아볼 일수"],
    ],
    steps: [["1단계 — 레시피별 실행 수", "레시피 사용 비중"]],
  },
  {
    name: "fdc-equipment-peer-compare",
    unit: "설비",
    focus: "동종 설비 대비 성능",
    table: "FDC_RUN",
    args: [
      ["equipment", "기준 설비"],
      ["peer_equipment", "비교 설비"],
      ["recipe", "비교할 레시피"],
    ],
    steps: [
      ["1단계 — 기준 설비 실행 통계", "기준 성능"],
      ["2단계 — 비교 설비 실행 통계", "동종 대비 성능"],
    ],
  },
  {
    name: "fdc-equipment-chamber-map",
    unit: "설비",
    focus: "챔버 구성",
    table: "FDC_CHAMBER",
    args: [["equipment", "챔버 구성을 볼 설비"]],
    steps: [["1단계 — 챔버 목록", "챔버 구성·상태"]],
  },
  {
    name: "fdc-equipment-alarm-top",
    unit: "설비",
    focus: "빈발 알람 상위",
    table: "FDC_ALARM",
    args: [
      ["equipment", "알람을 볼 설비"],
      ["days", "되돌아볼 일수"],
    ],
    steps: [["1단계 — 알람 상위 집계", "빈발 알람 순위"]],
  },
  {
    name: "fdc-equipment-throughput",
    unit: "설비",
    focus: "처리량 추세",
    table: "FDC_RUN",
    args: [
      ["equipment", "처리량을 볼 설비"],
      ["start", "구간 시작"],
      ["end", "구간 끝"],
    ],
    steps: [["1단계 — 일자별 처리량", "처리량 추세"]],
  },
  {
    name: "fdc-equipment-setup-change",
    unit: "설비",
    focus: "셋업 변경 이력",
    table: "FDC_SETUP_EVENT",
    args: [
      ["equipment", "셋업 변경을 볼 설비"],
      ["days", "되돌아볼 일수"],
    ],
    steps: [["1단계 — 셋업 변경 기록", "변경 시점·항목"]],
  },

  // ── 레시피 (6) ────────────────────────────────────────────
  {
    name: "fdc-recipe-steps",
    unit: "레시피",
    focus: "STEP 구성",
    table: "FDC_RECIPE_STEP",
    args: [["recipe", "구성을 볼 레시피 ID"]],
    steps: [["1단계 — STEP 목록", "STEP 순서·설정값"]],
  },
  {
    name: "fdc-recipe-change-history",
    unit: "레시피",
    focus: "변경 이력",
    table: "FDC_RECIPE_HIST",
    args: [["recipe", "변경 이력을 볼 레시피"]],
    steps: [["1단계 — 개정 기록", "개정 시점·변경 항목"]],
  },
  {
    name: "fdc-recipe-param-limits",
    unit: "레시피",
    focus: "파라미터 스펙 범위",
    table: "FDC_RECIPE_LIMIT",
    args: [["recipe", "스펙을 볼 레시피"]],
    steps: [["1단계 — 파라미터 상·하한", "스펙 범위"]],
  },
  {
    name: "fdc-recipe-run-summary",
    unit: "레시피",
    focus: "실행 결과 요약",
    table: "FDC_RUN",
    args: [
      ["recipe", "결과를 볼 레시피"],
      ["start", "구간 시작"],
      ["end", "구간 끝"],
    ],
    steps: [
      ["1단계 — 실행 건수·성공률", "실행 요약"],
      ["2단계 — 설비별 분포", "설비별 편차"],
    ],
  },
  {
    name: "fdc-recipe-equipment-fit",
    unit: "레시피",
    focus: "설비별 적합도",
    table: "FDC_RUN",
    args: [["recipe", "적합도를 볼 레시피"]],
    steps: [["1단계 — 설비별 이탈률", "설비별 적합도"]],
  },
  {
    name: "fdc-recipe-deviation",
    unit: "레시피",
    focus: "설정값 대비 실측 편차",
    table: "FDC_SENSOR_READING",
    args: [
      ["recipe", "편차를 볼 레시피"],
      ["equipment", "실행 설비"],
    ],
    steps: [["1단계 — 설정 대비 실측", "STEP별 편차"]],
  },

  // ── 로트 (3) ──────────────────────────────────────────────
  {
    name: "fdc-lot-trace",
    unit: "로트",
    focus: "처리 이력 추적",
    table: "FDC_LOT_HIST",
    args: [["lot_id", "추적할 로트 ID"]],
    steps: [
      ["1단계 — 처리 설비·시각", "경유 설비 이력"],
      ["2단계 — 각 단계 결과", "단계별 판정"],
    ],
  },
  {
    name: "fdc-lot-hold-history",
    unit: "로트",
    focus: "홀드 이력",
    table: "FDC_LOT_HOLD",
    args: [["lot_id", "홀드를 볼 로트"]],
    steps: [["1단계 — 홀드 기록", "홀드 시점·사유"]],
  },
  {
    name: "fdc-lot-yield",
    unit: "로트",
    focus: "수율 지표",
    table: "FDC_LOT_YIELD",
    args: [["lot_id", "수율을 볼 로트"]],
    steps: [["1단계 — 수율 집계", "수율·불량 분포"]],
  },
];

/** 조달 id — 씨앗에 없으므로 순번으로 짓는다(`q1`·`q2` …). 순서가 아니라 이름이다. */
function queryIdOf(index: number): string {
  return `q${index + 1}`;
}

function expand(seed: Seed): Skill {
  const argNames = seed.args.map(([key]) => key);
  const questions = [
    `${seed.args[0][0]} 의 ${seed.focus} 알려줘`,
    `이 ${seed.unit} ${seed.focus} 어때?`,
  ];
  return {
    skill: seed.name.replace(/-/g, "_"),
    name: seed.name,
    description: `특정 ${seed.unit}의 ${seed.focus}를 묻는 상황에서 호출한다 (${argNames.join("·")} 필요).`,
    questions,
    rephrasing: `이 ${seed.unit}의 ${seed.focus}가 어떠한지.`,
    argumentHint: argNames.map((a) => `{${a}}`).join(" "),
    anchorTable: seed.table,
    inputs: seed.args.map(([key, description]) => ({
      key,
      required: true,
      description,
    })),
    // v3 의 뒤집힌 화살표 — 알아낼 것이 먼저고, 조달이 그걸 채운다.
    needs: seed.steps.map(([, produces], i) => ({
      id: `n${i + 1}`,
      what: produces,
      filledBy: [{ query: queryIdOf(i), column: "VALUE" }],
    })),
    queries: seed.steps.map(([, produces], i) => {
      // 첫 조달은 인자를 전부 쓰고, 이후는 첫 인자(대상)만 쓴다.
      const used = i === 0 ? argNames : argNames.slice(0, 1);
      return {
        id: queryIdOf(i),
        // 라벨은 조회 이름이 아니라 그 조회가 답에 기여하는 것이다.
        label: produces,
        table: seed.table.toLowerCase(),
        sql: `SELECT * FROM ${seed.table.toLowerCase()}\n WHERE ${used
          .map((a) => `${a} = :${a}`)
          .join("\n   AND ")}`,
        argBinds: Object.fromEntries(used.map((a) => [a, a])),
        priorQueryBinds: [],
        binds: Object.fromEntries(
          used.map((a) => [a, { from: "arg" as const, arg: a }]),
        ),
      };
    }),
  };
}

/** 지어낸 28 개 — 고르기 UI 를 30 개 규모에서 보기 위한 것. */
export const GENERATED_SKILLS: Skill[] = SEEDS.map(expand);
