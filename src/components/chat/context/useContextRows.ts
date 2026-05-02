"use client";

import { useCallback, useEffect, useState } from "react";
import { CONTEXT_COLUMNS } from "@/config/contextColumns";
import { readJson, writeJson } from "@/lib/storage";
import type { ContextRow, ContextValue } from "@/lib/types";

const STORAGE_KEY = "fdc-agent:context-rows";
const TIME_RANGE_KEY = "fdc-agent:context-time-range";

export type TimeRange = { start: string; end: string };

const EMPTY_RANGE: TimeRange = { start: "", end: "" };

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

/** Today's start (00:00) and end (23:59) in datetime-local format. */
function todayRange(): TimeRange {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return {
    start: `${yyyy}-${mm}-${dd}T00:00`,
    end: `${yyyy}-${mm}-${dd}T23:59`,
  };
}

function isValidRange(v: unknown): v is TimeRange {
  return (
    !!v &&
    typeof v === "object" &&
    typeof (v as TimeRange).start === "string" &&
    typeof (v as TimeRange).end === "string"
  );
}

/**
 * Tolerates older shapes (string -> [string] for multi cols, missing
 * keys, etc.) so prior PR testers don't lose their input.
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
  // Empty on SSR + first client render to avoid hydration mismatch with
  // today's date (timezone-dependent). Filled on mount via useEffect.
  const [timeRange, setTimeRange] = useState<TimeRange>(EMPTY_RANGE);

  useEffect(() => {
    const storedRows = readJson<unknown>(STORAGE_KEY, null);
    const migrated = migrateRows(storedRows);
    if (migrated) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRows(migrated);
    }
    const storedRange = readJson<unknown>(TIME_RANGE_KEY, null);
    if (isValidRange(storedRange)) {
      setTimeRange(storedRange);
    } else {
      // No prior value — default to today 00:00 ~ 23:59.
      setTimeRange(todayRange());
    }
  }, []);

  useEffect(() => {
    writeJson(STORAGE_KEY, rows);
  }, [rows]);
  useEffect(() => {
    // Don't persist the empty placeholder before hydration finishes.
    if (timeRange.start === "" && timeRange.end === "") return;
    writeJson(TIME_RANGE_KEY, timeRange);
  }, [timeRange]);

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

  const setStart = useCallback((next: string) => {
    setTimeRange((prev) => ({ ...prev, start: next }));
  }, []);

  const setEnd = useCallback((next: string) => {
    setTimeRange((prev) => ({ ...prev, end: next }));
  }, []);

  const reset = useCallback(() => {
    setRows(defaultRows());
    setTimeRange(todayRange());
  }, []);

  return {
    rows,
    timeRange,
    setStart,
    setEnd,
    setCell,
    addRow,
    deleteRow,
    reset,
  };
}
