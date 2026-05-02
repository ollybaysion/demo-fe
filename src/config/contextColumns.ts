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
    label: "센서명",
    placeholder: "예: APC_PRESSURE",
  },
} as const;
