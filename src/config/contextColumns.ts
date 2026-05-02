/**
 * Domain context table — column definitions.
 *
 * Adding a column here automatically extends the input table in the
 * Context Panel. The runtime treats every column as free-form text.
 *
 * Constraints:
 *  - The first entry in this array is always the "primary" column.
 *  - Setting `required: true` enables the "값 없음" indicator when the
 *    cell is empty (currently only used on the primary column).
 */

export type ContextColumn = {
  /** Stable key used inside ContextRow + localStorage */
  key: string;
  /** Header label (Korean) */
  label: string;
  /** Optional placeholder shown in empty cells */
  placeholder?: string;
  /** If true, empty cells render the "값 없음" indicator */
  required?: boolean;
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
  },
  {
    key: "sensor",
    label: "센서명",
    placeholder: "예: APC_PRESSURE",
  },
] as const;
