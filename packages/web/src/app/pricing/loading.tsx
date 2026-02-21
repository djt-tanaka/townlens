import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

/** 料金プランページのローディング UI */
export default function PricingLoading() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-16">
      <div className="mb-12 text-center">
        <Skeleton className="mx-auto h-9 w-40" />
        <Skeleton className="mx-auto mt-3 h-4 w-64" />
      </div>

      <div className="grid gap-6 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="flex flex-col">
            <CardHeader className="space-y-2">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-10 w-28" />
            </CardHeader>
            <CardContent className="flex-1 space-y-3">
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4 rounded-full" />
                  <Skeleton className="h-4 w-40" />
                </div>
              ))}
              <Skeleton className="mt-4 h-10 w-full rounded-md" />
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
}
