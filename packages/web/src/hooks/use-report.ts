"use client";

import { useState, useCallback } from "react";
import type { CreateReportRequest, CreateReportResponse } from "@/types";

interface UseReportReturn {
  readonly createReport: (
    request: CreateReportRequest,
  ) => Promise<CreateReportResponse>;
  readonly isLoading: boolean;
  readonly error: string | null;
}

/** レポート生成フック。POST /api/reports を呼び出す */
export function useReport(): UseReportReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createReport = useCallback(
    async (request: CreateReportRequest): Promise<CreateReportResponse> => {
      setIsLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/reports", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(request),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => null);
          const message =
            body && typeof body === "object" && "error" in body
              ? String(body.error)
              : "レポート生成に失敗しました";
          throw new Error(message);
        }

        return (await res.json()) as CreateReportResponse;
      } catch (err: unknown) {
        const message =
          err instanceof Error
            ? err.message
            : "レポート生成中にエラーが発生しました";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  return { createReport, isLoading, error };
}
