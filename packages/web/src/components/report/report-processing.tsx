"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

const POLL_INTERVAL_MS = 3000;

/**
 * レポート処理中に表示するコンポーネント。
 * 3秒間隔でステータスを確認し、完了したらページをリフレッシュする。
 */
export function ReportProcessing({ reportId }: { readonly reportId: string }) {
  const router = useRouter();

  useEffect(() => {
    const timer = setInterval(async () => {
      try {
        const res = await fetch(`/api/reports/${reportId}`);
        if (res.status !== 202) {
          // 処理完了（成功 or 失敗）→ サーバーコンポーネントを再描画
          router.refresh();
        }
      } catch {
        // ネットワークエラーは無視して次のポーリングで再試行
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [reportId, router]);

  return (
    <main className="mx-auto max-w-4xl px-4 py-12">
      <div className="flex flex-col items-center gap-4 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <h1 className="text-xl font-semibold">レポート生成中...</h1>
        <p className="text-muted-foreground">
          しばらくお待ちください。通常1〜2分で完了します。
        </p>
        <p className="text-xs text-muted-foreground/60">
          自動的に更新されます
        </p>
      </div>
    </main>
  );
}
