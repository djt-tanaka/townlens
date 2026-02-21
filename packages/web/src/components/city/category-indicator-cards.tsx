import type {
  IndicatorDefinition,
  IndicatorCategory,
  IndicatorStarRating,
} from "@townlens/core";
import { getCategoryColor, starColor } from "@townlens/core";
import { Card, CardContent } from "@/components/ui/card";
import type { CityRawData } from "@/lib/city-data";

interface CategoryIndicatorCardsProps {
  readonly indicators: ReadonlyArray<IndicatorDefinition>;
  readonly indicatorStars: ReadonlyArray<IndicatorStarRating>;
  readonly rawData: CityRawData;
}

const jaNumberFormat = new Intl.NumberFormat("ja-JP");

/** 指標IDから CityRawData の実値を取得する */
function getRawValue(
  indicatorId: string,
  rawData: CityRawData,
): number | boolean | null | undefined {
  const mapping: Record<
    string,
    () => number | boolean | null | undefined
  > = {
    condo_price_median: () => rawData.condoPriceMedian,
    crime_rate: () => rawData.crimeRate,
    flood_risk: () => rawData.floodRisk,
    evacuation_sites: () => rawData.evacuationSiteCount,
    elementary_schools_per_capita: () => rawData.elementarySchoolsPerCapita,
    junior_high_schools_per_capita: () => rawData.juniorHighSchoolsPerCapita,
    station_count_per_capita: () => rawData.stationCountPerCapita,
    terminal_access_km: () => rawData.terminalAccessKm,
    hospitals_per_capita: () => rawData.hospitalsPerCapita,
    clinics_per_capita: () => rawData.clinicsPerCapita,
    pediatrics_per_capita: () => rawData.pediatricsPerCapita,
  };
  return mapping[indicatorId]?.() ?? undefined;
}

/** 実値をフォーマットして文字列化する */
function formatValue(
  raw: number | boolean | null | undefined,
  def: IndicatorDefinition,
): string {
  if (raw === null || raw === undefined) return "-";
  if (typeof raw === "boolean") return raw ? "あり" : "なし";
  return def.precision === 0
    ? jaNumberFormat.format(raw)
    : raw.toFixed(def.precision);
}

/** 指標をカテゴリ別にグループ化 */
function groupByCategory(
  indicators: ReadonlyArray<IndicatorDefinition>,
): ReadonlyArray<{
  category: IndicatorCategory;
  defs: ReadonlyArray<IndicatorDefinition>;
}> {
  const groups = new Map<IndicatorCategory, IndicatorDefinition[]>();
  for (const def of indicators) {
    // 人口系指標は基本統計で表示済みのためスキップ
    if (def.category === "childcare") continue;
    const existing = groups.get(def.category);
    if (existing) {
      existing.push(def);
    } else {
      groups.set(def.category, [def]);
    }
  }
  return [...groups.entries()].map(([category, defs]) => ({
    category,
    defs,
  }));
}

/** カテゴリ別の指標詳細ダッシュボード。スター評価・実値・全国パーセンタイルを表示 */
export function CategoryIndicatorCards({
  indicators,
  indicatorStars,
  rawData,
}: CategoryIndicatorCardsProps) {
  const groups = groupByCategory(indicators);
  const starMap = new Map(indicatorStars.map((s) => [s.indicatorId, s]));

  // データのある（スター評価を持つ）カテゴリのみ表示
  const visibleGroups = groups.filter((g) =>
    g.defs.some((d) => starMap.has(d.id)),
  );

  if (visibleGroups.length === 0) return null;

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-bold">カテゴリ別詳細評価</h2>
      <p className="text-sm text-muted-foreground">
        全国の市区町村データを基準とした5段階スター評価
      </p>
      <div className="space-y-4">
        {visibleGroups.map(({ category, defs }) => {
          const color = getCategoryColor(category);
          return (
            <Card
              key={category}
              style={{ borderLeft: `4px solid ${color.primary}` }}
            >
              <CardContent className="pt-4">
                {/* カテゴリヘッダー */}
                <div className="mb-3 flex items-center gap-2">
                  <span className="text-lg">{color.emoji}</span>
                  <span
                    className="text-[15px] font-bold"
                    style={{ color: color.dark }}
                  >
                    {color.label}
                  </span>
                </div>

                {/* 指標詳細リスト */}
                <div className="space-y-0 divide-y divide-border">
                  {defs.map((def) => {
                    const star = starMap.get(def.id);
                    const raw = getRawValue(def.id, rawData);

                    // データが無い指標はスキップ
                    if (!star && (raw === null || raw === undefined))
                      return null;

                    return (
                      <div
                        key={def.id}
                        className="flex items-start justify-between py-3"
                      >
                        <div className="flex-1">
                          <div className="text-[13px] font-semibold text-foreground">
                            {def.label}
                          </div>
                          <div className="mt-0.5 text-lg font-bold text-foreground">
                            {formatValue(raw, def)}{" "}
                            <span className="text-xs font-normal text-muted-foreground">
                              {def.unit}
                            </span>
                          </div>
                        </div>
                        {star && (
                          <div className="min-w-[70px] text-right">
                            <div
                              className="text-lg tracking-wide"
                              style={{ color: starColor(star.stars) }}
                            >
                              {"\u2605".repeat(star.stars)}
                              {"\u2606".repeat(5 - star.stars)}
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                              全国上位{" "}
                              {(100 - star.nationalPercentile).toFixed(0)}%
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">
        ※ スター評価は全国市区町村の統計分布を基準とした5段階評価です。
      </p>
    </section>
  );
}
