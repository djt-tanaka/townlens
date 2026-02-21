import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { fetchRankingByPreset } from "@/lib/ranking-data";
import {
  RANKING_PRESET_META,
  isValidPresetSlug,
} from "@/lib/ranking-presets";
import { RankingTable } from "@/components/ranking/ranking-table";
import { RankingJsonLd } from "@/components/ranking/ranking-json-ld";

/** ISR: 24時間で再生成 */
export const revalidate = 86400;

interface PresetRankingPageProps {
  readonly params: Promise<{ preset: string }>;
}

/** 3プリセット分をビルド時にプリレンダリング */
export function generateStaticParams(): Array<{ preset: string }> {
  return RANKING_PRESET_META.map((m) => ({ preset: m.slug }));
}

/** SEO メタデータ生成 */
export async function generateMetadata({
  params,
}: PresetRankingPageProps): Promise<Metadata> {
  const { preset } = await params;
  const meta = RANKING_PRESET_META.find((m) => m.slug === preset);
  if (!meta) {
    return { title: "ランキングが見つかりません" };
  }

  const title = `${meta.label}ランキング TOP30`;
  const description = `${meta.description}。政府統計データに基づく全国市区町村の${meta.label}ランキング。`;

  return {
    title,
    description,
    openGraph: { title, description },
  };
}

export default async function PresetRankingPage({
  params,
}: PresetRankingPageProps) {
  const { preset } = await params;

  if (!isValidPresetSlug(preset)) {
    notFound();
  }

  const meta = RANKING_PRESET_META.find((m) => m.slug === preset);
  if (!meta) {
    notFound();
  }

  const entries = await fetchRankingByPreset(preset, 30);

  return (
    <main className="mx-auto min-h-screen max-w-4xl space-y-8 px-4 py-8">
      <section className="space-y-2">
        <h1 className="text-3xl font-black tracking-tight">
          {meta.label}ランキング TOP30
        </h1>
        <p className="text-muted-foreground">{meta.description}</p>
      </section>

      <RankingTable entries={entries} />

      <RankingJsonLd presetLabel={meta.label} entries={entries} />
    </main>
  );
}
