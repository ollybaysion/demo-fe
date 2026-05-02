"use client";

import type { ContextRow } from "@/lib/types";
import { ContextRowNested } from "./ContextRowNested";

type Props = {
  rows: ContextRow[];
  onEquipmentChange: (rowId: string, name: string) => void;
  onAddRow: () => void;
  onDeleteRow: (rowId: string) => void;
  onAddChamber: (rowId: string) => void;
  onSetChamberName: (rowId: string, chamberId: string, name: string) => void;
  onDeleteChamber: (rowId: string, chamberId: string) => void;
  onAddSensor: (rowId: string, chamberId: string) => void;
  onSetSensorName: (
    rowId: string,
    chamberId: string,
    sensorId: string,
    name: string,
  ) => void;
  onDeleteSensor: (rowId: string, chamberId: string, sensorId: string) => void;
  onReset: () => void;
};

export function ContextTable({
  rows,
  onEquipmentChange,
  onAddRow,
  onDeleteRow,
  onAddChamber,
  onSetChamberName,
  onDeleteChamber,
  onAddSensor,
  onSetSensorName,
  onDeleteSensor,
  onReset,
}: Props) {
  return (
    <div className="flex flex-col gap-md">
      <div className="flex flex-col gap-md">
        {rows.map((row) => (
          <ContextRowNested
            key={row.id}
            row={row}
            canDeleteRow={rows.length > 1}
            onEquipmentChange={(name) => onEquipmentChange(row.id, name)}
            onDeleteRow={() => onDeleteRow(row.id)}
            onAddChamber={() => onAddChamber(row.id)}
            onSetChamberName={(chamberId, name) =>
              onSetChamberName(row.id, chamberId, name)
            }
            onDeleteChamber={(chamberId) => onDeleteChamber(row.id, chamberId)}
            onAddSensor={(chamberId) => onAddSensor(row.id, chamberId)}
            onSetSensorName={(chamberId, sensorId, name) =>
              onSetSensorName(row.id, chamberId, sensorId, name)
            }
            onDeleteSensor={(chamberId, sensorId) =>
              onDeleteSensor(row.id, chamberId, sensorId)
            }
          />
        ))}
      </div>
      <div className="flex items-center justify-between gap-sm pt-sm border-t border-brand-hairline-soft">
        <button
          type="button"
          onClick={onAddRow}
          className="inline-flex items-center gap-xxs text-body-sm text-brand-primary hover:text-brand-primary-active focus:outline-none focus:ring-2 focus:ring-brand-primary/15 rounded-xs px-xxs py-xxs"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
          설비 추가
        </button>
        <button
          type="button"
          onClick={onReset}
          className="text-body-sm text-brand-muted hover:text-brand-ink focus:outline-none focus:ring-2 focus:ring-brand-primary/15 rounded-xs px-xxs py-xxs"
          title="현재 대화의 설비 정보를 모두 비웁니다"
        >
          초기화
        </button>
      </div>
    </div>
  );
}
