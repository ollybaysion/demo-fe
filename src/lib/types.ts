export type MessageRole = "user" | "assistant" | "error";

export type Message = {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: number;
};

/**
 * One row in the domain context table. Keys correspond to
 * `ContextColumn.key` from `src/config/contextColumns.ts`.
 *
 * All values are free-form strings. Empty string means the cell was
 * cleared by the user (still present in storage so row order is stable).
 */
export type ContextRow = {
  id: string;
  values: Record<string, string>;
};
