import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, ChevronRight, MapPin, Scale, Shield } from "lucide-react";
import { CitySearch } from "@/components/search/city-search";
import { REGIONAL_BLOCKS } from "@/lib/prefecture-data";

export const metadata: Metadata = {
  title: { absolute: "TownLens - 街えらびレポート" },
  description:
    "不動産サイトの口コミではなく、政府統計の数字で子育て・安全・価格・災害リスクを比べられます。",
  openGraph: {
    title: "TownLens - 街えらびレポート",
    description:
      "不動産サイトの口コミではなく、政府統計の数字で子育て・安全・価格・災害リスクを比べられます。",
    images: [{ url: "/api/og", width: 1200, height: 630 }],
  },
};

export default function Home() {
  return (
    <main className="flex flex-1 flex-col">
      {/* Hero + 検索セクション */}
      <section className="flex flex-col items-center gap-8 px-4 py-20 sm:py-28">
        <h1 className="text-center text-3xl font-black tracking-tight sm:text-5xl leading-tight">
          家族で住む街を、
          <br className="sm:hidden" />
          丁寧に選ぼう。
        </h1>
        <p className="max-w-md text-center text-muted-foreground leading-relaxed">
          不動産サイトの口コミではなく、政府統計の数字で
          <br className="hidden sm:inline" />
          子育て・安全・価格・災害リスクを比べられます。
        </p>
        <Suspense>
          <CitySearch />
        </Suspense>
      </section>

      {/* 都道府県から探すセクション */}
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

      {/* 特徴セクション */}
      <section className="border-t bg-secondary/30 px-4 py-16">
        <div className="mx-auto grid max-w-4xl gap-8 sm:grid-cols-3">
          <FeatureCard
            icon={<BarChart3 className="h-6 w-6 text-primary" />}
            title="政府統計ベース"
            description="e-Stat（政府統計総合窓口）のデータを使用。信頼性の高い統計に基づく分析。"
          />
          <FeatureCard
            icon={<Scale className="h-6 w-6 text-primary" />}
            title="多指標スコアリング"
            description="人口・住宅価格・安全性・災害リスクを総合的にスコアリング。"
          />
          <FeatureCard
            icon={<Shield className="h-6 w-6 text-primary" />}
            title="中立的・客観的"
            description="不動産業者の影響を受けない、データに基づく客観的な比較レポート。"
          />
        </div>
      </section>
    </main>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  readonly icon: React.ReactNode;
  readonly title: string;
  readonly description: string;
}) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-border/50 bg-card p-6 text-center">
      <div className="rounded-xl bg-primary/10 p-3">
        {icon}
      </div>
      <h3 className="font-bold">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}
