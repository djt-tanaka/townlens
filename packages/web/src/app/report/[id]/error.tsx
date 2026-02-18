"use client";

import { useEffect } from "react";

interface ErrorProps {
  readonly error: Error & { digest?: string };
  readonly reset: () => void;
}

/** レポートページのエラーバウンダリ */
export default function ReportError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error("レポートページエラー:", error);
  }, [error]);

  return (
    <main className="mx-auto max-w-4xl px-4 py-12">
      <div className="flex flex-col items-center gap-4 text-center">
        <h1 className="text-xl font-semibold text-destructive">
          エラーが発生しました
        </h1>
        <p className="text-muted-foreground">
          レポートの表示中に問題が発生しました。しばらく経ってから再度お試しください。
        </p>
        <button
          type="button"
          onClick={reset}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          再試行
        </button>
      </div>
    </main>
  );
}
