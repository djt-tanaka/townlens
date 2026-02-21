"use client";

import type {
  CityScoreResult,
  IndicatorDefinition,
  ReportRow,
} from "@townlens/core";
import { getCategoryColor, starColor } from "@townlens/core";
import { getCategoryScores } from "@/lib/category-utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScoreGauge } from "./score-gauge";
import { NarrativeBlock } from "./narrative-block";
import {
  getRawValue,
  formatRawValue,
  getScoreColorHex,
  getConfidenceStyle,
  getConfidenceLabel,
} from "./raw-value-utils";

interface CityDetailProps {
  readonly results: ReadonlyArray<CityScoreResult>;
  readonly definitions: ReadonlyArray<IndicatorDefinition>;
  readonly cityNarratives: Readonly<Record<string, string>>;
  readonly rawRows?: ReadonlyArray<ReportRow>;
}

const jaNumberFormat = new Intl.NumberFormat("ja-JP");


/** 都市ごとの詳細表示。タブ切り替えでスコアゲージ・カテゴリカード・ナラティブを表示 */
export function CityDetail({
  results,
  definitions,
  cityNarratives,
  rawRows,
}: CityDetailProps) {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">都市詳細</h2>
      <Tabs defaultValue={results[0]?.cityName}>
        <div className="overflow-x-auto">
          <TabsList className="w-full min-w-max">
            {results.map((result) => (
              <TabsTrigger
                key={result.cityName}
                value={result.cityName}
                className="min-w-[80px] flex-1"
              >
                {result.cityName}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        {results.map((result) => {
          const categoryScores = getCategoryScores(result, definitions);
          const rawRow = rawRows?.find(
            (r) => r.areaCode === result.areaCode,
          );
          return (
            <TabsContent
              key={result.cityName}
              value={result.cityName}
              className="space-y-4"
            >
              {/* スコアゲージ + メタ情報 */}
              <div className="flex flex-wrap items-center justify-center gap-6 py-4">
                <ScoreGauge
                  score={result.compositeScore}
                  size={180}
                  label={result.starRating != null
                    ? `総合評価（${result.rank}位 / ${results.length}市区町村）`
                    : `総合スコア（${result.rank}位 / ${results.length}市区町村）`}
                  starRating={result.starRating}
                />
                <div className="space-y-1">
                  {result.starRating != null ? (
                    <p className="text-sm text-muted-foreground">
                      総合評価:{" "}
                      <strong className="text-lg text-foreground">
                        {result.starRating.toFixed(1)}
                      </strong>{" "}
                      / 5.0
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      総合スコア:{" "}
                      <strong className="text-lg text-foreground">
                        {result.compositeScore.toFixed(1)}
                      </strong>{" "}
                      / 100
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    信頼度:{" "}
                    <Badge
                      className="border-0"
                      style={getConfidenceStyle(result.confidence.level)}
                    >
                      {getConfidenceLabel(result.confidence.level)}
                    </Badge>
                  </p>
                </div>
              </div>

              {/* カテゴリ別スコアカード */}
              <div className="space-y-4">
                {categoryScores.map(
                  ({ category, avgScore, categoryDefs }) => {
                    const color = getCategoryColor(category);
                    return (
                      <Card
                        key={category}
                        style={{
                          borderLeft: `4px solid ${color.primary}`,
                        }}
                      >
                        <CardContent className="pt-4">
                          {/* カテゴリヘッダー + 平均スコア */}
                          <div className="mb-3 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{color.emoji}</span>
                              <span
                                className="text-[15px] font-bold"
                                style={{ color: color.dark }}
                              >
                                {color.label}
                              </span>
                            </div>
                            <span className="text-sm text-muted-foreground">
                              平均{" "}
                              <strong style={{ color: color.primary }}>
                                {avgScore.toFixed(1)}
                              </strong>
                            </span>
                          </div>

                          {/* プログレスバー */}
                          <div className="mb-4 h-1.5 w-full rounded-full bg-warm-surface">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${Math.min(avgScore, 100)}%`,
                                backgroundColor: color.primary,
                              }}
                            />
                          </div>

                          {/* 指標詳細リスト */}
                          <div className="space-y-0 divide-y divide-border">
                            {categoryDefs.map((def) => {
                              const cs = result.choice.find(
                                (c) => c.indicatorId === def.id,
                              );
                              const bs = result.baseline.find(
                                (b) => b.indicatorId === def.id,
                              );
                              const raw = rawRow
                                ? getRawValue(def.id, rawRow)
                                : undefined;
                              const score = cs?.score ?? 0;

                              return (
                                <div
                                  key={def.id}
                                  className="flex items-start justify-between py-3"
                                >
                                  <div className="flex-1">
                                    <div className="text-[13px] font-semibold text-foreground">
                                      {def.label}
                                    </div>
                                    {rawRow && (
                                      <div className="mt-0.5 text-lg font-bold text-foreground">
                                        {formatRawValue(raw, def)}{" "}
                                        <span className="text-xs font-normal text-muted-foreground">
                                          {def.unit}
                                        </span>
                                      </div>
                                    )}
                                    {/* 価格レンジ情報 */}
                                    {def.id === "condo_price_median" &&
                                      rawRow?.condoPriceQ25 != null &&
                                      rawRow?.condoPriceQ75 != null && (
                                        <div className="mt-1 rounded-lg bg-warm-surface px-3 py-2 text-xs">
                                          価格レンジ (Q25-Q75):{" "}
                                          <strong>
                                            {jaNumberFormat.format(
                                              rawRow.condoPriceQ25,
                                            )}{" "}
                                            〜{" "}
                                            {jaNumberFormat.format(
                                              rawRow.condoPriceQ75,
                                            )}{" "}
                                            万円
                                          </strong>
                                          {rawRow.condoPriceCount != null && (
                                            <span className="text-muted-foreground">
                                              （取引件数:{" "}
                                              {jaNumberFormat.format(
                                                rawRow.condoPriceCount,
                                              )}
                                              件）
                                            </span>
                                          )}
                                          {rawRow.affordabilityRate !=
                                            null && (
                                            <div className="mt-1">
                                              予算内取引割合:{" "}
                                              <strong>
                                                {rawRow.affordabilityRate.toFixed(
                                                  1,
                                                )}
                                                %
                                              </strong>
                                            </div>
                                          )}
                                        </div>
                                      )}
                                  </div>
                                  <div className="min-w-[70px] text-right">
                                    {(() => {
                                      const indicatorStar = result.indicatorStars?.find(
                                        (s) => s.indicatorId === def.id,
                                      );
                                      if (indicatorStar) {
                                        const stColor = starColor(indicatorStar.stars);
                                        return (
                                          <>
                                            <div
                                              className="text-lg tracking-wide"
                                              style={{ color: stColor }}
                                            >
                                              {"\u2605".repeat(indicatorStar.stars)}
                                              {"\u2606".repeat(5 - indicatorStar.stars)}
                                            </div>
                                            <div className="text-[11px] text-muted-foreground">
                                              全国上位 {(100 - indicatorStar.nationalPercentile).toFixed(0)}%
                                            </div>
                                          </>
                                        );
                                      }
                                      return (
                                        <>
                                          <div
                                            className="text-xl font-extrabold"
                                            style={{
                                              color: getScoreColorHex(score),
                                            }}
                                          >
                                            {cs ? cs.score.toFixed(1) : "-"}
                                          </div>
                                          <div className="text-[11px] text-muted-foreground">
                                            スコア
                                          </div>
                                          {bs && (
                                            <div className="text-[11px] text-muted-foreground">
                                              {bs.percentile.toFixed(1)}%
                                            </div>
                                          )}
                                        </>
                                      );
                                    })()}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  },
                )}
              </div>

              {/* 都市別ナラティブ */}
              {cityNarratives[result.cityName] && (
                <NarrativeBlock
                  narrative={cityNarratives[result.cityName]}
                  variant="city"
                />
              )}

              {/* 注意事項 */}
              {result.notes.length > 0 && (
                <div className="rounded-lg border border-muted bg-muted/30 p-3">
                  <p className="mb-1 text-xs font-semibold text-muted-foreground">
                    注意事項
                  </p>
                  <ul className="list-inside list-disc space-y-1 text-xs text-muted-foreground">
                    {result.notes.map((note, i) => (
                      <li key={i}>{note}</li>
                    ))}
                  </ul>
                </div>
              )}
            </TabsContent>
          );
        })}
      </Tabs>
    </section>
  );
}
