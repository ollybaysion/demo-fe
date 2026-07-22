/**
 * 요청 카드 예시 결과 — 클릭만으로 데이터 요청 왕복(요청 카드 → 등록 →
 * 다시 분석)을 걸어볼 수 있게 하는 캔드 데이터.
 *
 * SQL 을 실제로 실행할 DB 가 없는 자리(동작 확인·시연)에서는 "실행한 결과를
 * 붙여넣으세요"가 막다른 길이 된다. 기대 컬럼에 맞는 예시를 한 클릭으로
 * 채워 그 길을 잇는다. 값은 명백한 예시(PM1/PM2, S-000x)로 두어 실 데이터와
 * 헷갈리지 않게 한다.
 *
 * 키는 요청을 만드는 두 곳 — 백엔드 MockLlm 과 FE mock route — 의
 * REQUESTABLE queryKey 와 맞춘다. 시나리오 재생(데모 모드)에 끼우지 않는
 * 이유: 데모는 정해진 대사를 재생하는 것이라 요청 카드를 만들지 않는다.
 * 이 예시는 반대로 실 파이프라인을 그대로 태우는 자리에서만 쓰인다.
 */

/** 요청 카드 왕복을 확실히 여는 질문 — REQUESTABLE 트리거("센서 목록")를 포함. */
export const SNAPSHOT_DEMO_QUESTION = "챔버별 센서 목록 보여줘";

const SAMPLES: Record<string, string> = {
  sensor_list:
    "CHAMBER,SENSOR_ID,SENSOR_NAME\n" +
    "PM1,S-0001,챔버 온도\n" +
    "PM1,S-0002,챔버 압력\n" +
    "PM1,S-0004,RF 파워\n" +
    "PM2,S-0011,챔버 온도\n" +
    "PM2,S-0012,챔버 압력\n" +
    "PM2,S-0014,RF 파워\n",
  recipe_steps:
    "RECIPE_ID,STEP_NO,STEP_NAME,DURATION_SEC\n" +
    "RCP-A100,1,STABILIZE,30\n" +
    "RCP-A100,2,MAIN ETCH,120\n" +
    "RCP-A100,3,OVER ETCH,45\n" +
    "RCP-A100,4,PURGE,20\n",
};

/** 이 queryKey 에 채워 줄 예시가 있으면 돌려준다 — 없으면 버튼도 뜨지 않는다. */
export function sampleResultFor(queryKey: string): string | null {
  return SAMPLES[queryKey] ?? null;
}
