export type MessageRole = "user" | "assistant" | "error";

export type Message = {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: number;
};

/**
 * One row in the 설비 정보 table. Keys correspond to
 * `ContextColumn.key` from `src/config/contextColumns.ts`.
 *
 * Cell values are either:
 *   - `string` for single-value columns (e.g., 설비명)
 *   - `string[]` for `multi: true` columns (e.g., 챔버 / 센서명)
 *
 * Empty values are kept in storage so row order is stable across edits.
 */
export type ContextValue = string | string[];

export type ContextRow = {
  id: string;
  values: Record<string, ContextValue>;
};
