"use client";

import { type ReactNode, useMemo, useState } from "react";
import {
  COL_NAMES,
  COMPARE_RECIPES,
  COMPARE_WINDOWS,
  type CompareData,
  type CompareSide,
  type CompareWindowDays,
  type EquipmentDetail,
  type SensorStats,
  getCompareData,
  getEquipmentDetail,
  getPeers,
} from "@/demo/equipment";

/**
 * 컨텍스트 패널(#16)에서 한 단계 더 들어가는 70vw 슬라이드 패널 (#27).
 *
 * 카테고리 세그먼트(설비/챔버/센서) 중 한 가지만 표시. 양쪽 블록
 * (현재 설비 / 동종설비 비교)이 같은 카테고리를 공유해 1:1 비교가
 * 자연스럽게.
 *
 * Phase 1: mock 데이터 (`@/demo/equipment`).
 * Phase 2: 백엔드 API (`/api/equipment/:id`, `.../peers`)로 교체.
 */
type Props = {
  open: boolean;
  /** ContextRow.equipment 값 (기본 선택은 첫 행). */
  equipmentNames: string[];
  onClose: () => void;
};

type Category = "equipment" | "chamber" | "sensor" | "compare";

const CATEGORY_OPTIONS: ReadonlyArray<{ id: Category; label: string }> = [
  { id: "equipment", label: "설비 정보" },
  { id: "chamber", label: "챔버 정보" },
  { id: "sensor", label: "센서 정보" },
  { id: "compare", label: "설비 데이터 비교" },
];

export function EquipmentDetailPanel({
  open,
  equipmentNames,
  onClose,
}: Props) {
  const [selectedName, setSelectedName] = useState<string>(
    equipmentNames[0] ?? "",
  );
  const [category, setCategory] = useState<Category>("equipment");
  // 양쪽 블록(현재/동종)이 공유하는 칼럼 호버 상태. 한쪽 테이블의
  // 칼럼에 마우스를 올리면 반대편 같은 칼럼도 함께 강조됨.
  const [hoveredCol, setHoveredCol] = useState<number | null>(null);

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
        "fixed top-0 bottom-0 z-30",
        "bg-brand-canvas border-l border-brand-hairline shadow-md",
        "flex-col",
      ].join(" ")}
      // No transition: open/close are instant. Closing the slide felt
      // overdone vs the inline X click. Inner state (selected dropdown,
      // peer choice) is preserved because we toggle `display`, not unmount.
      style={{
        right: "320px",
        width: "70vw",
        display: open ? "flex" : "none",
      }}
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

      {/* 카테고리 세그먼트 — 양쪽 블록이 같은 카테고리를 공유 */}
      <div className="px-lg pt-md">
        <CategorySegment value={category} onChange={setCategory} />
      </div>

      <div
        className="flex-1 overflow-y-auto px-lg py-lg flex flex-col gap-xl"
        // 패널 영역에서 포인터가 빠져나가면 호버 강조 해제.
        onMouseLeave={() => setHoveredCol(null)}
      >
        {category === "compare" ? (
          <CompareView
            currentId={effectiveSelected}
            currentOptions={equipmentNames}
            onCurrentChange={setSelectedName}
            peerOptions={peers.map((p) => p.id)}
            peerId={peerActual?.id ?? ""}
            onPeerChange={setPeerName}
          />
        ) : (
          <>
            <DetailBlock
              label="현재 설비"
              options={equipmentNames}
              value={effectiveSelected}
              onChange={setSelectedName}
              detail={detail}
              category={category}
              hoveredCol={hoveredCol}
              onHoverCol={setHoveredCol}
              emptyHint="조회할 설비가 없습니다. 컨텍스트 패널에서 설비를 입력해주세요."
            />
            <DetailBlock
              label="동종설비 비교"
              options={peers.map((p) => p.id)}
              value={peerActual?.id ?? ""}
              onChange={setPeerName}
              detail={peerActual}
              category={category}
              hoveredCol={hoveredCol}
              onHoverCol={setHoveredCol}
              emptyHint={
                !detail
                  ? "현재 설비가 선택되지 않았습니다."
                  : peers.length === 0
                    ? "같은 모델의 다른 설비가 없습니다."
                    : undefined
              }
            />
          </>
        )}
      </div>
    </aside>
  );
}

