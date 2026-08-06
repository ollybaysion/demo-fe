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
export const MOCK_SKILLS: Skill[] = [
  {
    skill: "fdc_trace_reading",
    name: "fdc-trace-reading",
    description:
      "특정 센서 측정값이 어떻게 만들어졌는지 묻는 상황에서 호출한다 (equipment·param_index·start·end 필요).",
    questions: [
      "CVD-01의 PARAM_INDEX 7, 5월 측정 어떻게 나온 거야?",
      "CVD-01 7번 파라미터 그 구간 측정 어땠어?",
      "그 구간 이탈 몇 건이야?",
    ],
    rephrasing:
      "주어진 설비·PARAM_INDEX·구간의 측정이 어떤 분포로 나왔는지(건수·평균·산포·범위·스펙 이탈 건수), 그 측정을 낸 설비가 무엇인지, 수집 기간에 그 설비에 어떤 이벤트가 있었는지. 센서는 이름이 아니라 PARAM_INDEX로 식별한다.",
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
    needs: [
      {
        id: "reading_count",
        what: "구간에 쌓인 측정 건수",
        filledBy: [{ query: "reading_stats", column: "CNT" }],
      },
      {
        id: "reading_center",
        what: "측정의 중심과 산포(평균·표준편차)",
        filledBy: [{ query: "reading_stats", column: "MEAN" }],
      },
      {
        id: "reading_range",
        what: "측정이 움직인 범위(최소·최대)",
        filledBy: [{ query: "reading_stats", column: "MINV" }],
      },
      {
        id: "spec_violations",
        what: "스펙 이탈 건수",
        filledBy: [{ query: "reading_stats", column: "ANOM" }],
      },
      {
        id: "source_equipment",
        what: "측정을 낸 설비의 정체(이름·모델)",
        filledBy: [{ query: "equipment_row", column: "EQP_NAME" }],
      },
      {
        id: "period_events",
        what: "수집 기간에 그 설비에 있었던 이벤트",
        filledBy: [{ query: "setup_event_rows", column: "EVT_LABEL" }],
      },
    ],
    queries: [
      {
        id: "reading_stats",
        label: "구간에 쌓인 측정 건수 외 3",
        table: "fdc_sensor_reading",
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
        priorQueryBinds: [],
        binds: {
          eqp: { from: "arg", arg: "equipment" },
          pidx: { from: "arg", arg: "param_index" },
          start: { from: "arg", arg: "start" },
          end: { from: "arg", arg: "end" },
        },
      },
      {
        id: "equipment_row",
        label: "측정을 낸 설비의 정체(이름·모델)",
        table: "fdc_equipment",
        sql: `SELECT eqp_id, eqp_name, model_cd, vendor, use_yn
  FROM fdc_equipment WHERE eqp_id = :eqp`,
        argBinds: { eqp: "equipment" },
        priorQueryBinds: [],
        binds: { eqp: { from: "arg", arg: "equipment" } },
      },
      {
        id: "setup_event_rows",
        label: "수집 기간에 그 설비에 있었던 이벤트",
        table: "fdc_setup_event",
        sql: `SELECT TO_CHAR(evt_time, 'YYYY-MM-DD') AS d, evt_type_cd, evt_label
  FROM fdc_setup_event WHERE eqp_id = :eqp
 ORDER BY evt_time DESC FETCH FIRST 3 ROWS ONLY`,
        argBinds: { eqp: "equipment" },
        priorQueryBinds: [],
        binds: { eqp: { from: "arg", arg: "equipment" } },
      },
    ],
  },
  {
    skill: "fdc_explain_sensor",
    name: "fdc-explain-sensor",
    description:
      "특정 센서의 정체·소속 설비·현재 상태를 묻는 상황에서 호출한다 (snsr_id 필요).",
    questions: [
      "S-0004 설명해줘",
      "S-0004 어느 설비 거야?",
      "S-0004 지금 쓰는 센서야?",
    ],
    rephrasing:
      "센서 S-0004가 무엇을 재는 센서이고(종류·단위) 어느 설비에 속하며 지금 쓰이고 있는지, 안 쓰이고 있다면 소속 설비 자체가 미사용인지, 그리고 그 설비에 최근 어떤 정비 이벤트가 있었는지.",
    argumentHint: "{snsr_id}",
    anchorTable: "FDC_SENSOR",
    inputs: [
      {
        key: "snsr_id",
        required: true,
        description: "설명할 센서를 특정하는 조회 키 (예: S-0004)",
      },
    ],
    needs: [
      {
        id: "measure_kind",
        what: "무엇을 재는 센서인지",
        filledBy: [{ query: "sensor_row", column: "SNSR_TYPE_CD" }],
      },
      {
        id: "measure_unit",
        what: "측정 단위",
        filledBy: [{ query: "sensor_row", column: "UNIT_CD" }],
      },
      {
        id: "sensor_active",
        what: "센서가 지금 쓰이고 있는지",
        filledBy: [{ query: "sensor_row", column: "USE_YN" }],
      },
      {
        id: "owner_equipment",
        what: "소속 설비",
        filledBy: [{ query: "sensor_row", column: "EQP_ID" }],
      },
      {
        id: "equipment_identity",
        what: "그 설비의 이름과 모델",
        filledBy: [{ query: "equipment_row", column: "EQP_NAME" }],
      },
      {
        id: "equipment_active",
        what: "설비 자체가 미사용인지 — 센서 비활성의 단서",
        when: "sensor_active = N",
        filledBy: [{ query: "equipment_row", column: "USE_YN" }],
      },
      {
        id: "recent_events",
        what: "그 설비의 최근 정비 이벤트",
        filledBy: [{ query: "setup_event_rows", column: "EVT_LABEL" }],
      },
    ],
    queries: [
      {
        id: "sensor_row",
        label: "무엇을 재는 센서인지 외 3",
        table: "fdc_sensor",
        sql: `SELECT snsr_id, eqp_id, snsr_type_cd, unit_cd, use_yn
  FROM fdc_sensor WHERE snsr_id = :id`,
        argBinds: { id: "snsr_id" },
        priorQueryBinds: [],
        binds: { id: { from: "arg", arg: "snsr_id" } },
      },
      {
        id: "equipment_row",
        label: "그 설비의 이름과 모델 외 1",
        table: "fdc_equipment",
        sql: `SELECT eqp_id, eqp_name, model_cd, vendor, use_yn
  FROM fdc_equipment WHERE eqp_id = :eqp`,
        argBinds: {},
        priorQueryBinds: ["eqp"],
        binds: { eqp: { from: "query", query: "sensor_row", column: "EQP_ID" } },
      },
      {
        id: "setup_event_rows",
        label: "그 설비의 최근 정비 이벤트",
        table: "fdc_setup_event",
        sql: `SELECT TO_CHAR(evt_time, 'YYYY-MM-DD') AS d, evt_type_cd, evt_label
  FROM fdc_setup_event WHERE eqp_id = :eqp
 ORDER BY evt_time DESC FETCH FIRST 3 ROWS ONLY`,
        argBinds: {},
        priorQueryBinds: ["eqp"],
        binds: { eqp: { from: "query", query: "sensor_row", column: "EQP_ID" } },
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
