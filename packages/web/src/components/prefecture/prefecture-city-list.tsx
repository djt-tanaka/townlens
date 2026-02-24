import { PrefectureCityCard } from "./prefecture-city-card";
import type { PrefectureCityEntry } from "@/lib/prefecture-data";

interface PrefectureCityListProps {
  readonly cities: ReadonlyArray<PrefectureCityEntry>;
}

/** 都道府県内の市区町村一覧（area_code 順） */
export function PrefectureCityList({ cities }: PrefectureCityListProps) {
  const sorted = [...cities].sort((a, b) =>
    a.areaCode.localeCompare(b.areaCode),
  );

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-bold">
        市区町村一覧（{cities.length}件）
      </h2>
      <div className="space-y-3">
        {sorted.map((city) => (
          <PrefectureCityCard
            key={city.areaCode}
            cityName={city.cityName}
            population={city.population}
            kidsRatio={city.kidsRatio}
          />
        ))}
      </div>
    </section>
  );
}
