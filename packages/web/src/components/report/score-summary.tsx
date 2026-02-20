import type {
  CityScoreResult,
  IndicatorDefinition,
  WeightPreset,
} from "@townlens/core";
import { getCityColor, starColor } from "@townlens/core";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ReportRadarChart } from "./radar-chart";
import { NarrativeBlock } from "./narrative-block";
import {
  getScoreColorHex,
  getConfidenceStyle,
  getConfidenceLabel,
} from "./raw-value-utils";

interface ScoreSummaryProps {
  readonly results: ReadonlyArray<CityScoreResult>;
  readonly definitions: ReadonlyArray<IndicatorDefinition>;
  readonly preset: WeightPreset;
  readonly comparisonNarrative: string;
}

/** 順位に応じたメダル絵文字またはラベルを返す */
function getRankDisplay(rank: number): string {
  if (rank === 1) return "\u{1F947}";
  if (rank === 2) return "\u{1F948}";
  if (rank === 3) return "\u{1F949}";
  return `${rank}位`;
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
          {sortedResults.map((result) => {
            const cityIdx = results.findIndex(
              (r) => r.areaCode === result.areaCode,
            );
            const scoreColor = getScoreColorHex(result.compositeScore);
            const confidenceStyle = getConfidenceStyle(
              result.confidence.level,
            );

            return (
              <Card
                key={result.cityName}
                style={{ borderLeft: `5px solid ${getCityColor(cityIdx)}` }}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <span className="text-2xl leading-none">
                      {getRankDisplay(result.rank)}
                    </span>
                    <span className="font-bold">{result.cityName}</span>
                    <Badge className="ml-auto border-0" style={confidenceStyle}>
                      {getConfidenceLabel(result.confidence.level)}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {result.starRating != null ? (
                    <div>
                      <p className="text-2xl tracking-wider" style={{ color: starColor(result.starRating) }}>
                        {"\u2605".repeat(Math.round(result.starRating))}
                        {"\u2606".repeat(5 - Math.round(result.starRating))}
                      </p>
                      <p className="text-base font-bold" style={{ color: starColor(result.starRating) }}>
                        {result.starRating.toFixed(1)} / 5.0
                        <span className="ml-1 text-sm font-normal text-muted-foreground">
                          総合評価（全国基準）
                        </span>
                      </p>
                    </div>
                  ) : (
                  <p className="text-3xl font-extrabold" style={{ color: scoreColor }}>
                    {(Math.round(result.compositeScore * 10) / 10).toFixed(1)}
                    <span className="ml-1 text-sm font-normal text-muted-foreground">
                      総合スコア
                    </span>
                  </p>
                  )}
                  {result.notes.length > 0 && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {result.notes[0]}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
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

      {/* 注記 */}
      <p className="text-xs text-muted-foreground">
        ※ スター評価は全国市区町村の統計分布を基準とした5段階評価です。
        <br />
        ※ 信頼度はデータの鮮度・欠損率に基づく参考値です。
      </p>
    </section>
  );
}
