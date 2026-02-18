import type {
  CityScoreResult,
  IndicatorDefinition,
  WeightPreset,
} from "@townlens/core";
import { getCityColor } from "@townlens/core";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ReportRadarChart } from "./radar-chart";
import { NarrativeBlock } from "./narrative-block";

interface ScoreSummaryProps {
  readonly results: ReadonlyArray<CityScoreResult>;
  readonly definitions: ReadonlyArray<IndicatorDefinition>;
  readonly preset: WeightPreset;
  readonly comparisonNarrative: string;
}

/** 順位に応じたラベルを返す */
function getRankLabel(rank: number): string {
  if (rank === 1) return "1位";
  if (rank === 2) return "2位";
  if (rank === 3) return "3位";
  return `${rank}位`;
}

/** 信頼度に応じたバリアントを返す */
function getConfidenceVariant(
  level: string,
): "default" | "secondary" | "outline" {
  if (level === "high") return "default";
  if (level === "medium") return "secondary";
  return "outline";
}

/** レポートのサマリーセクション。ランキング・レーダーチャート・比較ナラティブを表示 */
export function ScoreSummary({
  results,
  definitions,
  preset,
  comparisonNarrative,
}: ScoreSummaryProps) {
  const sortedResults = [...results].sort((a, b) => a.rank - b.rank);

  return (
    <section className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        {/* ランキングカード */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">
            ランキング（{preset.label}）
          </h2>
          {sortedResults.map((result, i) => (
            <Card key={result.cityName}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <span
                    className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white"
                    style={{ backgroundColor: getCityColor(i) }}
                  >
                    {getRankLabel(result.rank)}
                  </span>
                  <span>{result.cityName}</span>
                  <Badge
                    variant={getConfidenceVariant(result.confidence.level)}
                    className="ml-auto"
                  >
                    {result.confidence.level === "high"
                      ? "信頼度: 高"
                      : result.confidence.level === "medium"
                        ? "信頼度: 中"
                        : "信頼度: 低"}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">
                  {Math.round(result.compositeScore * 10) / 10}
                  <span className="ml-1 text-sm font-normal text-muted-foreground">
                    点
                  </span>
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* レーダーチャート */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">指標別スコア比較</CardTitle>
          </CardHeader>
          <CardContent>
            <ReportRadarChart results={results} definitions={definitions} />
          </CardContent>
        </Card>
      </div>

      {/* 比較ナラティブ */}
      {comparisonNarrative && (
        <NarrativeBlock narrative={comparisonNarrative} variant="comparison" />
      )}
    </section>
  );
}
