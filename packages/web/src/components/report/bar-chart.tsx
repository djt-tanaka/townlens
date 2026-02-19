"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { CityScoreResult, IndicatorDefinition } from "@townlens/core";
import { getCityColor } from "@townlens/core";

interface ReportBarChartProps {
  readonly results: ReadonlyArray<CityScoreResult>;
  readonly definitions: ReadonlyArray<IndicatorDefinition>;
}

interface BarDataPoint {
  readonly indicator: string;
  readonly [cityName: string]: string | number;
}

/** CityScoreResult[] を Recharts BarChart 用のデータ形式に変換 */
export function transformToBarData(
  results: ReadonlyArray<CityScoreResult>,
  definitions: ReadonlyArray<IndicatorDefinition>,
): ReadonlyArray<BarDataPoint> {
  return definitions.map((def) => {
    const entry: Record<string, string | number> = { indicator: def.label };
    for (const result of results) {
      const score = result.choice.find((c) => c.indicatorId === def.id);
      entry[result.cityName] = score?.score ?? 0;
    }
    return entry as BarDataPoint;
  });
}

export function ReportBarChart({ results, definitions }: ReportBarChartProps) {
  const data = [...transformToBarData(results, definitions)];

  return (
    <ResponsiveContainer width="100%" height={Math.max(250, definitions.length * 50)}>
      <BarChart data={data} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
        <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
        <YAxis
          type="category"
          dataKey="indicator"
          width={120}
          tick={{ fontSize: 11 }}
        />
        {results.map((result, i) => (
          <Bar
            key={result.cityName}
            dataKey={result.cityName}
            fill={getCityColor(i)}
            barSize={16}
          />
        ))}
        <Tooltip />
        <Legend />
      </BarChart>
    </ResponsiveContainer>
  );
}
