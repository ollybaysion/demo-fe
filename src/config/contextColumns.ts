/**
 * 설비 정보 입력 표 — 컬럼 정의.
 *
 * 배열을 수정하면 입력 표가 자동 확장됩니다.
 * - `required: true` 컬럼은 비어 있으면 안 됨 (라벨에 * 표시).
 * - `multi: true` 컬럼은 한 셀에 여러 값을 가질 수 있음.
 *   값 타입: `string[]` (multi=true) / `string` (multi=false).
 */

export type ContextColumn = {
  key: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  multi?: boolean;
};

export const CONTEXT_COLUMNS: readonly ContextColumn[] = [
  {
    key: "equipment",
    label: "설비명",
    placeholder: "예: ETCH-01",
    required: true,
  },
  {
    key: "chamber",
    label: "챔버",
    placeholder: "예: A",
    multi: true,
  },
  {
    key: "sensor",
    label: "센서명",
    placeholder: "예: APC_PRESSURE",
    multi: true,
  },
] as const;