// ────────────────────────────────────────────────────────────────────
// Category segment (tabs)
// ────────────────────────────────────────────────────────────────────

function CategorySegment({
  value,
  onChange,
}: {
  value: Category;
  onChange: (v: Category) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="상세 정보 카테고리"
      className="inline-flex rounded-md border border-brand-hairline bg-brand-surface-card p-[2px]"
    >
      {CATEGORY_OPTIONS.map((opt) => {
        const active = opt.id === value;
        return (
          <button
            key={opt.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.id)}
            className={[
              "px-md py-xs text-body-sm rounded-sm transition-colors",
              active
                ? "bg-brand-canvas text-brand-ink shadow-sm"
                : "text-brand-muted hover:text-brand-ink",
            ].join(" ")}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// DetailBlock — equipment dropdown + chosen-category view
// ────────────────────────────────────────────────────────────────────

function DetailBlock({
  label,
  options,
  value,
  onChange,
  detail,
  category,
  hoveredCol,
  onHoverCol,
  emptyHint,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
  detail: EquipmentDetail | undefined;
  category: Category;
  hoveredCol: number | null;
  onHoverCol: (col: number | null) => void;
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
        <CategoryView
          detail={detail}
          category={category}
          hoveredCol={hoveredCol}
          onHoverCol={onHoverCol}
        />
      ) : (
        <Empty>{emptyHint ?? "정보 없음"}</Empty>
      )}
    </section>
  );
}

function CategoryView({
  detail,
  category,
  hoveredCol,
  onHoverCol,
}: {
  detail: EquipmentDetail;
  category: Category;
  hoveredCol: number | null;
  onHoverCol: (col: number | null) => void;
}) {
  // 모든 카테고리가 동일한 와이드 테이블 레이아웃 — 칼럼은 항상 가로
  // 헤더로 나열. 설비는 1행, 챔버/센서는 항목당 1행.
  if (category === "equipment") {
    return (
      <Card>
        <WideTable
          columns={[...COL_NAMES]}
          rows={[{ key: detail.id, cells: detail.values }]}
          hoveredCol={hoveredCol}
          onHoverCol={onHoverCol}
        />
      </Card>
    );
  }

  if (category === "chamber") {
    if (detail.chambers.length === 0) {
      return <Empty>등록된 챔버 없음</Empty>;
    }
    return (
      <Card>
        <WideTable
          columns={[...COL_NAMES]}
          rows={detail.chambers.map((c) => ({ key: c.id, cells: c.values }))}
          hoveredCol={hoveredCol}
          onHoverCol={onHoverCol}
        />
      </Card>
    );
  }

  // sensor
  if (detail.sensors.length === 0) {
    return <Empty>등록된 센서 없음</Empty>;
  }
  return (
    <Card>
      <WideTable
        columns={[...COL_NAMES]}
        rows={detail.sensors.map((s) => ({ key: s.id, cells: s.values }))}
        hoveredCol={hoveredCol}
        onHoverCol={onHoverCol}
      />
    </Card>
  );
}

function Card({ children }: { children: ReactNode }) {
  return (
    <article className="rounded-md border border-brand-hairline bg-brand-canvas">
      <div className="p-md">{children}</div>
    </article>
  );
}

function WideTable({
  columns,
  rows,
  hoveredCol,
  onHoverCol,
}: {
  columns: string[];
  rows: Array<{ key: string; cells: string[] }>;
  hoveredCol: number | null;
  onHoverCol: (col: number | null) => void;
}) {
  return (
    <div className="overflow-x-auto">
      {/* font-mono: JetBrains Mono — 칼럼 헤더/값의 글자폭을 균일하게 */}
      <table className="text-body-sm font-mono">
        <thead>
          <tr className="border-b border-brand-hairline">
            {columns.map((c, j) => {
              const active = hoveredCol === j;
              return (
                <th
                  key={c}
                  onMouseEnter={() => onHoverCol(j)}
                  className={[
                    "text-left text-caption py-xxs px-md whitespace-nowrap transition-colors",
                    active
                      ? "bg-brand-primary/10 text-brand-ink"
                      : "text-brand-muted",
                  ].join(" ")}
                >
                  {c}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.key}
              className="border-b border-brand-hairline-soft last:border-b-0"
            >
              {row.cells.map((cell, j) => (
                <td
                  key={j}
                  onMouseEnter={() => onHoverCol(j)}
                  className={[
                    "text-brand-ink py-xs px-md whitespace-nowrap align-top transition-colors",
                    hoveredCol === j ? "bg-brand-primary/10" : "",
                  ].join(" ")}
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

// ────────────────────────────────────────────────────────────────────
// CompareView (#79 v2 — Phase 1)
// ────────────────────────────────────────────────────────────────────

/**
 * 1:1 비교 — 공정 컨텍스트(레시피 + 윈도우) 안에서 현재 설비 vs 단일
 * 동종설비의 센서 통계를 비교 표로 표시. 매칭 모드는 post-setup 단일.
 *
 * Phase 1 범위:
 *   - 레시피 / window 셀렉트 (mock 옵션)
 *   - 양쪽의 셋업 시점 + 매칭 run 메타
 *   - 센서 통계 표 (평균±σ / 최대 / 최소 / 이상 횟수) + 차이 % + 큰 차이
 *     셀 자동 강조
 */
function CompareView({
  currentId,
  currentOptions,
  onCurrentChange,
  peerOptions,
  peerId,
  onPeerChange,
}: {
  currentId: string;
  currentOptions: string[];
  onCurrentChange: (v: string) => void;
  peerOptions: string[];
  peerId: string;
  onPeerChange: (v: string) => void;
}) {
  const [recipe, setRecipe] = useState<string>(COMPARE_RECIPES[0]);
  const [windowDays, setWindowDays] = useState<CompareWindowDays>(7);

  const data = useMemo<CompareData | null>(() => {
    if (!currentId || !peerId) return null;
    return getCompareData(currentId, peerId, recipe, windowDays);
  }, [currentId, peerId, recipe, windowDays]);

  if (!currentId) {
    return (
      <Empty>
        조회할 설비가 없습니다. 컨텍스트 패널에서 설비를 먼저 입력해주세요.
      </Empty>
    );
  }
  if (!peerId) {
    return <Empty>같은 모델의 동종설비가 없어 비교할 수 없습니다.</Empty>;
  }
  if (!data) return null;

  return (
    <section className="flex flex-col gap-md">
      {/* 공정 컨텍스트 + 설비 셀렉트 */}
      <header className="flex flex-col gap-sm">
        <div className="flex flex-wrap items-center gap-md">
          <ComparePicker
            label="현재 설비"
            value={currentId}
            options={currentOptions}
            onChange={onCurrentChange}
          />
          <span className="text-body-sm text-brand-muted">vs</span>
          <ComparePicker
            label="동종설비 (baseline)"
            value={peerId}
            options={peerOptions}
            onChange={onPeerChange}
          />
        </div>
        <div className="flex flex-wrap items-center gap-md">
          <ComparePicker
            label="레시피"
            value={recipe}
            options={[...COMPARE_RECIPES]}
            onChange={setRecipe}
          />
          <ComparePicker
            label="윈도우 (post-setup 이후)"
            value={String(windowDays)}
            options={COMPARE_WINDOWS.map(String)}
            onChange={(v) => setWindowDays(Number(v) as CompareWindowDays)}
            suffix="일"
          />
        </div>
      </header>

      {/* 양쪽 메타 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">
        <SideMeta side={data.current} title="현재 설비" />
        <SideMeta side={data.baseline} title="동종설비 (baseline)" />
      </div>

      {/* 통계 비교 표 */}
      <Card>
        <h4 className="font-sans text-title-sm text-brand-ink mb-sm">
          센서 통계 비교
        </h4>
        {data.current.matchedRun && data.baseline.matchedRun ? (
          <CompareStatsTable
            currentId={data.current.equipmentId}
            baselineId={data.baseline.equipmentId}
            current={data.current.sensorStats}
            baseline={data.baseline.sensorStats}
          />
        ) : (
          <p className="text-body-sm text-brand-muted">
            한쪽 이상에 매칭 run 이 없어 비교할 수 없습니다. 윈도우를
            늘리거나 레시피를 변경해보세요.
          </p>
        )}
      </Card>
    </section>
  );
}

function ComparePicker({
  label,
  value,
  options,
  onChange,
  suffix,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
  suffix?: string;
}) {
  return (
    <label className="flex items-center gap-xs text-body-sm">
      <span className="text-brand-muted">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-brand-canvas text-brand-ink font-sans text-body-sm rounded-md border border-brand-hairline px-sm py-[6px] focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/15 transition-colors"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
            {suffix ? ` ${suffix}` : ""}
          </option>
        ))}
      </select>
    </label>
  );
}

function SideMeta({ side, title }: { side: CompareSide; title: string }) {
  return (
    <Card>
      <h4 className="font-sans text-title-sm text-brand-ink">
        {title} — {side.equipmentId}
      </h4>
      <dl className="mt-xs grid grid-cols-[max-content_1fr] gap-x-md gap-y-xxs text-body-sm">
        <dt className="text-brand-muted">셋업 시점</dt>
        <dd className="text-brand-ink font-mono">{side.setupTime}</dd>
        <dt className="text-brand-muted">매칭 run</dt>
        <dd className="text-brand-ink font-mono">
          {side.matchedRun
            ? `${side.matchedRun.id} · ${side.matchedRun.startTime} · ${side.matchedRun.durationMin}분`
            : "데이터 없음 (셋업 후 윈도우 내 해당 공정 없음)"}
        </dd>
      </dl>
    </Card>
  );
}

function CompareStatsTable({
  currentId,
  baselineId,
  current,
  baseline,
}: {
  currentId: string;
  baselineId: string;
  current: SensorStats[];
  baseline: SensorStats[];
}) {
  const baseByName = new Map(baseline.map((b) => [b.sensor, b]));
  return (
    <div className="overflow-x-auto">
      <table className="text-body-sm font-mono w-full">
        <thead>
          <tr className="border-b border-brand-hairline text-caption text-brand-muted text-left">
            <th className="py-xxs px-md font-medium">센서</th>
            <th className="py-xxs px-md font-medium">현재 ({currentId})</th>
            <th className="py-xxs px-md font-medium">baseline ({baselineId})</th>
            <th className="py-xxs px-md font-medium">평균 차이</th>
            <th className="py-xxs px-md font-medium">이상 횟수 (현재 / baseline)</th>
          </tr>
        </thead>
        <tbody>
          {current.map((s) => {
            const b = baseByName.get(s.sensor);
            const diffPct =
              b && b.mean !== 0 ? ((s.mean - b.mean) / b.mean) * 100 : null;
            const sigDiff = diffPct !== null && Math.abs(diffPct) >= 5;
            const anomalyDiff = b ? s.anomalies - b.anomalies : 0;
            const sigAnomaly = Math.abs(anomalyDiff) >= 2;
            return (
              <tr
                key={s.sensor}
                className="border-b border-brand-hairline-soft last:border-b-0"
              >
                <td className="py-xs px-md text-brand-ink whitespace-nowrap">
                  {s.sensor}
                </td>
                <td className="py-xs px-md text-brand-ink whitespace-nowrap">
                  {s.mean} ±{s.stddev}{" "}
                  <span className="text-brand-muted">
                    ({s.min}~{s.max})
                  </span>
                </td>
                <td className="py-xs px-md text-brand-ink whitespace-nowrap">
                  {b ? (
                    <>
                      {b.mean} ±{b.stddev}{" "}
                      <span className="text-brand-muted">
                        ({b.min}~{b.max})
                      </span>
                    </>
                  ) : (
                    "—"
                  )}
                </td>
                <td
                  className={[
                    "py-xs px-md whitespace-nowrap",
                    sigDiff
                      ? diffPct! > 0
                        ? "bg-brand-warning/15 text-brand-ink font-medium"
                        : "bg-brand-accent-teal/15 text-brand-ink font-medium"
                      : "text-brand-ink",
                  ].join(" ")}
                >
                  {diffPct === null
                    ? "—"
                    : `${diffPct > 0 ? "+" : ""}${diffPct.toFixed(1)}%`}
                </td>
                <td
                  className={[
                    "py-xs px-md whitespace-nowrap",
                    sigAnomaly
                      ? "bg-brand-error-soft text-brand-error font-medium"
                      : "text-brand-ink",
                  ].join(" ")}
                >
                  {s.anomalies} / {b?.anomalies ?? "—"}
                </td>
              </tr>
            );
          })}
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
