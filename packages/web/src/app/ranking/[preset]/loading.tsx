import { Skeleton } from "@/components/ui/skeleton";

/** プリセット別ランキングページのローディング UI */
export default function PresetRankingLoading() {
  return (
    <main className="mx-auto min-h-screen max-w-4xl space-y-8 px-4 py-8">
      {/* ヘッダー */}
      <section className="space-y-2">
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-4 w-48" />
      </section>

      {/* ランキングテーブル */}
      <div className="rounded-md border">
        <div className="space-y-0 divide-y">
          {/* ヘッダー行 */}
          <div className="flex items-center gap-4 bg-muted/50 p-3">
            <Skeleton className="h-4 w-8" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="ml-auto h-4 w-20" />
          </div>
          {/* データ行 */}
          {Array.from({ length: 15 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-3">
              <Skeleton className="h-5 w-8" />
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-5 w-16" />
              <Skeleton className="ml-auto h-5 w-16" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
