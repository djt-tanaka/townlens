import Link from "next/link";
import { ChevronRight, MapPin } from "lucide-react";
import { REGIONAL_BLOCKS } from "@/lib/prefecture-data";

export function PrefectureSection() {
  return (
    <section className="border-t px-4 py-16">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-end justify-between">
          <div className="space-y-1">
            <h2 className="text-2xl font-black tracking-tight">
              都道府県から探す
            </h2>
            <p className="text-sm text-muted-foreground">
              地方ブロック別に47都道府県の市区町村を比較できます
            </p>
          </div>
          <Link
            href="/prefecture"
            className="hidden items-center gap-1 text-sm font-medium text-primary hover:underline sm:flex"
          >
            すべて見る
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {REGIONAL_BLOCKS.map((block) => (
            <div key={block.name} className="space-y-2">
              <h3 className="text-xs font-bold text-muted-foreground">
                {block.name}
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {block.prefectures.map((pref) => (
                  <Link
                    key={pref.code}
                    href={`/prefecture/${encodeURIComponent(pref.name)}`}
                    className="inline-flex items-center gap-1 rounded-md border border-border/50 bg-card px-2.5 py-1 text-sm transition-colors hover:border-primary/50 hover:bg-secondary/50"
                  >
                    <MapPin className="h-3 w-3 text-muted-foreground" />
                    {pref.name}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-center sm:hidden">
          <Link
            href="/prefecture"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            都道府県一覧を見る
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
