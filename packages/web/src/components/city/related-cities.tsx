import Link from "next/link";
import { MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { RelatedCity } from "@/lib/nearby-cities";

interface RelatedCitiesProps {
  readonly title: string;
  readonly cities: ReadonlyArray<RelatedCity>;
}

/** 近隣都市・同規模都市へのリンクカード */
export function RelatedCities({ title, cities }: RelatedCitiesProps) {
  return (
    <section>
      <h2 className="mb-4 text-xl font-bold">{title}</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cities.map((city) => (
          <Link
            key={city.code}
            href={`/city/${encodeURIComponent(city.name)}`}
          >
            <Card className="transition-colors hover:border-primary/50 hover:bg-secondary/30">
              <CardContent className="flex items-center gap-3 p-4">
                <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{city.name}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline" className="text-xs">
                      {city.prefecture}
                    </Badge>
                    <span>約{city.distance}km</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}
