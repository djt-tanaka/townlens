import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

/** 都道府県詳細ページのローディング UI */
export default function PrefectureDetailLoading() {
  return (
    <main className="mx-auto min-h-screen max-w-4xl space-y-8 px-4 py-8">
      {/* パンくず */}
      <Skeleton className="h-4 w-28" />

      {/* ヘッダー */}
      <section className="space-y-2">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-4 w-56" />
      </section>

      {/* 都市カードリスト */}
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-5 w-16" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-20" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
}
