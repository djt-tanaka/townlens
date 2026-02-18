import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

/** レポートページのローディング UI（Suspense fallback） */
export default function ReportLoading() {
  return (
    <main className="mx-auto max-w-4xl space-y-8 px-4 py-8">
      {/* ヘッダー */}
      <header>
        <Skeleton className="h-8 w-72" />
        <Skeleton className="mt-2 h-4 w-48" />
      </header>

      {/* サマリーセクション */}
      <section className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          {/* ランキングカード */}
          <div className="space-y-3">
            <Skeleton className="h-6 w-48" />
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-7 w-7 rounded-full" />
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="ml-auto h-5 w-16" />
                  </div>
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-10 w-20" />
                </CardContent>
              </Card>
            ))}
          </div>

          {/* レーダーチャート */}
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[350px] w-full rounded" />
            </CardContent>
          </Card>
        </div>

        {/* 比較ナラティブ */}
        <Skeleton className="h-20 w-full rounded-lg" />
      </section>

      {/* 指標ダッシュボード */}
      <section className="space-y-6">
        <Skeleton className="h-6 w-40" />
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[300px] w-full rounded" />
          </CardContent>
        </Card>
      </section>

      {/* 都市詳細 */}
      <section className="space-y-4">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-10 w-full rounded" />
        <div className="flex justify-center py-4">
          <Skeleton className="h-40 w-40 rounded-full" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-5 w-20" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}
