import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CITY_LOCATIONS, generateCityNarrative } from "@townlens/core";
import type { CityScoreResult } from "@townlens/core";
import { Badge } from "@/components/ui/badge";
import { CityStats } from "@/components/city/city-stats";
import { PresetScoreCards } from "@/components/city/preset-score-cards";
import { CategoryIndicatorCards } from "@/components/city/category-indicator-cards";
import { CityRadarChart } from "@/components/city/city-radar-chart";
import { DataSourceInfo } from "@/components/city/data-source-info";
import { CompareCta } from "@/components/city/compare-cta";
import { RelatedCities } from "@/components/city/related-cities";
import { NarrativeBlock } from "@/components/report/narrative-block";
import { fetchCityPageData } from "@/lib/city-data";
import { findNearbyCities } from "@/lib/nearby-cities";

/** ISR: 24時間で再生成 */
export const revalidate = 86400;

interface CityPageProps {
  readonly params: Promise<{ name: string }>;
}

/** 主要都市をビルド時にプリレンダリング */
export async function generateStaticParams(): Promise<
  Array<{ name: string }>
> {
  return [...CITY_LOCATIONS.values()].map((loc) => ({
    name: loc.name,
  }));
}

/** SEO メタデータ生成 */
export async function generateMetadata({
  params,
}: CityPageProps): Promise<Metadata> {
  const { name } = await params;
  const cityName = decodeURIComponent(name);

  const data = await fetchCityPageData(cityName);
  if (!data) {
    return { title: "都市が見つかりません" };
  }

  const pop = new Intl.NumberFormat("ja-JP").format(data.population);
  const title = `${data.cityName}の暮らしやすさ`;
  const description = `${data.prefecture}${data.cityName}の子育て・安全・住宅価格・災害リスクを政府統計データで分析。人口${pop}人、0-14歳比率${data.kidsRatio.toFixed(1)}%。`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [
        {
          url: `/api/og/city?name=${encodeURIComponent(data.cityName)}`,
          width: 1200,
          height: 630,
          alt: `${data.cityName}の暮らしやすさ`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [
        `/api/og/city?name=${encodeURIComponent(data.cityName)}`,
      ],
    },
  };
}

/** 単一都市の SingleCityScore から擬似的な CityScoreResult を構築してナラティブ生成する */
function buildNarrative(data: Awaited<ReturnType<typeof fetchCityPageData>>) {
  if (!data) return null;

  const defaultPresetScore = data.presetScores[0];
  if (!defaultPresetScore) return null;

  const { score } = defaultPresetScore;

  // generateCityNarrative は CityScoreResult を期待するため、
  // SingleCityScore から必要な最低限のフィールドを構築する
  const pseudoResult: CityScoreResult = {
    cityName: data.cityName,
    areaCode: data.areaCode,
    compositeScore: 0,
    rank: 1,
    choice: [],
    baseline: [],
    confidence: { level: "medium", reason: "" },
    notes: [],
    starRating: score.starRating,
    indicatorStars: score.indicatorStars,
  };

  return generateCityNarrative(pseudoResult, data.indicators, 1);
}

export default async function CityPage({ params }: CityPageProps) {
  const { name } = await params;
  const cityName = decodeURIComponent(name);

  const data = await fetchCityPageData(cityName);
  if (!data) {
    notFound();
  }

  const nearbyCities = findNearbyCities(data.areaCode);
  const narrative = buildNarrative(data);

  return (
    <main className="mx-auto min-h-screen max-w-4xl space-y-8 px-4 py-8">
      {/* ヘッダーセクション */}
      <section className="space-y-2">
        <div className="flex items-center gap-2">
          <Badge variant="outline">{data.prefecture}</Badge>
        </div>
        <h1 className="text-3xl font-black tracking-tight">
          {data.cityName}の暮らしやすさ
        </h1>
        <p className="text-muted-foreground">
          政府統計データに基づく{data.cityName}の多角的評価
        </p>
      </section>

      {/* 基本統計 */}
      <CityStats
        population={data.population}
        kidsRatio={data.kidsRatio}
      />

      {/* プリセット別スコア概要 */}
      <PresetScoreCards presetScores={data.presetScores} />

      {/* レーダーチャート */}
      <CityRadarChart
        indicators={data.indicators}
        indicatorStars={data.indicatorStars}
        cityName={data.cityName}
      />

      {/* カテゴリ別詳細評価 */}
      <CategoryIndicatorCards
        indicators={data.indicators}
        indicatorStars={data.indicatorStars}
        rawData={data.rawData}
      />

      {/* 評価コメント */}
      {narrative && <NarrativeBlock narrative={narrative} variant="city" />}

      {/* データソース情報 */}
      <DataSourceInfo dataAvailability={data.dataAvailability} />

      {/* CTA: この街と比較する */}
      <CompareCta cityName={data.cityName} />

      {/* 近隣都市 */}
      {nearbyCities.length > 0 && (
        <RelatedCities title="近隣の都市" cities={nearbyCities} />
      )}
    </main>
  );
}
