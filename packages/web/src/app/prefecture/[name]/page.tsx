import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  getAllPrefectureNames,
  getPrefectureCode,
} from "@/lib/prefectures";
import {
  fetchPrefectureCities,
  getCityCodesForPrefecture,
} from "@/lib/prefecture-data";
import { PrefectureCityList } from "@/components/prefecture/prefecture-city-list";
import { EmptyPrefecture } from "@/components/prefecture/empty-prefecture";

/** ISR: 24時間で再生成 */
export const revalidate = 86400;

interface PrefecturePageProps {
  readonly params: Promise<{ name: string }>;
}

/** 全47都道府県をビルド時にプリレンダリング */
export async function generateStaticParams(): Promise<
  Array<{ name: string }>
> {
  return getAllPrefectureNames().map((name) => ({ name }));
}

/** SEO メタデータ生成 */
export async function generateMetadata({
  params,
}: PrefecturePageProps): Promise<Metadata> {
  const { name } = await params;
  const prefName = decodeURIComponent(name);
  const prefCode = getPrefectureCode(prefName);

  if (!prefCode) {
    return { title: "都道府県が見つかりません" };
  }

  const cityEntries = await getCityCodesForPrefecture(prefName);
  const title = `${prefName}の市区町村 暮らしやすさランキング`;
  const description =
    cityEntries.length > 0
      ? `${prefName}の${cityEntries.length}市区町村を子育て・安全・住宅価格で政府統計データに基づきスコアリング。`
      : `${prefName}の市区町村データを政府統計で分析。`;

  return {
    title,
    description,
    openGraph: { title, description },
  };
}

export default async function PrefecturePage({
  params,
}: PrefecturePageProps) {
  const { name } = await params;
  const prefName = decodeURIComponent(name);
  const prefCode = getPrefectureCode(prefName);

  if (!prefCode) {
    notFound();
  }

  const cities = await fetchPrefectureCities(prefName);

  return (
    <main className="mx-auto min-h-screen max-w-4xl space-y-8 px-4 py-8">
      {/* パンくずナビ */}
      <Link
        href="/prefecture"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        都道府県一覧
      </Link>

      {/* ヘッダーセクション */}
      <section className="space-y-2">
        <div className="flex items-center gap-2">
          <Badge variant="outline">都道府県</Badge>
        </div>
        <h1 className="text-3xl font-black tracking-tight">
          {prefName}の暮らしやすさランキング
        </h1>
        <p className="text-muted-foreground">
          政府統計データに基づく{prefName}内の市区町村評価
        </p>
      </section>

      {/* 都市リストまたは空状態 */}
      {cities.length > 0 ? (
        <PrefectureCityList cities={cities} />
      ) : (
        <EmptyPrefecture prefectureName={prefName} />
      )}
    </main>
  );
}
