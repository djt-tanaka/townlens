import type { Metadata } from "next";
import {
  REGIONAL_BLOCKS,
  fetchAllMunicipalityCounts,
} from "@/lib/prefecture-data";
import { RegionBlockGrid } from "@/components/prefecture/region-block-grid";

/** ISR: 24時間で再生成 */
export const revalidate = 86400;

export const metadata: Metadata = {
  title: "都道府県一覧",
  description:
    "47都道府県の市区町村データを地方ブロック別に一覧表示。子育て・安全・住宅価格を政府統計で比較。",
  openGraph: {
    title: "都道府県一覧 | TownLens",
    description:
      "47都道府県の市区町村データを地方ブロック別に一覧表示。",
  },
};

export default async function PrefectureIndexPage() {
  const cityCounts = await fetchAllMunicipalityCounts();

  return (
    <main className="mx-auto min-h-screen max-w-4xl space-y-10 px-4 py-8">
      <section className="space-y-2">
        <h1 className="text-3xl font-black tracking-tight">
          都道府県から探す
        </h1>
        <p className="text-muted-foreground">
          地方ブロック別に都道府県を選んで、市区町村の暮らしやすさを比較できます。
        </p>
      </section>

      {REGIONAL_BLOCKS.map((block) => (
        <RegionBlockGrid
          key={block.name}
          block={block}
          cityCounts={cityCounts}
        />
      ))}
    </main>
  );
}
