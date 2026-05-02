"use client";

import { type ReactNode, useMemo, useState } from "react";
import {
  type EquipmentDetail,
  getEquipmentDetail,
  getPeers,
} from "@/demo/equipment";

/**
 * 컨텍스트 패널(#16)에서 한 단계 더 들어가는 70vw 슬라이드 패널 (#27).
 *
 * Phase 1: mock 데이터 (`@/demo/equipment`).
 * Phase 2: 백엔드 API (`/api/equipment/:id`, `.../peers`)로 교체.
 *
 * 위치: 우측 ContextPanel(320px)의 왼쪽에 fixed 으로 자리. translate-x로
 * 슬라이드 인. ContextPanel은 그대로 두고 그 안쪽으로 70vw 확장.
 */
type Props = {
  open: boolean;
  /** ContextRow.equipment 값 (기본 선택은 첫 행). */
  equipmentNames: string[];
  onClose: () => void;
};

export function EquipmentDetailPanel({
  open,
  equipmentNames,
  onClose,
}: Props) {
  // 상단: 현재 설비 선택 — 기본값은 #16 첫 행
  const [selectedName, setSelectedName] = useState<string>(
    equipmentNames[0] ?? "",
  );

  // equipmentNames가 바뀌면(reset 등) selection도 따라가게
  const effectiveSelected = useMemo(() => {
    if (equipmentNames.includes(selectedName)) return selectedName;
    return equipmentNames[0] ?? "";
  }, [equipmentNames, selectedName]);

  const detail = effectiveSelected
    ? getEquipmentDetail(effectiveSelected)
    : undefined;
  const peers = effectiveSelected ? getPeers(effectiveSelected) : [];

  const [peerName, setPeerName] = useState<string>("");
  const peerActual = peers.find((p) => p.id === peerName) ?? peers[0];

  return (
    <aside
      aria-label="설비 상세 정보 확장 패널"
      aria-hidden={!open}
      className={[
        // ContextPanel은 right: 0 ~ 320px 차지. 본 패널은 그 왼쪽.
        "fixed top-0 bottom-0 z-30",
        "transition-transform duration-200 ease-out",
        "bg-brand-canvas border-l border-brand-hairline shadow-md",
        "flex flex-col",
        open ? "translate-x-0" : "translate-x-full",
      ].join(" ")}
      style={{ right: "320px", width: "70vw" }}
    >
      <header className="px-lg py-md border-b border-brand-hairline-soft flex items-center justify-between gap-sm">
        <div>
          <h2 className="font-sans text-title-md text-brand-ink">
            설비 상세
          </h2>
          <p className="mt-xxs text-body-sm text-brand-muted">
            #16 패널 행 + 동종 설비 비교 (Phase 1 — mock data)
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="설비 상세 패널 닫기"
          title="닫기"
          className="shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-full text-brand-muted hover:bg-brand-ink-translucent-04 hover:text-brand-ink focus:outline-none focus:ring-2 focus:ring-brand-primary/15 transition-colors"
        >
          <XIcon />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-lg py-lg flex flex-col gap-xl">
        {/* 상단 — 현재 설비 상세 */}
        <DetailBlock
          label="현재 설비"
          options={equipmentNames}
          value={effectiveSelected}
          onChange={setSelectedName}
          detail={detail}
          emptyHint="조회할 설비가 없습니다. 컨텍스트 패널에서 설비를 입력해주세요."
        />

        {/* 하단 — 동종설비 비교 */}
        <DetailBlock
          label="동종설비 비교"
          options={peers.map((p) => p.id)}
          value={peerActual?.id ?? ""}
          onChange={setPeerName}
          detail={peerActual}
          emptyHint={
            !detail
              ? "현재 설비가 선택되지 않았습니다."
              : peers.length === 0
                ? "같은 모델의 다른 설비가 없습니다."
                : undefined
          }
        />
      </div>
    </aside>
  );
}

// ────────────────────────────────────────────────────────────────────
// DetailBlock — dropdown + 3 read-only tables
// ────────────────────────────────────────────────────────────────────

function DetailBlock({
  label,
  options,
  value,
  onChange,
  detail,
  emptyHint,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
  detail: EquipmentDetail | undefined;
  emptyHint?: string;
}) {
  return (
    <section className="flex flex-col gap-md">
      <header className="flex items-center gap-md flex-wrap">
        <h3 className="font-sans text-title-sm text-brand-muted shrink-0">
          {label}
        </h3>
        {options.length > 0 ? (
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="bg-brand-canvas text-brand-ink font-sans text-body-sm rounded-md border border-brand-hairline px-sm py-[6px] focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/15 transition-colors"
          >
            {options.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        ) : null}
      </header>

      {detail ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg">
          <Card title="설비 정보">
            <KeyValueGrid
              entries={[
                ["설비명", detail.name],
                ["모델", detail.model],
                ["제조사", detail.vendor],
                ["설치일", detail.installedAt],
                ["상태", detail.status],
              ]}
            />
          </Card>
          <Card title="챔버 정보">
            {detail.chambers.length === 0 ? (
              <Empty>등록된 챔버 없음</Empty>
            ) : (
              <Table
                columns={["챔버", "모델", "용량", "상태"]}
                rows={detail.chambers.map((c) => [
                  c.name,
                  c.model,
                  c.capacity,
                  c.status,
                ])}
              />
            )}
          </Card>
          <Card title="센서 정보">
            {detail.sensors.length === 0 ? (
              <Empty>등록된 센서 없음</Empty>
            ) : (
              <Table
                columns={["센서명", "타입", "범위", "단위"]}
                rows={detail.sensors.map((s) => [
                  s.name,
                  s.type,
                  s.range,
                  s.unit,
                ])}
              />
            )}
          </Card>
        </div>
      ) : (
        <Empty>{emptyHint ?? "정보 없음"}</Empty>
      )}
    </section>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <article className="rounded-md border border-brand-hairline bg-brand-canvas">
      <header className="px-md py-sm border-b border-brand-hairline-soft">
        <h4 className="font-sans text-caption text-brand-muted">{title}</h4>
      </header>
      <div className="p-md">{children}</div>
    </article>
  );
}

function KeyValueGrid({ entries }: { entries: Array<[string, string]> }) {
  return (
    <dl className="grid grid-cols-[max-content_1fr] gap-x-md gap-y-xs">
      {entries.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-caption text-brand-muted">{k}</dt>
          <dd className="text-body-sm text-brand-ink">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

function Table({
  columns,
  rows,
}: {
  columns: string[];
  rows: string[][];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-body-sm">
        <thead>
          <tr className="border-b border-brand-hairline">
            {columns.map((c) => (
              <th
                key={c}
                className="text-left font-sans text-caption text-brand-muted py-xxs px-xs"
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              className="border-b border-brand-hairline-soft last:border-b-0"
            >
              {row.map((cell, j) => (
                <td
                  key={j}
                  className="text-brand-ink py-xs px-xs align-top"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return (
    <p className="text-body-sm text-brand-muted-soft py-md">{children}</p>
  );
}

function XIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
