import type { Metadata } from "next";
import { fetchAllPresetRankings } from "@/lib/ranking-data";
import { RANKING_PRESET_META } from "@/lib/ranking-presets";
import { RankingPreview } from "@/components/ranking/ranking-preview";

/** ISR: 24時間で再生成 */
export const revalidate = 86400;

export const metadata: Metadata = {
  title: "住みやすい街ランキング",
  description:
    "政府統計データに基づく住みやすい街ランキング。子育て・価格・安全の観点から全国の市区町村をスコアリング。",
  openGraph: {
    title: "住みやすい街ランキング",
    description:
      "政府統計データに基づく住みやすい街ランキング。子育て・価格・安全の観点から全国の市区町村をスコアリング。",
  },
};

export default async function RankingIndexPage() {
  const rankings = await fetchAllPresetRankings(5);

  return (
    <main className="mx-auto min-h-screen max-w-4xl space-y-12 px-4 py-8">
      <section className="space-y-2">
        <h1 className="text-3xl font-black tracking-tight">
          住みやすい街ランキング
        </h1>
        <p className="text-muted-foreground">
          政府統計データに基づく全国市区町村のスコアリング
        </p>
      </section>

      {RANKING_PRESET_META.map((meta) => (
        <RankingPreview
          key={meta.name}
          meta={meta}
          entries={rankings.get(meta.name) ?? []}
        />
      ))}
    </main>
  );
}
