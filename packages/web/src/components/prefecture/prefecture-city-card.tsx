import Link from "next/link";
import { Users, Baby } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface PrefectureCityCardProps {
  readonly cityName: string;
  readonly population: number;
  readonly kidsRatio: number;
}

function formatPopulation(population: number): string {
  return new Intl.NumberFormat("ja-JP").format(population);
}

/** 都道府県ページ内の都市一覧カード */
export function PrefectureCityCard({
  cityName,
  population,
  kidsRatio,
}: PrefectureCityCardProps) {
  return (
    <Link href={`/city/${encodeURIComponent(cityName)}`} className="block">
      <Card className="transition-colors hover:border-primary/50 hover:bg-secondary/30">
        <CardContent className="flex items-center gap-4 p-4">
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{cityName}</p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
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
        </CardContent>
      </Card>
    </Link>
  );
}
