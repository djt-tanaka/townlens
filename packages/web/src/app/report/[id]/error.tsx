"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { ErrorDisplay } from "@/components/error/error-display";

interface ErrorProps {
  readonly error: Error & { digest?: string };
  readonly reset: () => void;
}

/** レポートページのエラーバウンダリ */
export default function ReportError({ error, reset }: ErrorProps) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <ErrorDisplay
      description="レポートの表示中に問題が発生しました。しばらく経ってから再度お試しください。"
      onReset={reset}
      showHomeLink
      showDashboardLink
    />
  );
}
