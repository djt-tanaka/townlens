import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

/** ダッシュボードページのローディング UI（Suspense fallback） */
export default function DashboardLoading() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      {/* タイトル */}
      <Skeleton className="mb-6 h-8 w-48" />

      {/* 利用量カード */}
      <div className="mb-8 grid gap-6 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-12" />
              </div>
              <Skeleton className="h-2 w-full rounded-full" />
            </div>
            <div className="flex justify-between">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* レポート履歴テーブル */}
      <div className="space-y-3">
        <Skeleton className="h-6 w-32" />
        <div className="rounded-md border">
          <div className="space-y-0 divide-y">
            {/* ヘッダー行 */}
            <div className="flex gap-4 p-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16" />
            </div>
            {/* データ行 */}
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex gap-4 p-3">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-5 w-14 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
