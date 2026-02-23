import { Suspense } from "react";
import { Database } from "lucide-react";
import { CitySearch } from "@/components/search/city-search";

export function HeroSection() {
  return (
    <section className="relative flex flex-col items-center gap-6 px-4 pb-16 pt-16 sm:pb-20 sm:pt-24">
      {/* アクセントライン */}
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-warm-coral/60 to-transparent" />

      <p className="inline-flex items-center gap-1.5 rounded-full border border-warm-coral/30 bg-warm-coral-bg px-3.5 py-1 text-xs font-bold text-warm-coral sm:text-sm">
        <Database className="h-3.5 w-3.5" />
        e-Stat 政府統計 + 不動産情報ライブラリ連携
      </p>

      <h1 className="max-w-2xl text-center text-3xl font-black leading-tight tracking-tight sm:text-5xl sm:leading-[1.15]">
        「なんとなく」で街を選んで
        <br />
        <span className="text-warm-coral">後悔していませんか？</span>
      </h1>

      <p className="max-w-lg text-center text-base leading-relaxed text-muted-foreground sm:text-lg">
        TownLensは<strong className="text-foreground">政府統計データ</strong>で
        全国の市区町村を
        <strong className="text-foreground">7カテゴリ・客観スコア</strong>
        で比較。
        <br className="hidden sm:inline" />
        口コミに頼らない、データドリブンな街えらびを。
      </p>

      <Suspense>
        <CitySearch />
      </Suspense>

      <p className="text-xs text-muted-foreground">
        2都市以上を選んで比較 &mdash; 無料で使えます
      </p>
    </section>
  );
}
