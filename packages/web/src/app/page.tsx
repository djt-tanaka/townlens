import { BarChart3, Scale, Shield } from "lucide-react";
import { CitySearch } from "@/components/search/city-search";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col">
      {/* Hero + 検索セクション */}
      <section className="flex flex-col items-center gap-6 px-4 py-16 sm:py-24">
        <h1 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">
          街を比較して、暮らしやすさを見つけよう
        </h1>
        <p className="max-w-lg text-center text-muted-foreground">
          政府統計ベースの中立的・客観的分析で、あなたに合った街を見つけましょう。
        </p>
        <CitySearch />
      </section>

      {/* 特徴セクション */}
      <section className="border-t bg-muted/30 px-4 py-16">
        <div className="mx-auto grid max-w-4xl gap-8 sm:grid-cols-3">
          <FeatureCard
            icon={<BarChart3 className="h-8 w-8 text-primary" />}
            title="政府統計ベース"
            description="e-Stat（政府統計総合窓口）のデータを使用。信頼性の高い統計に基づく分析。"
          />
          <FeatureCard
            icon={<Scale className="h-8 w-8 text-primary" />}
            title="多指標スコアリング"
            description="人口・住宅価格・安全性・災害リスクを総合的にスコアリング。"
          />
          <FeatureCard
            icon={<Shield className="h-8 w-8 text-primary" />}
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
    <div className="flex flex-col items-center gap-3 text-center">
      {icon}
      <h3 className="font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
