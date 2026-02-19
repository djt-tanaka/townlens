"use client";

import { useEffect } from "react";
import { ErrorDisplay } from "@/components/error/error-display";

interface ErrorProps {
  readonly error: Error & { digest?: string };
  readonly reset: () => void;
}

/** ルートレベルのエラーバウンダリ。専用 error.tsx を持たないページのエラーをキャッチ */
export default function RootError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error("アプリケーションエラー:", error);
  }, [error]);

  return (
    <ErrorDisplay
      description="予期しないエラーが発生しました。しばらく経ってから再度お試しください。"
      onReset={reset}
      showHomeLink
    />
  );
}
