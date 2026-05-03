"use client";

import { useCallback, useEffect, useState } from "react";
import { readJson, writeJson } from "@/lib/storage";
import type { ContextChamber, ContextRow, ContextSensor } from "@/lib/types";

const STORAGE_KEY = "fdc-agent:context-rows";
const TIME_RANGE_KEY = "fdc-agent:context-time-range";

export type TimeRange = { start: string; end: string };

const EMPTY_RANGE: TimeRange = { start: "", end: "" };

function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function emptySensor(): ContextSensor {
  return { id: newId("sn"), name: "" };
}

function emptyChamber(): ContextChamber {
  return { id: newId("ch"), name: "", sensors: [] };
}

function emptyRow(): ContextRow {
  return { id: newId("eq"), equipment: "", chambers: [emptyChamber()] };
}

/**
 * 첫 로드(또는 reset) 시점에 채워두는 데모용 행. mock equipment.ts
 * 와 매칭되도록 ETCH-01 / 챔버 A / APC_PRESSURE 로 시작 — 사용자가
 * 별도 입력 없이도 컨텍스트/요약/상세 패널을 즉시 시연할 수 있게.
 */
function defaultRows(): ContextRow[] {
  return [
    {
      id: newId("eq"),
      equipment: "ETCH-01",
      chambers: [
        {
          id: newId("ch"),
          name: "A",
          sensors: [{ id: newId("sn"), name: "APC_PRESSURE" }],
        },
      ],
    },
  ];
}

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
 * Migrate persisted rows to the current 3-level tree shape.
 *
 * Tolerated source shapes:
 *  - Current tree: { equipment, chambers: [{ name, sensors: [{ name }] }] }
 *  - Prior PR-only flat: { values: { equipment, chamber: string[], sensor: string[] } }
 *    -> Each old chamber becomes a Chamber with empty sensors. Old flat
 *       sensor[] is attached to the FIRST chamber so user data isn't lost.
 *  - Earliest PR-only: values are all single strings -> single chamber.
 */
function migrateRows(input: unknown): ContextRow[] | null {
  if (!Array.isArray(input)) return null;
  const out: ContextRow[] = [];
  for (const raw of input) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;

    // Already the new tree shape
    if (
      typeof r.equipment === "string" &&
      Array.isArray(r.chambers)
    ) {
      const chambers: ContextChamber[] = (r.chambers as unknown[])
        .filter((c): c is Record<string, unknown> => !!c && typeof c === "object")
        .map((c) => {
          const sensorsArr = Array.isArray(c.sensors) ? c.sensors : [];
          const sensors: ContextSensor[] = sensorsArr
            .map((s): ContextSensor | null => {
              if (typeof s === "string") return { id: newId("sn"), name: s };
              if (s && typeof s === "object" && typeof (s as ContextSensor).name === "string") {
                const id =
                  typeof (s as ContextSensor).id === "string"
                    ? (s as ContextSensor).id
                    : newId("sn");
                return { id, name: (s as ContextSensor).name };
              }
              return null;
            })
            .filter((s): s is ContextSensor => s !== null);
          return {
            id: typeof c.id === "string" ? c.id : newId("ch"),
            name: typeof c.name === "string" ? c.name : "",
            sensors,
          };
        });
      out.push({
        id: typeof r.id === "string" ? r.id : newId("eq"),
        equipment: r.equipment,
        chambers: chambers.length > 0 ? chambers : [emptyChamber()],
      });
      continue;
    }

    // Legacy flat shape: { values: {...} }
    const values =
      r.values && typeof r.values === "object"
        ? (r.values as Record<string, unknown>)
        : null;
    if (values) {
      const equipment =
        typeof values.equipment === "string" ? values.equipment : "";
      const oldChambers: string[] = Array.isArray(values.chamber)
        ? (values.chamber as unknown[]).filter(
            (x): x is string => typeof x === "string",
          )
        : typeof values.chamber === "string"
          ? [values.chamber as string]
          : [];
      const oldSensors: string[] = Array.isArray(values.sensor)
        ? (values.sensor as unknown[]).filter(
            (x): x is string => typeof x === "string",
          )
        : typeof values.sensor === "string"
          ? [values.sensor as string]
          : [];

      const chambers: ContextChamber[] =
        oldChambers.length > 0
          ? oldChambers.map((name, idx) => ({
              id: newId("ch"),
              name,
              sensors:
                idx === 0
                  ? oldSensors.map((s) => ({ id: newId("sn"), name: s }))
                  : [],
            }))
          : [
              {
                id: newId("ch"),
                name: "",
                sensors: oldSensors.map((s) => ({ id: newId("sn"), name: s })),
              },
            ];

      out.push({
        id: typeof r.id === "string" ? r.id : newId("eq"),
        equipment,
        chambers,
      });
    }
  }
  return out.length > 0 ? out : null;
}

