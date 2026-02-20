import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  generateComparisonNarrative,
  generateCityNarrative,
} from "@townlens/core";
import type {
  CityScoreResult,
  IndicatorDefinition,
  WeightPreset,
  ReportRow,
} from "@townlens/core";
import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { ReportHero } from "@/components/report/report-hero";
import { ScoreSummary } from "@/components/report/score-summary";
import { IndicatorDashboard } from "@/components/report/indicator-dashboard";
import { CityDetail } from "@/components/report/city-detail";
import { Disclaimer } from "@/components/report/disclaimer";

interface ReportPageProps {
  readonly params: Promise<{ id: string }>;
}

/** DB から取得した result_json の型 */
interface StoredReportData {
  readonly results: ReadonlyArray<CityScoreResult>;
  readonly definitions: ReadonlyArray<IndicatorDefinition>;
  readonly preset: WeightPreset;
  readonly hasPriceData: boolean;
  readonly hasCrimeData: boolean;
  readonly hasDisasterData: boolean;
  readonly hasEducationData?: boolean;
  readonly rawRows?: ReadonlyArray<ReportRow>;
  readonly timeLabel?: string;
}

/** レポートデータを DB から取得する */
async function fetchReport(id: string) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("reports")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return data;
}

/** SEO 用メタデータを生成 */
export async function generateMetadata({
  params,
}: ReportPageProps): Promise<Metadata> {
  const { id } = await params;
  const report = await fetchReport(id);

  if (!report) {
    return { title: "レポートが見つかりません" };
  }

  const cityNames = report.cities.join("・");
  const title = `${cityNames} 比較レポート`;
  const description = `${cityNames}の暮らしやすさを政府統計データに基づいて多角的に比較・分析したレポートです。`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [
        {
          url: `/api/og?id=${id}`,
          width: 1200,
          height: 630,
          alt: `${cityNames} 比較レポート`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`/api/og?id=${id}`],
    },
  };
}

export default async function ReportPage({ params }: ReportPageProps) {
  const { id } = await params;
  const report = await fetchReport(id);

  if (!report) {
    notFound();
  }

  if (report.status === "processing") {
    return (
      <main className="mx-auto max-w-4xl px-4 py-12">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <h1 className="text-xl font-semibold">レポート生成中...</h1>
          <p className="text-muted-foreground">
            しばらくお待ちください。通常1〜2分で完了します。
          </p>
        </div>
      </main>
    );
  }

  if (report.status === "failed") {
    return (
      <main className="mx-auto max-w-4xl px-4 py-12">
        <div className="flex flex-col items-center gap-4 text-center">
          <h1 className="text-xl font-semibold text-destructive">
            レポート生成に失敗しました
          </h1>
          <p className="text-muted-foreground">
            {report.error_message ?? "不明なエラーが発生しました。"}
          </p>
          <div className="flex gap-3">
            <Button asChild>
              <Link href="/">新しい比較を作成</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/dashboard">ダッシュボード</Link>
            </Button>
          </div>
        </div>
      </main>
    );
  }

  // result_json をパースする
  const stored = report.result_json as unknown as StoredReportData | null;
  if (!stored || !stored.results || !stored.definitions) {
    notFound();
  }

  const { results, definitions, preset } = stored;

  // サーバーサイドでナラティブを生成（実値・プリセット連動）
  const narrativeOptions = {
    rawRows: stored.rawRows,
    preset,
  };
  const comparisonNarrative = generateComparisonNarrative(
    results,
    definitions,
    narrativeOptions,
  );
  const cityNarratives: Record<string, string> = {};
  for (const result of results) {
    cityNarratives[result.cityName] = generateCityNarrative(
      result,
      definitions,
      results.length,
      narrativeOptions,
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-4xl space-y-8 bg-report-bg px-4 py-8">
      {/* カバーセクション */}
      <ReportHero
        cityNames={results.map((r) => r.cityName)}
        preset={preset}
        createdAt={report.created_at}
        hasPriceData={stored.hasPriceData}
        hasCrimeData={stored.hasCrimeData}
        hasDisasterData={stored.hasDisasterData}
        hasEducationData={stored.hasEducationData ?? false}
        timeLabel={stored.timeLabel}
      />

      {/* サマリー（ランキング + レーダーチャート + 比較ナラティブ） */}
      <ScoreSummary
        results={results}
        definitions={definitions}
        preset={preset}
        comparisonNarrative={comparisonNarrative}
      />

      {/* 指標ダッシュボード（棒グラフ + カテゴリ別テーブル） */}
      <IndicatorDashboard
        results={results}
        definitions={definitions}
        rawRows={stored.rawRows}
      />

      {/* 都市詳細（タブ切替 + スコアゲージ + カテゴリカード + ナラティブ） */}
      <CityDetail
        results={results}
        definitions={definitions}
        cityNarratives={cityNarratives}
        rawRows={stored.rawRows}
      />

      {/* 免責事項 */}
      <Disclaimer
        hasPriceData={stored.hasPriceData}
        hasCrimeData={stored.hasCrimeData}
        hasDisasterData={stored.hasDisasterData}
        timeLabel={stored.timeLabel}
      />
    </main>
  );
}
