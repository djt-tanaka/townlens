"use client";

import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type {
  IndicatorDefinition,
  IndicatorStarRating,
} from "@townlens/core";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface CityRadarChartProps {
  readonly indicators: ReadonlyArray<IndicatorDefinition>;
  readonly indicatorStars: ReadonlyArray<IndicatorStarRating>;
  readonly cityName: string;
}

interface RadarDataPoint {
  readonly indicator: string;
  readonly percentile: number;
}

/** 全国パーセンタイルをレーダーチャート用データに変換 */
function transformToRadarData(
  indicators: ReadonlyArray<IndicatorDefinition>,
  indicatorStars: ReadonlyArray<IndicatorStarRating>,
): ReadonlyArray<RadarDataPoint> {
  const starMap = new Map(indicatorStars.map((s) => [s.indicatorId, s]));

  return indicators
    .filter((def) => starMap.has(def.id))
    .map((def) => ({
      indicator: def.label,
      percentile: starMap.get(def.id)!.nationalPercentile,
    }));
}

/** 単一都市の全国パーセンタイルベースのレーダーチャート */
export function CityRadarChart({
  indicators,
  indicatorStars,
  cityName,
}: CityRadarChartProps) {
  const data = transformToRadarData(indicators, indicatorStars);

  if (data.length < 3) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">指標バランス（全国パーセンタイル）</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={320}>
          <RadarChart data={[...data]}>
            <PolarGrid stroke="var(--border)" />
            <PolarAngleAxis
              dataKey="indicator"
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            />
            <PolarRadiusAxis
              angle={30}
              domain={[0, 100]}
              tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
            />
            <Radar
              name={cityName}
              dataKey="percentile"
              stroke="#10b981"
              fill="#10b981"
              fillOpacity={0.2}
            />
            <Tooltip
              formatter={(value) => [
                `${Number(value).toFixed(1)}%`,
                "全国パーセンタイル",
              ]}
            />
          </RadarChart>
        </ResponsiveContainer>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          外側ほど全国上位（高パーセンタイル）
        </p>
      </CardContent>
    </Card>
  );
}
