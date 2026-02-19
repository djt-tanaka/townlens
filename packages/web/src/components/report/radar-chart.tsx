"use client";

import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import type { CityScoreResult, IndicatorDefinition } from "@townlens/core";
import { getCityColor } from "@townlens/core";

interface ReportRadarChartProps {
  readonly results: ReadonlyArray<CityScoreResult>;
  readonly definitions: ReadonlyArray<IndicatorDefinition>;
}

interface RadarDataPoint {
  readonly indicator: string;
  readonly [cityName: string]: string | number;
}

/** CityScoreResult[] を Recharts RadarChart 用のデータ形式に変換 */
export function transformToRadarData(
  results: ReadonlyArray<CityScoreResult>,
  definitions: ReadonlyArray<IndicatorDefinition>,
): ReadonlyArray<RadarDataPoint> {
  return definitions.map((def) => {
    const entry: Record<string, string | number> = { indicator: def.label };
    for (const result of results) {
      const score = result.choice.find((c) => c.indicatorId === def.id);
      entry[result.cityName] = score?.score ?? 0;
    }
    return entry as RadarDataPoint;
  });
}

export function ReportRadarChart({
  results,
  definitions,
}: ReportRadarChartProps) {
  const data = [...transformToRadarData(results, definitions)];

  return (
    <ResponsiveContainer width="100%" height={350}>
      <RadarChart data={data}>
        <PolarGrid stroke="var(--border)" />
        <PolarAngleAxis dataKey="indicator" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
        {results.map((result, i) => (
          <Radar
            key={result.cityName}
            name={result.cityName}
            dataKey={result.cityName}
            stroke={getCityColor(i)}
            fill={getCityColor(i)}
            fillOpacity={0.15}
          />
        ))}
        <Tooltip />
        <Legend />
      </RadarChart>
    </ResponsiveContainer>
  );
}
