import type {
  CityScoreResult,
  IndicatorDefinition,
  IndicatorCategory,
} from "@townlens/core";
import { getCategoryColor } from "@townlens/core";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ReportBarChart } from "./bar-chart";

interface IndicatorDashboardProps {
  readonly results: ReadonlyArray<CityScoreResult>;
  readonly definitions: ReadonlyArray<IndicatorDefinition>;
}

/** 指標をカテゴリ別にグループ化する */
function groupByCategory(
  definitions: ReadonlyArray<IndicatorDefinition>,
): ReadonlyArray<{
  readonly category: IndicatorCategory;
  readonly indicators: ReadonlyArray<IndicatorDefinition>;
}> {
  const groups = new Map<IndicatorCategory, IndicatorDefinition[]>();
  for (const def of definitions) {
    const existing = groups.get(def.category);
    if (existing) {
      existing.push(def);
    } else {
      groups.set(def.category, [def]);
    }
  }
  return [...groups.entries()].map(([category, indicators]) => ({
    category,
    indicators,
  }));
}

/** 指標ダッシュボード。棒グラフ + カテゴリ別の指標テーブルを表示 */
export function IndicatorDashboard({
  results,
  definitions,
}: IndicatorDashboardProps) {
  const groups = groupByCategory(definitions);

  return (
    <section className="space-y-6">
      <h2 className="text-lg font-semibold">指標ダッシュボード</h2>

      {/* 棒グラフ */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">指標別スコア比較</CardTitle>
        </CardHeader>
        <CardContent>
          <ReportBarChart results={results} definitions={definitions} />
        </CardContent>
      </Card>

      {/* カテゴリ別テーブル */}
      {groups.map(({ category, indicators }) => {
        const color = getCategoryColor(category);
        return (
          <Card key={category}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">指標</TableHead>
                    {results.map((r) => (
                      <TableHead key={r.cityName} className="text-right">
                        {r.cityName}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {indicators.map((def) => (
                    <TableRow key={def.id}>
                      <TableCell className="font-medium">
                        {def.label}
                        <span className="ml-1 text-xs text-muted-foreground">
                          ({def.unit})
                        </span>
                      </TableCell>
                      {results.map((result) => {
                        const score = result.choice.find(
                          (c) => c.indicatorId === def.id,
                        );
                        return (
                          <TableCell
                            key={result.cityName}
                            className="text-right tabular-nums"
                          >
                            {score
                              ? (
                                  Math.round(score.score * 10) / 10
                                ).toFixed(1)
                              : "-"}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        );
      })}
    </section>
  );
}
