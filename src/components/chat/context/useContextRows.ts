"use client";

import { useCallback, useEffect, useState } from "react";
import { CONTEXT_COLUMNS } from "@/config/contextColumns";
import { readJson, writeJson } from "@/lib/storage";
import type { ContextRow } from "@/lib/types";

const STORAGE_KEY = "fdc-agent:context-rows";

function newId(): string {
  return `ctx-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function emptyRow(): ContextRow {
  const values: Record<string, string> = {};
  for (const col of CONTEXT_COLUMNS) values[col.key] = "";
  return { id: newId(), values };
}

function defaultRows(): ContextRow[] {
  return [emptyRow()];
}

export function useContextRows() {
  const [rows, setRows] = useState<ContextRow[]>(defaultRows);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage on mount only. SSR + client first paint
  // both render the default empty row to avoid hydration mismatch;
  // the stored rows replace the default once mounted on the client.
  // The lint rule `set-state-in-effect` doesn't have a built-in
  // exception for SSR-safe localStorage hydration, so disable here.
  useEffect(() => {
    const stored = readJson<ContextRow[] | null>(STORAGE_KEY, null);
    if (stored && Array.isArray(stored) && stored.length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRows(stored);
    }
    setHydrated(true);
  }, []);

  // Persist after hydration so we don't overwrite stored rows with the
  // initial default on first render.
  useEffect(() => {
    if (!hydrated) return;
    writeJson(STORAGE_KEY, rows);
  }, [rows, hydrated]);

  const setCell = useCallback((rowId: string, key: string, value: string) => {
    setRows((prev) =>
      prev.map((r) =>
        r.id === rowId ? { ...r, values: { ...r.values, [key]: value } } : r,
      ),
    );
  }, []);

  const addRow = useCallback(() => {
    setRows((prev) => [...prev, emptyRow()]);
  }, []);

  const deleteRow = useCallback((rowId: string) => {
    setRows((prev) => {
      if (prev.length <= 1) return prev; // never empty out the table
      return prev.filter((r) => r.id !== rowId);
    });
  }, []);

  const reset = useCallback(() => {
    setRows(defaultRows());
  }, []);

  return { rows, setCell, addRow, deleteRow, reset };
}
