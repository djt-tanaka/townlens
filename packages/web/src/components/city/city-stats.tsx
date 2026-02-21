import { Users, Baby } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface CityStatsProps {
  readonly population: number;
  readonly kidsRatio: number;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("ja-JP").format(value);
}

/** 都市の基本統計（人口・0-14歳比率）を表示するサマリーカード */
export function CityStats({ population, kidsRatio }: CityStatsProps) {
  return (
    <section>
      <h2 className="mb-4 text-xl font-bold">基本統計</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg bg-primary/10 p-2">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">総人口</p>
              <p className="text-lg font-bold">
                {formatNumber(population)}
                <span className="ml-1 text-sm font-normal text-muted-foreground">
                  人
                </span>
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg bg-primary/10 p-2">
              <Baby className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">0-14歳比率</p>
              <p className="text-lg font-bold">
                {kidsRatio.toFixed(1)}
                <span className="ml-1 text-sm font-normal text-muted-foreground">
                  %
                </span>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
