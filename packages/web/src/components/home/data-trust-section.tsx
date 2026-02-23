import { BookOpen, CheckCircle2, Database } from "lucide-react";

export function DataTrustSection() {
  return (
    <section className="border-t bg-secondary/30 px-4 py-16 sm:py-20">
      <div className="mx-auto max-w-3xl text-center">
        <p className="mb-2 text-sm font-bold text-primary">DATA SOURCES</p>
        <h2 className="mb-4 text-2xl font-black tracking-tight sm:text-3xl">
          信頼できるデータだけを使っています
        </h2>
        <p className="mb-10 text-sm text-muted-foreground">
          すべてのスコアは公的機関が公開するオープンデータから算出
        </p>

        <div className="grid gap-6 sm:grid-cols-2">
          <div className="rounded-2xl border border-border/50 bg-card p-6 text-left">
            <div className="mb-3 inline-flex rounded-lg bg-primary/10 p-2">
              <Database className="h-5 w-5 text-primary" />
            </div>
            <h3 className="mb-1 font-bold">e-Stat（政府統計総合窓口）</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              総務省が運営する日本の統計ポータル。人口・世帯・犯罪・教育・医療など、国が収集した信頼性の高い統計データを利用しています。
            </p>
          </div>
          <div className="rounded-2xl border border-border/50 bg-card p-6 text-left">
            <div className="mb-3 inline-flex rounded-lg bg-primary/10 p-2">
              <BookOpen className="h-5 w-5 text-primary" />
            </div>
            <h3 className="mb-1 font-bold">不動産情報ライブラリ</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              国土交通省が提供する不動産取引価格データベース。実際の取引価格に基づくため、広告価格より正確な相場がわかります。
            </p>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <div className="flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
            <CheckCircle2 className="h-4 w-4" />
            データ鮮度を常時チェック
          </div>
          <div className="flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
            <CheckCircle2 className="h-4 w-4" />
            信頼度スコアを各指標に表示
          </div>
        </div>
      </div>
    </section>
  );
}
