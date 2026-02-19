"use client";

import type {
  CityScoreResult,
  IndicatorDefinition,
} from "@townlens/core";
import { getCategoryColor } from "@townlens/core";
import { getCategoryScores } from "@/lib/category-utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScoreGauge } from "./score-gauge";
import { NarrativeBlock } from "./narrative-block";

interface CityDetailProps {
  readonly results: ReadonlyArray<CityScoreResult>;
  readonly definitions: ReadonlyArray<IndicatorDefinition>;
  readonly cityNarratives: Readonly<Record<string, string>>;
}

/** 都市ごとの詳細表示。タブ切り替えでスコアゲージ・カテゴリカード・ナラティブを表示 */
export function CityDetail({
  results,
  definitions,
  cityNarratives,
}: CityDetailProps) {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">都市詳細</h2>
      <Tabs defaultValue={results[0]?.cityName}>
        <TabsList className="w-full">
          {results.map((result) => (
            <TabsTrigger
              key={result.cityName}
              value={result.cityName}
              className="flex-1"
            >
              {result.cityName}
            </TabsTrigger>
          ))}
        </TabsList>
        {results.map((result) => {
          const categoryScores = getCategoryScores(result, definitions);
          return (
            <TabsContent
              key={result.cityName}
              value={result.cityName}
              className="space-y-4"
            >
              {/* スコアゲージ */}
              <div className="flex justify-center py-4">
                <ScoreGauge
                  score={result.compositeScore}
                  size={160}
                  label={`総合スコア（${result.rank}位）`}
                />
              </div>

              {/* カテゴリ別スコアカード */}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {categoryScores.map(({ category, avgScore }) => {
                  const color = getCategoryColor(category);
                  return (
                    <Card key={category}>
                      <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-sm">
                          <Badge
                            style={{
                              backgroundColor: color.light,
                              color: color.dark,
                              borderColor: `${color.primary}33`,
                            }}
                            className="border"
                          >
                            {color.emoji} {color.label}
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-2xl font-bold">
                          {(Math.round(avgScore * 10) / 10).toFixed(1)}
                          <span className="ml-1 text-sm font-normal text-muted-foreground">
                            点
                          </span>
                        </p>
                      </CardContent>
                    </Card>
                  );
                })}
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
                  <ul className="space-y-1 text-xs text-muted-foreground">
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
