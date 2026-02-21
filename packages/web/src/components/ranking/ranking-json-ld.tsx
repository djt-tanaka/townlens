import type { RankingEntry } from "@/lib/ranking-data";

interface RankingJsonLdProps {
  readonly presetLabel: string;
  readonly entries: ReadonlyArray<RankingEntry>;
}

/** JSON-LD ItemList 構造化データ。Google 検索のリッチリザルト対応。 */
export function RankingJsonLd({
  presetLabel,
  entries,
}: RankingJsonLdProps) {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://townlens.jp";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${presetLabel}ランキング TOP${entries.length}`,
    description: `政府統計データに基づく${presetLabel}ランキング`,
    numberOfItems: entries.length,
    itemListElement: entries.map((entry) => ({
      "@type": "ListItem",
      position: entry.rank,
      name: entry.cityName,
      url: `${baseUrl}/city/${encodeURIComponent(entry.cityName)}`,
    })),
  };

  // JSON.stringify は HTML タグをエスケープするため XSS リスクなし
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