export function useContextRows() {
  const [rows, setRows] = useState<ContextRow[]>(defaultRows);
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
      setTimeRange(todayRange());
    }
  }, []);

  useEffect(() => {
    writeJson(STORAGE_KEY, rows);
  }, [rows]);
  useEffect(() => {
    if (timeRange.start === "" && timeRange.end === "") return;
    writeJson(TIME_RANGE_KEY, timeRange);
  }, [timeRange]);

  // ─── equipment row ───────────────────────────────────────────────
  const setEquipment = useCallback((rowId: string, name: string) => {
    setRows((prev) =>
      prev.map((r) => (r.id === rowId ? { ...r, equipment: name } : r)),
    );
  }, []);

  const addRow = useCallback(() => {
    setRows((prev) => [...prev, emptyRow()]);
  }, []);

  const deleteRow = useCallback((rowId: string) => {
    setRows((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((r) => r.id !== rowId);
    });
  }, []);

  // ─── chamber ─────────────────────────────────────────────────────
  const addChamber = useCallback((rowId: string) => {
    setRows((prev) =>
      prev.map((r) =>
        r.id === rowId ? { ...r, chambers: [...r.chambers, emptyChamber()] } : r,
      ),
    );
  }, []);

  const setChamberName = useCallback(
    (rowId: string, chamberId: string, name: string) => {
      setRows((prev) =>
        prev.map((r) =>
          r.id === rowId
            ? {
                ...r,
                chambers: r.chambers.map((c) =>
                  c.id === chamberId ? { ...c, name } : c,
                ),
              }
            : r,
        ),
      );
    },
    [],
  );

  const deleteChamber = useCallback(
    (rowId: string, chamberId: string) => {
      setRows((prev) =>
        prev.map((r) => {
          if (r.id !== rowId) return r;
          if (r.chambers.length <= 1) return r; // never empty out
          return { ...r, chambers: r.chambers.filter((c) => c.id !== chamberId) };
        }),
      );
    },
    [],
  );

  // ─── sensor ──────────────────────────────────────────────────────
  const addSensor = useCallback((rowId: string, chamberId: string) => {
    setRows((prev) =>
      prev.map((r) =>
        r.id === rowId
          ? {
              ...r,
              chambers: r.chambers.map((c) =>
                c.id === chamberId
                  ? { ...c, sensors: [...c.sensors, emptySensor()] }
                  : c,
              ),
            }
          : r,
      ),
    );
  }, []);

  const setSensorName = useCallback(
    (rowId: string, chamberId: string, sensorId: string, name: string) => {
      setRows((prev) =>
        prev.map((r) =>
          r.id === rowId
            ? {
                ...r,
                chambers: r.chambers.map((c) =>
                  c.id === chamberId
                    ? {
                        ...c,
                        sensors: c.sensors.map((s) =>
                          s.id === sensorId ? { ...s, name } : s,
                        ),
                      }
                    : c,
                ),
              }
            : r,
        ),
      );
    },
    [],
  );

  const deleteSensor = useCallback(
    (rowId: string, chamberId: string, sensorId: string) => {
      setRows((prev) =>
        prev.map((r) =>
          r.id === rowId
            ? {
                ...r,
                chambers: r.chambers.map((c) =>
                  c.id === chamberId
                    ? {
                        ...c,
                        sensors: c.sensors.filter((s) => s.id !== sensorId),
                      }
                    : c,
                ),
              }
            : r,
        ),
      );
    },
    [],
  );

  // ─── time range ──────────────────────────────────────────────────
  const setStart = useCallback((next: string) => {
    setTimeRange((prev) => ({ ...prev, start: next }));
  }, []);
  const setEnd = useCallback((next: string) => {
    setTimeRange((prev) => ({ ...prev, end: next }));
  }, []);

  // ─── batch setters (used by demo scenarios) ──────────────────────
  const replaceRows = useCallback((next: ContextRow[]) => {
    // Demo scenarios may pass an empty array — keep the table populated
    // with one empty row so the UI has something to render.
    setRows(next.length > 0 ? next : defaultRows());
  }, []);
  const replaceTimeRange = useCallback((next: TimeRange) => {
    setTimeRange(next);
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
    setEquipment,
    addRow,
    deleteRow,
    addChamber,
    setChamberName,
    deleteChamber,
    addSensor,
    setSensorName,
    deleteSensor,
    replaceRows,
    replaceTimeRange,
    reset,
  };
}
