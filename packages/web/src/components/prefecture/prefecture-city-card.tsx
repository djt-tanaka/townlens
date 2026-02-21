import Link from "next/link";
import { Users, Baby } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface PresetScore {
  readonly starRating: number;
}

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

/** 都道府県ページ内の都市ランキングカード */
export function PrefectureCityCard({
  cityName,
  population,
  kidsRatio,
  starRating,
  rank,
}: PrefectureCityCardProps) {
  return (
    <Link href={`/city/${encodeURIComponent(cityName)}`}>
      <Card className="transition-colors hover:border-primary/50 hover:bg-secondary/30">
        <CardContent className="flex items-center gap-4 p-4">
          <Badge
            variant="outline"
            className="flex h-8 w-8 shrink-0 items-center justify-center text-sm font-bold"
          >
            {rank}
          </Badge>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{cityName}</p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span className="text-sm" title={`${starRating.toFixed(1)} / 5.0`}>
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
          <span className="text-lg font-bold text-primary">
            {starRating.toFixed(1)}
          </span>
        </CardContent>
      </Card>
    </Link>
  );
}
