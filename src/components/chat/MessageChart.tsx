"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Label,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type {
  MessageChart as MessageChartPayload,
  MessageChartReferenceLine,
} from "@/lib/types";

/**
 * 어시스턴트 메시지의 우측 gutter 에 paired 되는 차트 (#37).
 *
 * - v1 지원 타입: line / bar / area
 * - 색은 디자인 토큰(`brand-primary` / `accent-teal` / `accent-amber`)
 *   순환 — 시리즈가 셋 이상이면 재사용
 * - read-only — hover 툴팁만, zoom / pan 등 인터랙션 없음
 *
 * 백엔드(/api/fdc/v1/chat) 페이로드의 `chart` 필드를 그대로 받음.
 */

const SERIES_COLORS = [
  "#cc785c", // brand-primary
  "#5db8a6", // brand-accent-teal
  "#e8a55a", // brand-accent-amber
];

const CHART_HEIGHT = 240;

export function MessageChart({ chart }: { chart: MessageChartPayload }) {
  const { type, data, options } = chart;
  if (data.length === 0) return null;

  const firstRow = data[0];
  const allKeys = Object.keys(firstRow);
  const xKey = options?.xKey ?? allKeys[0];
  const yKeys =
    options?.yKeys && options.yKeys.length > 0
      ? options.yKeys
      : allKeys.filter((k) => k !== xKey);

  if (yKeys.length === 0) return null;

  const title = options?.title;
  const xLabel = options?.xLabel;
  const yLabel = options?.yLabel;
  const referenceLines = options?.referenceLines ?? [];

  return (
    <div className="w-full max-w-full border border-brand-ink bg-brand-canvas">
      {title && (
        <div className="px-md py-xs text-caption text-brand-muted border-b border-brand-ink">
          {title}
        </div>
      )}
      <div className="px-sm py-sm">
        <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
          {renderChart(
            type,
            data,
            xKey,
            yKeys,
            xLabel,
            yLabel,
            referenceLines,
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function renderChart(
  type: MessageChartPayload["type"],
  data: Record<string, unknown>[],
  xKey: string,
  yKeys: string[],
  xLabel?: string,
  yLabel?: string,
  referenceLines: MessageChartReferenceLine[] = [],
) {
  // 축 / 그리드 / 툴팁은 세 차트 타입이 공유 — 시리즈 컴포넌트만 분기.
  const axisStroke = "#6c6a64"; // brand-muted
  const gridStroke = "#e6dfd8"; // brand-hairline

  const commonProps = {
    data,
    margin: { top: 8, right: 12, left: 8, bottom: xLabel ? 24 : 8 },
  };

  const xAxis = (
    <XAxis
      dataKey={xKey}
      stroke={axisStroke}
      tick={{ fontSize: 11 }}
      tickMargin={4}
    >
      {xLabel && (
        <Label value={xLabel} position="bottom" offset={4} fontSize={11} />
      )}
    </XAxis>
  );
  const yAxis = (
    <YAxis stroke={axisStroke} tick={{ fontSize: 11 }} tickMargin={4}>
      {yLabel && (
        <Label
          value={yLabel}
          position="insideLeft"
          angle={-90}
          fontSize={11}
        />
      )}
    </YAxis>
  );
  const grid = <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" />;
  const tooltip = (
    <Tooltip
      contentStyle={{
        fontSize: 12,
        borderColor: "#141413",
        borderRadius: 0,
        backgroundColor: "#faf9f5",
      }}
      labelStyle={{ color: "#141413" }}
    />
  );

  // 수평(y) / 수직(x) reference 선들. 임계값 / 평균 / 이벤트 시점 등.
  const refLines = referenceLines.map((rl, i) => {
    const stroke = rl.color ?? "#e8a55a"; // brand-accent-amber default
    const strokeDasharray = rl.dashed ? "4 4" : undefined;
    const labelEl = rl.label
      ? {
          value: rl.label,
          fontSize: 11,
          fill: stroke,
          position: rl.axis === "x" ? ("top" as const) : ("right" as const),
        }
      : undefined;
    return rl.axis === "x" ? (
      <ReferenceLine
        key={`ref-${i}`}
        x={rl.value}
        stroke={stroke}
        strokeDasharray={strokeDasharray}
        label={labelEl}
      />
    ) : (
      <ReferenceLine
        key={`ref-${i}`}
        y={rl.value as number}
        stroke={stroke}
        strokeDasharray={strokeDasharray}
        label={labelEl}
      />
    );
  });

  if (type === "bar") {
    return (
      <BarChart {...commonProps}>
        {grid}
        {xAxis}
        {yAxis}
        {tooltip}
        {refLines}
        {yKeys.map((k, i) => (
          <Bar
            key={k}
            dataKey={k}
            fill={SERIES_COLORS[i % SERIES_COLORS.length]}
          />
        ))}
      </BarChart>
    );
  }

  if (type === "area") {
    return (
      <AreaChart {...commonProps}>
        {grid}
        {xAxis}
        {yAxis}
        {tooltip}
        {refLines}
        {yKeys.map((k, i) => {
          const c = SERIES_COLORS[i % SERIES_COLORS.length];
          return (
            <Area
              key={k}
              type="monotone"
              dataKey={k}
              stroke={c}
              fill={c}
              fillOpacity={0.25}
            />
          );
        })}
      </AreaChart>
    );
  }

  // line (default)
  return (
    <LineChart {...commonProps}>
      {grid}
      {xAxis}
      {yAxis}
      {tooltip}
      {refLines}
      {yKeys.map((k, i) => (
        <Line
          key={k}
          type="monotone"
          dataKey={k}
          stroke={SERIES_COLORS[i % SERIES_COLORS.length]}
          dot={false}
          strokeWidth={1.5}
        />
      ))}
    </LineChart>
  );
}
