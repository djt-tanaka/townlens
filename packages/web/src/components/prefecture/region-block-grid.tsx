import Link from "next/link";
import { MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { RegionalBlock } from "@/lib/prefecture-data";
import { getCityCountForPrefecture } from "@/lib/prefecture-data";

interface RegionBlockGridProps {
  readonly block: RegionalBlock;
}

/** 地方ブロック別の都道府県カードグリッド */
export function RegionBlockGrid({ block }: RegionBlockGridProps) {
  return (
    <section>
      <h2 className="mb-4 text-xl font-bold">{block.name}</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {block.prefectures.map((pref) => {
          const cityCount = getCityCountForPrefecture(pref.code);
          return (
            <Link
              key={pref.code}
              href={`/prefecture/${encodeURIComponent(pref.name)}`}
            >
              <Card className="transition-colors hover:border-primary/50 hover:bg-secondary/30">
                <CardContent className="flex items-center gap-3 p-4">
                  <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{pref.name}</p>
                  </div>
                  {cityCount > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {cityCount}都市
                    </Badge>
                  )}
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
