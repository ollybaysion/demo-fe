"use client";

import { type ReactNode, useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  COL_NAMES,
  COMPARE_RECIPES,
  COMPARE_WINDOWS,
  type AlarmEvent,
  type AlarmSeverity,
  type ChamberEvent,
  type ChamberEventType,
  type CompareData,
  type CompareSide,
  type CompareWindowDays,
  type EquipmentDetail,
  type SensorSeries,
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

      {/* 센서 시계열 겹침 차트 (#79 Phase 2) — 매칭 run 양쪽 모두에 데이터
          있을 때만 노출. x축은 공정 시작 시점 기준 경과 분(t=0). */}
      {data.series.length > 0 && (
        <Card>
          <h4 className="font-sans text-title-sm text-brand-ink mb-sm">
            센서 시계열 비교
          </h4>
          <p className="text-caption text-brand-muted mb-md">
            x = 공정 시작 시점 기준 경과 분 (t=0). 두 설비의 매칭 run 을
            같은 시점에 정렬해 추세 차이를 한눈에 확인.
          </p>
          <CompareSeriesGrid
            series={data.series}
            currentId={data.current.equipmentId}
            baselineId={data.baseline.equipmentId}
          />
        </Card>
      )}

      {/* 챔버 이벤트 lane (#79 Phase 2) — 같은 시간축 위에 두 설비의
          이벤트(setup / recipe_change / cleaning / maintenance) 표시. */}
      {(data.chamberEvents.current.length > 0 ||
        data.chamberEvents.baseline.length > 0) && (
        <Card>
          <h4 className="font-sans text-title-sm text-brand-ink mb-sm">
            챔버 이벤트 비교
          </h4>
          <CompareChamberEvents
            data={data}
          />
        </Card>
      )}

      {/* 설비 알람 lane (#79 Phase 2) — severity 색 + popover + 카운트
          매트릭스. */}
      {(data.alarms.current.length > 0 ||
        data.alarms.baseline.length > 0) && (
        <Card>
          <h4 className="font-sans text-title-sm text-brand-ink mb-sm">
            설비 알람 비교
          </h4>
          <CompareAlarms data={data} />
        </Card>
      )}
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

/**
 * 센서별 작은 line chart 그리드 (#79 Phase 2). 각 차트는 같은 시간축
 * 위에 현재 vs baseline 2 series. xl 미만 1열, xl 이상 2열.
 */
function CompareSeriesGrid({
  series,
  currentId,
  baselineId,
}: {
  series: SensorSeries[];
  currentId: string;
  baselineId: string;
}) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-md">
      {series.map((s) => (
        <CompareSeriesChart
          key={s.sensor}
          series={s}
          currentId={currentId}
          baselineId={baselineId}
        />
      ))}
    </div>
  );
}

function CompareSeriesChart({
  series,
  currentId,
  baselineId,
}: {
  series: SensorSeries;
  currentId: string;
  baselineId: string;
}) {
  return (
    <div className="rounded-md border border-brand-hairline bg-brand-canvas p-sm">
      <div className="text-body-sm text-brand-ink mb-xs font-medium">
        {series.sensor}
      </div>
      <div style={{ width: "100%", height: 180 }}>
        <ResponsiveContainer>
          <LineChart
            data={series.data}
            margin={{ top: 8, right: 16, bottom: 24, left: 8 }}
          >
            <CartesianGrid stroke="var(--color-brand-hairline-soft)" strokeDasharray="3 3" />
            <XAxis
              dataKey="t"
              tick={{ fontSize: 11, fill: "var(--color-brand-muted)" }}
              tickLine={false}
              label={{
                value: "경과 분",
                position: "insideBottom",
                offset: -8,
                style: { fontSize: 11, fill: "var(--color-brand-muted)" },
              }}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "var(--color-brand-muted)" }}
              tickLine={false}
              width={48}
            />
            <Tooltip
              contentStyle={{
                background: "var(--color-brand-canvas)",
                border: "1px solid var(--color-brand-hairline)",
                fontSize: 12,
              }}
              labelFormatter={(t) => `경과 ${t}분`}
            />
            <Line
              type="monotone"
              dataKey={currentId}
              stroke="var(--color-brand-primary)"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey={baselineId}
              stroke="var(--color-brand-accent-teal)"
              strokeWidth={2}
              strokeDasharray="4 3"
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center gap-md mt-xs text-caption text-brand-muted">
        <LegendDot color="var(--color-brand-primary)" /> 현재 ({currentId})
        <LegendDot color="var(--color-brand-accent-teal)" dashed />
        baseline ({baselineId})
      </div>
    </div>
  );
}

