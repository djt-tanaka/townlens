import Link from "next/link";
import { Users, Baby } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface PrefectureCityCardProps {
  readonly cityName: string;
  readonly population: number;
  readonly kidsRatio: number;
  readonly starRating: number;
  readonly rank: number;
}

function formatPopulation(population: number): string {
  return new Intl.NumberFormat("ja-JP").format(population);
}

function renderStars(rating: number): string {
  const rounded = Math.round(rating);
  return "\u2605".repeat(rounded) + "\u2606".repeat(5 - rounded);
}

const MEDAL: Record<number, string> = {
  1: "\u{1F947}",
  2: "\u{1F948}",
  3: "\u{1F949}",
};

const RANK_BORDER_COLORS: Record<number, string> = {
  1: "#FFD700",
  2: "#C0C0C0",
  3: "#CD7F32",
};

const RANK_BG_CLASSES: Record<number, string> = {
  1: "bg-amber-50/60 dark:bg-amber-950/20",
  2: "bg-slate-50/60 dark:bg-slate-800/20",
  3: "bg-orange-50/60 dark:bg-orange-950/20",
};

/** 都道府県ページ内の都市ランキングカード */
export function PrefectureCityCard({
  cityName,
  population,
  kidsRatio,
  starRating,
  rank,
}: PrefectureCityCardProps) {
  const isTop3 = rank <= 3;
  const medal = MEDAL[rank];
  const borderColor = RANK_BORDER_COLORS[rank];
  const bgClass = RANK_BG_CLASSES[rank] ?? "";

  return (
    <Link href={`/city/${encodeURIComponent(cityName)}`} className="block">
      <Card
        className={`transition-colors hover:border-primary/50 hover:bg-secondary/30 ${bgClass}`}
        style={isTop3 ? { borderLeft: `5px solid ${borderColor}` } : undefined}
      >
        <CardContent className="flex items-center gap-4 p-4">
          {isTop3 ? (
            <span className="flex h-10 w-10 shrink-0 items-center justify-center text-2xl">
              {medal}
            </span>
          ) : (
            <Badge
              variant="outline"
              className="flex h-8 w-8 shrink-0 items-center justify-center text-sm font-bold"
            >
              {rank}
            </Badge>
          )}
          <div className="min-w-0 flex-1">
            <p className={`truncate font-medium ${isTop3 ? "text-base font-bold" : ""}`}>
              {cityName}
            </p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span
                className={isTop3 ? "text-base text-amber-500" : "text-sm"}
                title={`${starRating.toFixed(1)} / 5.0`}
              >
                {renderStars(starRating)}
              </span>
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {formatPopulation(population)}人
              </span>
              <span className="flex items-center gap-1">
                <Baby className="h-3 w-3" />
                {kidsRatio.toFixed(1)}%
              </span>
            </div>
          </div>
          <span className={`font-bold text-primary ${isTop3 ? "text-xl" : "text-lg"}`}>
            {starRating.toFixed(1)}
          </span>
        </CardContent>
      </Card>
    </Link>
  );
}
