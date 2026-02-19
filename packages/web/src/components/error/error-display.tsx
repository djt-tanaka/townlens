"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorDisplayProps {
  readonly title?: string;
  readonly description?: string;
  readonly onReset?: () => void;
  readonly showHomeLink?: boolean;
  readonly showDashboardLink?: boolean;
}

/** エラーページ共通の表示コンポーネント。各 error.tsx から利用する */
export function ErrorDisplay({
  title = "エラーが発生しました",
  description = "しばらく経ってから再度お試しください。",
  onReset,
  showHomeLink = true,
  showDashboardLink = false,
}: ErrorDisplayProps) {
  return (
    <main className="mx-auto max-w-4xl px-4 py-12">
      <div className="flex flex-col items-center gap-4 text-center">
        <AlertTriangle className="h-10 w-10 text-destructive" />
        <h1 className="text-xl font-semibold text-destructive">{title}</h1>
        <p className="text-muted-foreground">{description}</p>
        <div className="flex gap-3">
          {onReset && (
            <Button onClick={onReset} variant="default">
              再試行
            </Button>
          )}
          {showHomeLink && (
            <Button variant="outline" asChild>
              <Link href="/">トップページに戻る</Link>
            </Button>
          )}
          {showDashboardLink && (
            <Button variant="outline" asChild>
              <Link href="/dashboard">ダッシュボード</Link>
            </Button>
          )}
        </div>
      </div>
    </main>
  );
}
