"use client";

import { useState, useEffect } from "react";
import { useDebounce } from "./use-debounce";
import type { CitySearchResponse } from "@/types";

type CityResult = CitySearchResponse["cities"][number];

interface UseCitySearchReturn {
  readonly results: ReadonlyArray<CityResult>;
  readonly isLoading: boolean;
  readonly error: string | null;
}

/** 都市検索フック。2文字以上の入力で /api/cities/search を呼び出す */
export function useCitySearch(query: string): UseCitySearchReturn {
  const debouncedQuery = useDebounce(query, 300);
  const [results, setResults] = useState<ReadonlyArray<CityResult>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (debouncedQuery.length < 2) {
      setResults([]);
      setError(null);
      return;
    }

    const controller = new AbortController();
    setIsLoading(true);
    setError(null);

    fetch(
      `/api/cities/search?q=${encodeURIComponent(debouncedQuery)}`,
      { signal: controller.signal },
    )
      .then((res) => {
        if (!res.ok) {
          throw new Error("検索に失敗しました");
        }
        return res.json() as Promise<CitySearchResponse>;
      })
      .then((data) => {
        setResults(data.cities);
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === "AbortError") return;
        setError(
          err instanceof Error ? err.message : "検索中にエラーが発生しました",
        );
        setResults([]);
      })
      .finally(() => {
        setIsLoading(false);
      });

    return () => controller.abort();
  }, [debouncedQuery]);

  return { results, isLoading, error };
}
