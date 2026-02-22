"use client";

import { useMemo, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PrefectureCityCard } from "./prefecture-city-card";
import type { CityPageData } from "@/lib/city-data";

/** タブに表示するプリセット情報 */
const PRESET_TABS = [
  { index: 0, value: "childcare", label: "子育て重視" },
  { index: 1, value: "price", label: "価格重視" },
  { index: 2, value: "safety", label: "安全重視" },
] as const;

interface PrefectureCityListProps {
  readonly cities: ReadonlyArray<CityPageData>;
}

function sortByPreset(
  cities: ReadonlyArray<CityPageData>,
  presetIndex: number,
): ReadonlyArray<CityPageData> {
  return [...cities].sort((a, b) => {
    const aRating = a.presetScores[presetIndex]?.score.starRating ?? 0;
    const bRating = b.presetScores[presetIndex]?.score.starRating ?? 0;
    return bRating - aRating;
  });
}

/** プリセットタブ切り替え付き都市ランキングリスト */
export function PrefectureCityList({ cities }: PrefectureCityListProps) {
  const [activePreset, setActivePreset] = useState("childcare");

  const activeIndex =
    PRESET_TABS.find((t) => t.value === activePreset)?.index ?? 0;

  const sortedCities = useMemo(
    () => sortByPreset(cities, activeIndex),
    [cities, activeIndex],
  );

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">
          市区町村ランキング（{cities.length}件）
        </h2>
      </div>
      <Tabs value={activePreset} onValueChange={setActivePreset}>
        <TabsList>
          {PRESET_TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {PRESET_TABS.map((tab) => (
          <TabsContent key={tab.value} value={tab.value}>
            <div className="space-y-8">
              {sortedCities.map((city, index) => (
                <PrefectureCityCard
                  key={city.areaCode}
                  cityName={city.cityName}
                  population={city.population}
                  kidsRatio={city.kidsRatio}
                  starRating={
                    city.presetScores[tab.index]?.score.starRating ?? 0
                  }
                  rank={index + 1}
                />
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </section>
  );
}