function LegendDot({ color, dashed }: { color: string; dashed?: boolean }) {
  return (
    <span
      aria-hidden
      style={{
        display: "inline-block",
        width: 16,
        height: 0,
        borderTopWidth: 2,
        borderTopStyle: dashed ? "dashed" : "solid",
        borderTopColor: color,
        verticalAlign: "middle",
      }}
    />
  );
}

// ────────────────────────────────────────────────────────────────────
// CompareChamberEvents (#79 Phase 2)
// ────────────────────────────────────────────────────────────────────

const CHAMBER_EVENT_COLORS: Record<ChamberEventType, string> = {
  setup: "var(--color-brand-accent-teal)",
  recipe_change: "var(--color-brand-primary)",
  cleaning: "var(--color-brand-accent-amber)",
  maintenance: "var(--color-brand-warning)",
  other: "var(--color-brand-muted)",
};

const CHAMBER_EVENT_LABELS: Record<ChamberEventType, string> = {
  setup: "Setup",
  recipe_change: "Recipe 변경",
  cleaning: "Cleaning",
  maintenance: "PM",
  other: "기타",
};

function CompareChamberEvents({ data }: { data: CompareData }) {
  const allTypeSet = new Set<ChamberEventType>();
  for (const e of data.chamberEvents.current) allTypeSet.add(e.type);
  for (const e of data.chamberEvents.baseline) allTypeSet.add(e.type);
  const allTypes: ChamberEventType[] = Array.from(allTypeSet);

  const [enabled, setEnabled] = useState<Set<ChamberEventType>>(
    () => new Set(allTypes),
  );
  // allTypes 가 바뀌면 enabled 동기화 (렌더 중 prev-state 비교)
  const [prevTypesKey, setPrevTypesKey] = useState(() => allTypes.join("|"));
  const typesKey = allTypes.join("|");
  if (typesKey !== prevTypesKey) {
    setPrevTypesKey(typesKey);
    setEnabled(new Set(allTypes));
  }

  const toggle = (t: ChamberEventType) =>
    setEnabled((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });

  const xMax = Math.max(
    data.current.matchedRun?.durationMin ?? 0,
    data.baseline.matchedRun?.durationMin ?? 0,
    ...data.chamberEvents.current.map((e) => e.end ?? e.start),
    ...data.chamberEvents.baseline.map((e) => e.end ?? e.start),
    10,
  );

  return (
    <div className="flex flex-col gap-sm">
      {/* 타입 필터 chip */}
      <div className="flex flex-wrap items-center gap-xs">
        {allTypes.map((t) => {
          const on = enabled.has(t);
          return (
            <button
              key={t}
              type="button"
              onClick={() => toggle(t)}
              className={[
                "inline-flex items-center gap-xxs px-sm py-xxs rounded-pill border text-caption transition-colors",
                on
                  ? "border-brand-hairline text-brand-ink bg-brand-canvas"
                  : "border-brand-hairline-soft text-brand-muted bg-brand-surface-soft",
              ].join(" ")}
              aria-pressed={on}
            >
              <span
                aria-hidden
                style={{
                  display: "inline-block",
                  width: 8,
                  height: 8,
                  borderRadius: 9999,
                  background: on ? CHAMBER_EVENT_COLORS[t] : "var(--color-brand-muted-soft)",
                }}
              />
              {CHAMBER_EVENT_LABELS[t]}
            </button>
          );
        })}
      </div>

      <EventLane
        label={`현재 (${data.current.equipmentId})`}
        events={data.chamberEvents.current.filter((e) => enabled.has(e.type))}
        xMax={xMax}
      />
      <EventLane
        label={`baseline (${data.baseline.equipmentId})`}
        events={data.chamberEvents.baseline.filter((e) => enabled.has(e.type))}
        xMax={xMax}
      />
    </div>
  );
}

