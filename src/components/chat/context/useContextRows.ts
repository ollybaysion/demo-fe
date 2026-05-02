"use client";

import { useCallback, useEffect, useState } from "react";
import { CONTEXT_COLUMNS } from "@/config/contextColumns";
import { readJson, writeJson } from "@/lib/storage";
import type { ContextRow, ContextValue } from "@/lib/types";

const STORAGE_KEY = "fdc-agent:context-rows";
const VIEW_KEY = "fdc-agent:context-view";

export type ContextView = "chips" | "nested";

function newId(): string {
  return `ctx-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function emptyRow(): ContextRow {
  const values: Record<string, ContextValue> = {};
  for (const col of CONTEXT_COLUMNS) {
    values[col.key] = col.multi ? [] : "";
  }
  return { id: newId(), values };
}

function defaultRows(): ContextRow[] {
  return [emptyRow()];
}

/**
 * Migrate persisted rows to the current schema:
 * - missing keys -> empty default
 * - shape mismatch (string when column is multi, vice versa) -> coerce
 */
function migrateRows(input: unknown): ContextRow[] | null {
  if (!Array.isArray(input)) return null;
  const out: ContextRow[] = [];
  for (const raw of input) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as { id?: unknown; values?: unknown };
    const values: Record<string, ContextValue> = {};
    const sourceValues =
      r.values && typeof r.values === "object"
        ? (r.values as Record<string, unknown>)
        : {};
    for (const col of CONTEXT_COLUMNS) {
      const v = sourceValues[col.key];
      if (col.multi) {
        if (Array.isArray(v)) {
          values[col.key] = v.filter((x): x is string => typeof x === "string");
        } else if (typeof v === "string" && v.trim().length > 0) {
          values[col.key] = [v];
        } else {
          values[col.key] = [];
        }
      } else {
        values[col.key] = typeof v === "string" ? v : "";
      }
    }
    out.push({
      id: typeof r.id === "string" ? r.id : newId(),
      values,
    });
  }
  return out.length > 0 ? out : null;
}

export function useContextRows() {
  const [rows, setRows] = useState<ContextRow[]>(defaultRows);
  const [view, setView] = useState<ContextView>("chips");

  // Hydrate from localStorage on mount only. SSR + client first paint
  // both render the default empty row to avoid hydration mismatch;
  // stored rows replace the default once mounted on the client.
  useEffect(() => {
    const stored = readJson<unknown>(STORAGE_KEY, null);
    const migrated = migrateRows(stored);
    if (migrated) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRows(migrated);
    }
    const storedView = readJson<ContextView | null>(VIEW_KEY, null);
    if (storedView === "chips" || storedView === "nested") {
      setView(storedView);
    }
  }, []);

  // Persist after every change (best-effort).
  useEffect(() => {
    writeJson(STORAGE_KEY, rows);
  }, [rows]);
  useEffect(() => {
    writeJson(VIEW_KEY, view);
  }, [view]);

  const setCell = useCallback(
    (rowId: string, key: string, value: ContextValue) => {
      setRows((prev) =>
        prev.map((r) =>
          r.id === rowId ? { ...r, values: { ...r.values, [key]: value } } : r,
        ),
      );
    },
    [],
  );

  const addRow = useCallback(() => {
    setRows((prev) => [...prev, emptyRow()]);
  }, []);

  const deleteRow = useCallback((rowId: string) => {
    setRows((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((r) => r.id !== rowId);
    });
  }, []);

  const reset = useCallback(() => {
    setRows(defaultRows());
  }, []);

  return { rows, view, setView, setCell, addRow, deleteRow, reset };
}
