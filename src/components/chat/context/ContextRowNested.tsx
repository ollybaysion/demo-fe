"use client";

import { CONTEXT_LABELS } from "@/config/contextColumns";
import type { ContextChamber, ContextRow, ContextSensor } from "@/lib/types";

type Props = {
  row: ContextRow;
  canDeleteRow: boolean;
  onDeleteRow: () => void;
  onEquipmentChange: (name: string) => void;
  onAddChamber: () => void;
  onSetChamberName: (chamberId: string, name: string) => void;
  onDeleteChamber: (chamberId: string) => void;
  onAddSensor: (chamberId: string) => void;
  onSetSensorName: (chamberId: string, sensorId: string, name: string) => void;
  onDeleteSensor: (chamberId: string, sensorId: string) => void;
};

export function ContextRowNested(props: Props) {
  const {
    row,
    canDeleteRow,
    onDeleteRow,
    onEquipmentChange,
    onAddChamber,
    onSetChamberName,
    onDeleteChamber,
    onAddSensor,
    onSetSensorName,
    onDeleteSensor,
  } = props;

  return (
    <div className="rounded-md border border-brand-hairline bg-brand-canvas">
      {/* Equipment header */}
      <div className="flex items-center gap-sm p-md border-b border-brand-hairline-soft">
        <span className="text-caption text-brand-muted shrink-0">
          {CONTEXT_LABELS.equipment.label}
          <span className="text-brand-error ml-xxs">*</span>
        </span>
        <input
          type="text"
          value={row.equipment}
          placeholder={CONTEXT_LABELS.equipment.placeholder}
          onChange={(e) => onEquipmentChange(e.target.value)}
          className="flex-1 min-w-0 bg-transparent text-brand-ink placeholder:text-brand-muted-soft font-sans text-body-sm border-b border-transparent focus:border-brand-primary focus:outline-none transition-colors"
        />
        <RoundIconButton
          onClick={onDeleteRow}
          disabled={!canDeleteRow}
          ariaLabel="이 설비 행 삭제"
          title={canDeleteRow ? "이 설비 행 삭제" : "마지막 행은 삭제할 수 없습니다"}
        >
          <XIcon size={14} />
        </RoundIconButton>
      </div>

      {/* Chambers */}
      <div className="p-md flex flex-col gap-md">
        {row.chambers.map((chamber) => (
          <ChamberBlock
            key={chamber.id}
            chamber={chamber}
            canDelete={row.chambers.length > 1}
            onNameChange={(name) => onSetChamberName(chamber.id, name)}
            onDelete={() => onDeleteChamber(chamber.id)}
            onAddSensor={() => onAddSensor(chamber.id)}
            onSetSensorName={(sensorId, name) =>
              onSetSensorName(chamber.id, sensorId, name)
            }
            onDeleteSensor={(sensorId) =>
              onDeleteSensor(chamber.id, sensorId)
            }
          />
        ))}
        <button
          type="button"
          onClick={onAddChamber}
          className="self-start inline-flex items-center gap-xxs text-caption text-brand-primary hover:text-brand-primary-active focus:outline-none focus:ring-2 focus:ring-brand-primary/15 rounded-xs px-xxs py-xxs"
        >
          <PlusIcon size={12} />
          {CONTEXT_LABELS.chamber.label} 추가
        </button>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// ChamberBlock — chamber name + sensors list
// ────────────────────────────────────────────────────────────────────

function ChamberBlock({
  chamber,
  canDelete,
  onNameChange,
  onDelete,
  onAddSensor,
  onSetSensorName,
  onDeleteSensor,
}: {
  chamber: ContextChamber;
  canDelete: boolean;
  onNameChange: (name: string) => void;
  onDelete: () => void;
  onAddSensor: () => void;
  onSetSensorName: (sensorId: string, name: string) => void;
  onDeleteSensor: (sensorId: string) => void;
}) {
  return (
    <div className="rounded-sm bg-brand-surface-soft px-sm py-sm">
      {/* Chamber row */}
      <div className="flex items-center gap-xs">
        <span className="text-caption text-brand-muted shrink-0">
          {CONTEXT_LABELS.chamber.label}
        </span>
        <input
          type="text"
          value={chamber.name}
          placeholder={CONTEXT_LABELS.chamber.placeholder}
          onChange={(e) => onNameChange(e.target.value)}
          className="flex-1 min-w-0 bg-transparent text-brand-ink placeholder:text-brand-muted-soft font-sans text-body-sm border-b border-transparent focus:border-brand-primary focus:outline-none transition-colors"
        />
        <RoundIconButton
          onClick={onDelete}
          disabled={!canDelete}
          ariaLabel="이 챔버 삭제"
          title={canDelete ? "이 챔버 삭제" : "마지막 챔버는 삭제할 수 없습니다"}
          size="small"
        >
          <XIcon size={12} />
        </RoundIconButton>
      </div>

      {/* Sensors */}
      <div className="mt-xs ml-md">
        <p className="text-caption text-brand-muted-soft mb-xxs">
          {CONTEXT_LABELS.sensor.label}
        </p>
        {chamber.sensors.length === 0 ? (
          <p className="text-body-sm text-brand-muted-soft pl-sm">(없음)</p>
        ) : (
          <ul className="flex flex-col gap-xxs">
            {chamber.sensors.map((sensor) => (
              <SensorRow
                key={sensor.id}
                sensor={sensor}
                onNameChange={(name) => onSetSensorName(sensor.id, name)}
                onDelete={() => onDeleteSensor(sensor.id)}
              />
            ))}
          </ul>
        )}
        <button
          type="button"
          onClick={onAddSensor}
          className="mt-xxs inline-flex items-center gap-xxs text-caption text-brand-primary hover:text-brand-primary-active focus:outline-none focus:ring-2 focus:ring-brand-primary/15 rounded-xs px-xxs py-xxs"
        >
          <PlusIcon size={12} />
          {CONTEXT_LABELS.sensor.label} 추가
        </button>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// SensorRow — single sensor name + delete
// ────────────────────────────────────────────────────────────────────

function SensorRow({
  sensor,
  onNameChange,
  onDelete,
}: {
  sensor: ContextSensor;
  onNameChange: (name: string) => void;
  onDelete: () => void;
}) {
  return (
    <li className="flex items-center gap-xs">
      <span
        aria-hidden
        className="w-1 h-1 rounded-full bg-brand-muted-soft shrink-0"
      />
      <input
        type="text"
        value={sensor.name}
        placeholder={CONTEXT_LABELS.sensor.placeholder}
        onChange={(e) => onNameChange(e.target.value)}
        className="flex-1 min-w-0 bg-transparent text-brand-ink placeholder:text-brand-muted-soft font-sans text-body-sm border-b border-transparent focus:border-brand-primary focus:outline-none transition-colors"
      />
      <RoundIconButton
        onClick={onDelete}
        ariaLabel="이 PARAM_INDEX 삭제"
        title="이 PARAM_INDEX 삭제"
        size="tiny"
      >
        <XIcon size={10} />
      </RoundIconButton>
    </li>
  );
}

// ────────────────────────────────────────────────────────────────────
// Shared: round icon button + icons
// ────────────────────────────────────────────────────────────────────

function RoundIconButton({
  onClick,
  disabled,
  ariaLabel,
  title,
  size,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  ariaLabel: string;
  title: string;
  size?: "tiny" | "small";
  children: React.ReactNode;
}) {
  const dimension =
    size === "tiny" ? "w-5 h-5" : size === "small" ? "w-6 h-6" : "w-7 h-7";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      title={title}
      className={`shrink-0 inline-flex items-center justify-center ${dimension} rounded-full text-brand-muted hover:bg-brand-ink-translucent-04 hover:text-brand-error disabled:text-brand-muted-soft disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-brand-muted-soft focus:outline-none focus:ring-2 focus:ring-brand-primary/15 transition-colors`}
    >
      {children}
    </button>
  );
}

function XIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function PlusIcon({ size = 12 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
