"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2 } from "lucide-react";
import { ALL_PRESETS } from "@townlens/core";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { useCitySearch } from "@/hooks/use-city-search";
import { useReport } from "@/hooks/use-report";
import { CityTag } from "./city-tag";
import type { CitySearchResponse } from "@/types";

type CityResult = CitySearchResponse["cities"][number];

interface SelectedCity {
  readonly code: string;
  readonly name: string;
  readonly prefecture: string;
}

const MAX_CITIES = 5;

export function CitySearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectedCities, setSelectedCities] = useState<
    ReadonlyArray<SelectedCity>
  >([]);
  const [selectedPreset, setSelectedPreset] = useState(ALL_PRESETS[0].name);
  const { results, isLoading: isSearching } = useCitySearch(query);
  const { createReport, isLoading: isGenerating, error } = useReport();

  const handleSelectCity = (city: CityResult) => {
    if (selectedCities.some((c) => c.code === city.code)) return;
    if (selectedCities.length >= MAX_CITIES) return;
    setSelectedCities((prev) => [...prev, city]);
    setQuery("");
  };

  const handleRemoveCity = (code: string) => {
    setSelectedCities((prev) => prev.filter((c) => c.code !== code));
  };

  const handleSubmit = async () => {
    if (selectedCities.length < 2) return;
    try {
      const response = await createReport({
        cities: selectedCities.map((c) => c.name),
        preset: selectedPreset,
      });
      router.push(`/report/${response.reportId}`);
    } catch {
      // useReport 内でエラー状態を管理
    }
  };

  const availableResults = results.filter(
    (r) => !selectedCities.some((c) => c.code === r.code),
  );

  return (
    <div className="w-full max-w-xl space-y-4">
      {/* 選択済み都市 */}
      {selectedCities.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedCities.map((city) => (
            <CityTag
              key={city.code}
              name={city.name}
              prefecture={city.prefecture}
              onRemove={() => handleRemoveCity(city.code)}
            />
          ))}
        </div>
      )}

      {/* 都市検索 */}
      {selectedCities.length < MAX_CITIES && (
        <Command className="rounded-lg border shadow-sm" shouldFilter={false}>
          <CommandInput
            placeholder="市区町村名を入力..."
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            {query.length >= 2 && (
              <>
                {isSearching && (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-sm text-muted-foreground">
                      検索中...
                    </span>
                  </div>
                )}
                {!isSearching && availableResults.length === 0 && (
                  <CommandEmpty>該当する市区町村がありません</CommandEmpty>
                )}
                {!isSearching && availableResults.length > 0 && (
                  <CommandGroup heading="検索結果">
                    {availableResults.map((city) => (
                      <CommandItem
                        key={city.code}
                        value={`${city.prefecture}${city.name}`}
                        onSelect={() => handleSelectCity(city)}
                      >
                        <Search className="mr-2 h-4 w-4 text-muted-foreground" />
                        <span>
                          {city.prefecture} {city.name}
                        </span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
              </>
            )}
          </CommandList>
        </Command>
      )}

      {/* プリセット選択 */}
      <div className="flex flex-wrap gap-2">
        {ALL_PRESETS.map((preset) => (
          <Button
            key={preset.name}
            variant={selectedPreset === preset.name ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedPreset(preset.name)}
          >
            {preset.label}
          </Button>
        ))}
      </div>

      {/* エラー表示 */}
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      {/* 比較ボタン */}
      <Button
        className="w-full"
        size="lg"
        onClick={handleSubmit}
        disabled={selectedCities.length < 2 || isGenerating}
      >
        {isGenerating ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            レポート生成中...
          </>
        ) : (
          `比較する（${selectedCities.length}/2〜${MAX_CITIES}都市）`
        )}
      </Button>
    </div>
  );
}
