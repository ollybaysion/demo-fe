/**
 * 설비 정보 트리 라벨 — UI / mock echo에서 공통으로 참조.
 *
 * 데이터 구조는 `src/lib/types.ts`의 ContextRow / ContextChamber /
 * ContextSensor 가 정한다 (설비 → 챔버 → 센서 고정 3단계).
 * 이 파일은 라벨/플레이스홀더만 모은다 — 추후 i18n 분리 지점.
 */

export const CONTEXT_LABELS = {
  equipment: {
    label: "설비명",
    placeholder: "예: ETCH-01",
  },
  chamber: {
    label: "챔버",
    placeholder: "예: A",
  },
  sensor: {
    // 개발 편의상 센서를 이름이 아닌 PARAM_INDEX(센서 파라미터 인덱스)로 입력받는다.
    // 데이터 구조상 키는 여전히 sensor 지만, 사용자에게 보이는 라벨/값은 PARAM_INDEX.
    label: "PARAM_INDEX",
    placeholder: "예: 5",
  },
} as const;
