import { forwardOrMock } from "@/lib/backend";
import type { Skill } from "@/lib/skills";
import { GENERATED_SKILLS } from "./mock-catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/fdc/v1/skills — 사람이 고를 스킬 목록.
 *
 * BACKEND_URL 설정 시 그쪽으로 forward(진실원 = BE `SkillsController` 가 편
 * spec), 미설정 시 아래 mock. mock 은 BE classpath 번들 spec 두 개
 * (`fdc-trace-reading` / `fdc-explain-sensor`)를 그대로 옮긴 것이다 — 백엔드
 * 없이도 "설비 추가 → 스킬 선택" 왕복이 화면에서 돌아야 하기 때문. 스킬이 늘거나
 * 인자가 바뀌면 여기 값은 낡는다: **실 데이터는 BACKEND_URL 을 붙여서 본다.**
 */
const MOCK_SKILLS: Skill[] = [
  {
    skill: "fdc_trace_reading",
    name: "fdc-trace-reading",
    unit: "센서",
    focus: "센서 측정값",
    description:
      "특정 센서 측정값이 어떻게 만들어졌는지 묻는 상황에서 호출한다 (equipment·param_index·start·end 필요).",
    argumentHint: "{equipment} {param_index} {start} {end}",
    anchorTable: "FDC_SENSOR_READING",
    inputs: [
      {
        key: "equipment",
        required: true,
        description: "측정을 낸 설비 ID (예: CVD-01)",
      },
      {
        key: "param_index",
        required: true,
        description: "센서를 특정하는 파라미터 인덱스 — 센서 이름이 아니다",
      },
      { key: "start", required: true, description: "수집 구간 시작 시각" },
      { key: "end", required: true, description: "수집 구간 끝 시각" },
    ],
    steps: [
      {
        title: "1단계 — 구간 측정 집계",
        produces: "측정 분포(건수·평균·범위·이탈)",
        sql: `SELECT COUNT(*) AS CNT, ROUND(AVG(meas_val), 2) AS MEAN, ROUND(STDDEV(meas_val), 2) AS SD, ROUND(MIN(meas_val), 2) AS MINV, ROUND(MAX(meas_val), 2) AS MAXV, COUNT(CASE WHEN oo_spec_yn = 'Y' THEN 1 END) AS ANOM
  FROM fdc_sensor_reading
 WHERE eqp_id = :eqp AND param_index = :pidx
   AND read_time BETWEEN :start AND :end`,
        argBinds: {
          eqp: "equipment",
          pidx: "param_index",
          start: "start",
          end: "end",
        },
        priorStepBinds: [],
      },
      {
        title: "2단계 — 측정을 낸 설비",
        produces: "수집 설비",
        sql: `SELECT eqp_id, eqp_name, model_cd, vendor, use_yn
  FROM fdc_equipment WHERE eqp_id = :eqp`,
        argBinds: { eqp: "equipment" },
        priorStepBinds: [],
      },
      {
        title: "3단계 — 수집 기간의 설비 이벤트",
        produces: "수집 시점 설비 이벤트",
        sql: `SELECT TO_CHAR(evt_time, 'YYYY-MM-DD') AS d, evt_type_cd, evt_label
  FROM fdc_setup_event WHERE eqp_id = :eqp
 ORDER BY evt_time DESC FETCH FIRST 3 ROWS ONLY`,
        argBinds: { eqp: "equipment" },
        priorStepBinds: [],
      },
    ],
  },
  {
    skill: "fdc_explain_sensor",
    name: "fdc-explain-sensor",
    unit: "센서",
    focus: "정체·소속 설비·현재 상태",
    description:
      "특정 센서의 정체·소속 설비·현재 상태를 묻는 상황에서 호출한다 (snsr_id 필요).",
    argumentHint: "{snsr_id}",
    anchorTable: "FDC_SENSOR",
    inputs: [
      {
        key: "snsr_id",
        required: true,
        description: "설명할 센서를 특정하는 조회 키 (예: S-0004)",
      },
    ],
    steps: [
      {
        title: "1단계 — 센서 기본 정보",
        produces: "센서 정체·상태",
        sql: `SELECT snsr_id, eqp_id, snsr_type_cd, unit_cd, use_yn
  FROM fdc_sensor WHERE snsr_id = :id`,
        argBinds: { id: "snsr_id" },
        priorStepBinds: [],
      },
      {
        title: "2단계 — 소속 설비",
        produces: "소속 설비",
        sql: `SELECT eqp_id, eqp_name, model_cd, vendor, use_yn
  FROM fdc_equipment WHERE eqp_id = :eqp`,
        argBinds: {},
        priorStepBinds: ["eqp"],
      },
      {
        title: "3단계 — 설비 최근 이벤트 (정비 맥락)",
        produces: "최근 설비 이벤트",
        sql: `SELECT TO_CHAR(evt_time, 'YYYY-MM-DD') AS d, evt_type_cd, evt_label
  FROM fdc_setup_event WHERE eqp_id = :eqp
 ORDER BY evt_time DESC FETCH FIRST 3 ROWS ONLY`,
        argBinds: {},
        priorStepBinds: ["eqp"],
      },
    ],
  },
];

export async function GET(request: Request): Promise<Response> {
  return forwardOrMock(request, "/api/fdc/v1/skills", () =>
    // 번들 2개(실 spec 사본) + 지어낸 28개 = 30개. 고르기 UI 가 30개 규모에서
    // 버티는지 보려는 것이라 mock 에만 있다(BE 는 실제 가진 것만 편다).
    Response.json({ skills: [...MOCK_SKILLS, ...GENERATED_SKILLS] }),
  );
}