function EventLane({
  label,
  events,
  xMax,
}: {
  label: string;
  events: ChamberEvent[];
  xMax: number;
}) {
  return (
    <div className="flex items-center gap-sm">
      <span className="w-32 shrink-0 text-caption text-brand-muted truncate">
        {label}
      </span>
      <div className="flex-1 relative h-7 rounded-sm bg-brand-surface-soft border border-brand-hairline-soft overflow-hidden">
        {events.map((e, i) => {
          const left = (e.start / xMax) * 100;
          const width = e.end !== undefined
            ? Math.max(((e.end - e.start) / xMax) * 100, 0.6)
            : 0.6;
          const isPoint = e.end === undefined;
          const color = CHAMBER_EVENT_COLORS[e.type];
          return (
            <div
              key={i}
              title={`${CHAMBER_EVENT_LABELS[e.type]} · ${e.label} · ${e.start}${e.end !== undefined ? `~${e.end}` : ""} 분`}
              className="absolute top-0 bottom-0"
              style={{
                left: `${left}%`,
                width: `${width}%`,
                background: isPoint ? "transparent" : color,
                opacity: isPoint ? 1 : 0.85,
                borderLeft: isPoint ? `2px solid ${color}` : undefined,
              }}
            >
              {!isPoint && (
                <span
                  className="absolute inset-0 flex items-center justify-start px-xxs whitespace-nowrap overflow-hidden text-caption"
                  style={{ color: "var(--color-brand-on-primary)" }}
                >
                  {e.label}
                </span>
              )}
            </div>
          );
        })}
        {/* x축 라벨 — 좌/우 끝 */}
        <span className="absolute left-1 bottom-0 text-[10px] text-brand-muted-soft pointer-events-none">
          0
        </span>
        <span className="absolute right-1 bottom-0 text-[10px] text-brand-muted-soft pointer-events-none">
          {xMax}분
        </span>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// CompareAlarms (#79 Phase 2)
// ────────────────────────────────────────────────────────────────────

const ALARM_SEVERITY_COLOR: Record<AlarmSeverity, string> = {
  info: "var(--color-brand-muted)",
  warning: "var(--color-brand-warning)",
  critical: "var(--color-brand-error)",
};

function CompareAlarms({ data }: { data: CompareData }) {
  const xMax = Math.max(
    data.current.matchedRun?.durationMin ?? 0,
    data.baseline.matchedRun?.durationMin ?? 0,
    ...data.alarms.current.map((a) => a.time),
    ...data.alarms.baseline.map((a) => a.time),
    10,
  );

  const [popover, setPopover] = useState<{
    side: "current" | "baseline";
    index: number;
  } | null>(null);

  const close = () => setPopover(null);

  return (
    <div className="flex flex-col gap-md">
      <div className="flex flex-col gap-sm">
        <AlarmLane
          label={`현재 (${data.current.equipmentId})`}
          alarms={data.alarms.current}
          xMax={xMax}
          activeIndex={popover?.side === "current" ? popover.index : null}
          onActivate={(i) => setPopover({ side: "current", index: i })}
        />
        <AlarmLane
          label={`baseline (${data.baseline.equipmentId})`}
          alarms={data.alarms.baseline}
          xMax={xMax}
          activeIndex={popover?.side === "baseline" ? popover.index : null}
          onActivate={(i) => setPopover({ side: "baseline", index: i })}
        />
      </div>

      {/* severity 범례 */}
      <div className="flex items-center gap-md text-caption text-brand-muted">
        <SeverityDot s="info" /> info
        <SeverityDot s="warning" /> warning
        <SeverityDot s="critical" /> critical
      </div>

      {/* popover — 활성 알람 상세 */}
      {popover && (
        <AlarmDetail
          alarm={
            popover.side === "current"
              ? data.alarms.current[popover.index]
              : data.alarms.baseline[popover.index]
          }
          equipmentId={
            popover.side === "current"
              ? data.current.equipmentId
              : data.baseline.equipmentId
          }
          onClose={close}
        />
      )}

      {/* 카운트 매트릭스 */}
      <AlarmMatrix data={data} />
    </div>
  );
}

function AlarmLane({
  label,
  alarms,
  xMax,
  activeIndex,
  onActivate,
}: {
  label: string;
  alarms: AlarmEvent[];
  xMax: number;
  activeIndex: number | null;
  onActivate: (i: number) => void;
}) {
  return (
    <div className="flex items-center gap-sm">
      <span className="w-32 shrink-0 text-caption text-brand-muted truncate">
        {label}
      </span>
      <div className="flex-1 relative h-7 rounded-sm bg-brand-surface-soft border border-brand-hairline-soft">
        {alarms.map((a, i) => {
          const left = (a.time / xMax) * 100;
          const color = ALARM_SEVERITY_COLOR[a.severity];
          const active = activeIndex === i;
          return (
            <button
              key={i}
              type="button"
              onClick={() => onActivate(i)}
              title={`${a.code} · ${a.label} · ${a.time}분`}
              className={[
                "absolute top-0 bottom-0 w-3 -ml-1.5 inline-flex items-center justify-center",
                "rounded-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30",
                active ? "bg-brand-ink-translucent-04" : "",
              ].join(" ")}
              style={{ left: `${left}%` }}
              aria-label={`알람 ${a.code} (${a.severity}) · ${a.time}분`}
            >
              <span
                aria-hidden
                style={{
                  display: "inline-block",
                  width: 0,
                  height: 0,
                  borderLeft: "5px solid transparent",
                  borderRight: "5px solid transparent",
                  borderBottom: `9px solid ${color}`,
                }}
              />
            </button>
          );
        })}
        <span className="absolute left-1 bottom-0 text-[10px] text-brand-muted-soft pointer-events-none">
          0
        </span>
        <span className="absolute right-1 bottom-0 text-[10px] text-brand-muted-soft pointer-events-none">
          {xMax}분
        </span>
      </div>
    </div>
  );
}

function SeverityDot({ s }: { s: AlarmSeverity }) {
  return (
    <span
      aria-hidden
      style={{
        display: "inline-block",
        width: 8,
        height: 8,
        borderRadius: 9999,
        background: ALARM_SEVERITY_COLOR[s],
        marginRight: 4,
      }}
    />
  );
}

function AlarmDetail({
  alarm,
  equipmentId,
  onClose,
}: {
  alarm: AlarmEvent;
  equipmentId: string;
  onClose: () => void;
}) {
  const rc = alarm.rootCause;
  return (
    <div className="rounded-md border border-brand-hairline bg-brand-canvas p-md flex flex-col gap-xxs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-xs">
          <SeverityDot s={alarm.severity} />
          <span className="font-sans text-body-sm text-brand-ink font-medium">
            {alarm.code}
          </span>
          <span className="text-caption text-brand-muted">
            ({alarm.severity})
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="알람 상세 닫기"
          className="text-caption text-brand-muted hover:text-brand-ink"
        >
          닫기
        </button>
      </div>
      <div className="text-body-sm text-brand-ink">{alarm.label}</div>
      <dl className="grid grid-cols-[max-content_1fr] gap-x-md gap-y-xxs text-caption font-mono">
        <dt className="text-brand-muted">설비</dt>
        <dd className="text-brand-ink">{equipmentId}</dd>
        <dt className="text-brand-muted">시각</dt>
        <dd className="text-brand-ink">경과 {alarm.time}분</dd>
        {rc?.chamber && (
          <>
            <dt className="text-brand-muted">챔버</dt>
            <dd className="text-brand-ink">{rc.chamber}</dd>
          </>
        )}
        {rc?.sensor && (
          <>
            <dt className="text-brand-muted">원인 센서</dt>
            <dd className="text-brand-ink">{rc.sensor}</dd>
          </>
        )}
        {rc?.condition && (
          <>
            <dt className="text-brand-muted">조건</dt>
            <dd className="text-brand-ink">{rc.condition}</dd>
          </>
        )}
        {rc?.value !== undefined && (
          <>
            <dt className="text-brand-muted">트리거 값</dt>
            <dd className="text-brand-ink">{rc.value}</dd>
          </>
        )}
      </dl>
    </div>
  );
}

function AlarmMatrix({ data }: { data: CompareData }) {
  const codeSet = new Set<string>();
  for (const a of data.alarms.current) codeSet.add(a.code);
  for (const a of data.alarms.baseline) codeSet.add(a.code);
  const matrix = Array.from(codeSet).map((code) => {
    const cur = data.alarms.current.filter((a) => a.code === code);
    const base = data.alarms.baseline.filter((a) => a.code === code);
    const firstCur = cur[0]?.time;
    const firstBase = base[0]?.time;
    let diffLabel = "같음";
    if (cur.length > 0 && base.length === 0) diffLabel = "현재만";
    else if (cur.length === 0 && base.length > 0) diffLabel = "baseline만";
    else if (cur.length !== base.length)
      diffLabel = `${cur.length > base.length ? "현재" : "baseline"} 더 많음`;
    return { code, curN: cur.length, baseN: base.length, firstCur, firstBase, diffLabel };
  });

  return (
    <div className="overflow-x-auto">
      <table className="text-body-sm font-mono w-full">
        <thead>
          <tr className="border-b border-brand-hairline text-caption text-brand-muted text-left">
            <th className="py-xxs px-md font-medium">알람 코드</th>
            <th className="py-xxs px-md font-medium">현재 횟수</th>
            <th className="py-xxs px-md font-medium">baseline 횟수</th>
            <th className="py-xxs px-md font-medium">차이</th>
            <th className="py-xxs px-md font-medium">첫 발생 (현재 → baseline)</th>
          </tr>
        </thead>
        <tbody>
          {matrix.map((row) => {
            const onlyOne = row.diffLabel === "현재만" || row.diffLabel === "baseline만";
            return (
              <tr
                key={row.code}
                className="border-b border-brand-hairline-soft last:border-b-0"
              >
                <td className="py-xs px-md text-brand-ink">{row.code}</td>
                <td className="py-xs px-md text-brand-ink">{row.curN}</td>
                <td className="py-xs px-md text-brand-ink">{row.baseN}</td>
                <td
                  className={[
                    "py-xs px-md whitespace-nowrap",
                    onlyOne
                      ? "bg-brand-error-soft text-brand-error font-medium"
                      : "text-brand-muted",
                  ].join(" ")}
                >
                  {row.diffLabel}
                </td>
                <td className="py-xs px-md text-brand-ink whitespace-nowrap">
                  {row.firstCur !== undefined ? `${row.firstCur}분` : "—"}
                  {" → "}
                  {row.firstBase !== undefined ? `${row.firstBase}분` : "—"}
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
