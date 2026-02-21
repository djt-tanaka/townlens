import { Suspense } from "react";
import type { Metadata } from "next";
import { BarChart3, Scale, Shield } from "lucide-react";
import { CitySearch } from "@/components/search/city-search";

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
