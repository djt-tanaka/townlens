import Link from "next/link";
import { Baby, Home, Shield } from "lucide-react";
import type { RankingEntry } from "@/lib/ranking-data";
import type { RankingPresetMeta } from "@/lib/ranking-presets";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const ICONS: Record<string, React.ElementType> = {
  Baby,
  Home,
  Shield,
};

const MEDAL = ["", "\u{1F947}", "\u{1F948}", "\u{1F949}"] as const;

function renderStars(rating: number): string {
  const full = Math.round(rating);
  return "\u2605".repeat(full) + "\u2606".repeat(5 - full);
}

interface RankingPreviewProps {
  readonly meta: RankingPresetMeta;
  readonly entries: ReadonlyArray<RankingEntry>;
}

/** ランキング一覧ページの各プリセットセクション。TOP 5 を表示する。 */
export function RankingPreview({ meta, entries }: RankingPreviewProps) {
  const Icon = ICONS[meta.iconName];

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="h-5 w-5 text-muted-foreground" />}
        <h2 className="text-xl font-bold">{meta.label}</h2>
      </div>
      <p className="text-sm text-muted-foreground">{meta.description}</p>

      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          ランキングデータがまだ生成されていません
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-5">
          {entries.map((entry) => (
            <Card key={entry.areaCode} className="relative">
              <CardContent className="flex flex-col items-center gap-1 p-4">
                <span className="text-lg">
                  {MEDAL[entry.rank] ?? `${entry.rank}位`}
                </span>
                <Link
                  href={`/city/${encodeURIComponent(entry.cityName)}`}
                  className="text-sm font-semibold hover:underline"
                >
                  {entry.cityName}
                </Link>
                <Badge variant="outline" className="text-xs">
                  {entry.prefecture}
                </Badge>
                <span className="text-xs text-amber-500">
                  {renderStars(entry.starRating)} {entry.starRating.toFixed(1)}
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Button variant="outline" size="sm" asChild>
        <Link href={`/ranking/${meta.slug}`}>
          全ランキングを見る &rarr;
        </Link>
      </Button>
    </section>
  );
}
