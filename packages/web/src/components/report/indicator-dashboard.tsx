import type {
  CityScoreResult,
  IndicatorDefinition,
  ReportRow,
} from "@townlens/core";
import { getCategoryColor } from "@townlens/core";
import { groupByCategory } from "@/lib/category-utils";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ReportBarChart } from "./bar-chart";
import { getRawValue, formatRawValue, getScoreColorHex } from "./raw-value-utils";

interface IndicatorDashboardProps {
  readonly results: ReadonlyArray<CityScoreResult>;
  readonly definitions: ReadonlyArray<IndicatorDefinition>;
  readonly rawRows?: ReadonlyArray<ReportRow>;
}

/** 指標ダッシュボード。棒グラフ + カテゴリ別の指標テーブルを表示 */
export function IndicatorDashboard({
  results,
  definitions,
  rawRows,
}: IndicatorDashboardProps) {
  const groups = groupByCategory(definitions);

  return (
    <section className="space-y-6">
      <h2 className="text-lg font-semibold">指標ダッシュボード</h2>
      <p className="text-xs text-muted-foreground">
        候補内比較スコア（Choice Score: 0-100）による指標別の都市比較
      </p>

      {/* 棒グラフ */}
      <Card>
        <CardContent className="pt-6">
          <ReportBarChart results={results} definitions={definitions} />
        </CardContent>
      </Card>

      {/* カテゴリ別テーブル */}
      {groups.map(({ category, indicators }) => {
        const color = getCategoryColor(category);
        return (
          <Card key={category}>
            {/* カテゴリヘッダー（PDF準拠） */}
            <div
              className="flex items-center gap-3 rounded-t-lg px-4 py-3 text-[15px] font-bold"
              style={{
                backgroundColor: color.light,
                color: color.dark,
              }}
            >
              <span className="text-xl">{color.emoji}</span>
              {color.label}
            </div>
            <CardContent className="pt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px] sm:w-[140px]">指標</TableHead>
                    {results.map((r) => (
                      <TableHead
                        key={`${r.cityName}-score`}
                        className="text-right"
                      >
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
                        const cs = result.choice.find(
                          (c) => c.indicatorId === def.id,
                        );
                        const bs = result.baseline.find(
                          (b) => b.indicatorId === def.id,
                        );
                        const rawRow = rawRows?.find(
                          (r) => r.areaCode === result.areaCode,
                        );
                        const raw = rawRow
                          ? getRawValue(def.id, rawRow)
                          : undefined;
                        const score = cs?.score ?? 0;

                        return (
                          <TableCell
                            key={result.cityName}
                            className="text-right tabular-nums"
                          >
                            {/* 実値 */}
                            {rawRow && (
                              <div className="text-xs text-muted-foreground">
                                {formatRawValue(raw, def)}
                              </div>
                            )}
                            {/* スコア（色付き） */}
                            <div
                              className="font-bold"
                              style={{ color: getScoreColorHex(score) }}
                            >
                              {cs
                                ? (Math.round(cs.score * 10) / 10).toFixed(1)
                                : "-"}
                            </div>
                            {/* パーセンタイル */}
                            {bs && (
                              <div className="text-xs text-muted-foreground">
                                {bs.percentile.toFixed(1)}%
                              </div>
                            )}
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

      <p className="text-xs text-muted-foreground">
        ※ 候補セット内での相対パーセンタイルです。
      </p>
    </section>
  );
}
