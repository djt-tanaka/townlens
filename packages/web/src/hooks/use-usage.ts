"use client";

import { useState, useEffect, useCallback } from "react";
import type { UsageResponse } from "@/types";

interface UseUsageReturn {
  readonly usage: UsageResponse | null;
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly refetch: () => void;
}

/** 利用量取得フック。GET /api/usage を呼び出す */
export function useUsage(): UseUsageReturn {
  const [usage, setUsage] = useState<UsageResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchCount, setFetchCount] = useState(0);

  const refetch = useCallback(() => {
    setFetchCount((prev) => prev + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);

    fetch("/api/usage", { signal: controller.signal })
      .then((res) => {
        if (res.status === 401) {
          setUsage(null);
          return null;
        }
        if (!res.ok) {
          throw new Error("利用量の取得に失敗しました");
        }
        return res.json() as Promise<UsageResponse>;
      })
      .then((data) => {
        if (data) setUsage(data);
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === "AbortError") return;
        setError(
          err instanceof Error
            ? err.message
            : "利用量取得中にエラーが発生しました",
        );
      })
      .finally(() => {
        setIsLoading(false);
      });

    return () => controller.abort();
  }, [fetchCount]);

  return { usage, isLoading, error, refetch };
}
