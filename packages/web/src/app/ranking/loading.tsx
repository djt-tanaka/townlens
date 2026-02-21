import { Skeleton } from "@/components/ui/skeleton";

/** ランキング一覧ページのローディング UI */
export default function RankingIndexLoading() {
  return (
    <main className="mx-auto min-h-screen max-w-4xl space-y-12 px-4 py-8">
      {/* ヘッダー */}
      <section className="space-y-2">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-4 w-56" />
      </section>

      {/* プリセット別プレビュー */}
      {Array.from({ length: 3 }).map((_, i) => (
        <section key={i} className="space-y-4">
          <div className="flex items-end justify-between">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-20" />
          </div>
          <div className="rounded-md border">
            <div className="space-y-0 divide-y">
              {Array.from({ length: 5 }).map((_, j) => (
                <div key={j} className="flex items-center gap-4 p-3">
                  <Skeleton className="h-5 w-8" />
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="ml-auto h-5 w-16" />
                </div>
              ))}
            </div>
          </div>
        </section>
      ))}
    </main>
  );
}
