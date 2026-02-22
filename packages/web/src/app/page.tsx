import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import {
  Baby,
  BarChart3,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  CloudLightning,
  Database,
  GraduationCap,
  Heart,
  MapPin,
  Scale,
  Search,
  Shield,
  Stethoscope,
  TrainFront,
  TrendingUp,
  X,
} from "lucide-react";
import { CitySearch } from "@/components/search/city-search";
import { REGIONAL_BLOCKS } from "@/lib/prefecture-data";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: { absolute: "TownLens - 政府統計で街を比較。データで選ぶ、後悔しない街えらび。" },
  description:
    "口コミや主観ではなく、e-Stat政府統計・不動産情報ライブラリの客観データで全国1,741市区町村を7カテゴリでスコアリング。子育て・安全・価格・災害リスク・教育・交通・医療を数値で比較し、あなたに合った街が見つかります。",
  openGraph: {
    title: "TownLens - 政府統計で街を比較。データで選ぶ、後悔しない街えらび。",
    description:
      "口コミや主観ではなく、e-Stat政府統計・不動産情報ライブラリの客観データで全国1,741市区町村を7カテゴリでスコアリング。",
    images: [{ url: "/api/og", width: 1200, height: 630 }],
  },
};

/* ------------------------------------------------------------------ */
/*  メインページ                                                       */
/* ------------------------------------------------------------------ */
export default function Home() {
  return (
    <main className="flex flex-1 flex-col">
      <HeroSection />
      <SocialProofBar />
      <PainPointSection />
      <HowItWorksSection />
      <CategorySection />
      <ComparisonSection />
      <UseCaseSection />
      <DataTrustSection />
      <PrefectureSection />
      <FinalCTASection />
    </main>
  );
}

/* ================================================================== */
/*  Hero                                                               */
/* ================================================================== */
function HeroSection() {
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

/* ================================================================== */
/*  ソーシャルプルーフバー                                              */
/* ================================================================== */
function SocialProofBar() {
  const stats = [
    { value: "1,741", label: "市区町村をカバー", icon: MapPin },
    { value: "7", label: "分析カテゴリ", icon: BarChart3 },
    { value: "15+", label: "統計指標", icon: TrendingUp },
    { value: "0円", label: "から始められる", icon: CircleDollarSign },
  ];

  return (
    <section className="border-y bg-secondary/40 px-4 py-6">
      <div className="mx-auto grid max-w-4xl grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-8">
        {stats.map((s) => (
          <div key={s.label} className="flex flex-col items-center gap-1 text-center">
            <s.icon className="mb-1 h-5 w-5 text-primary" />
            <span className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">
              {s.value}
            </span>
            <span className="text-xs text-muted-foreground">{s.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ================================================================== */
/*  ペインポイント（課題提起）                                          */
/* ================================================================== */
function PainPointSection() {
  const pains = [
    {
      icon: X,
      title: "口コミは主観的",
      description:
        "不動産サイトの口コミは投稿者の主観。少数の意見が全体の印象を左右します。",
    },
    {
      icon: X,
      title: "情報が散在",
      description:
        "人口統計、犯罪データ、不動産価格、災害リスク…調べるサイトがバラバラで比較が困難。",
    },
    {
      icon: X,
      title: "不動産会社の情報はポジショントーク",
      description:
        "売りたい・貸したい側の情報は、どうしてもバイアスがかかります。",
    },
  ];

  return (
    <section className="px-4 py-16 sm:py-20">
      <div className="mx-auto max-w-4xl">
        <p className="mb-2 text-center text-sm font-bold text-warm-coral">PROBLEM</p>
        <h2 className="mb-4 text-center text-2xl font-black tracking-tight sm:text-3xl">
          街えらび、こんな不満はありませんか？
        </h2>
        <p className="mb-10 text-center text-sm text-muted-foreground">
          引越し・住み替えの情報収集で多くの人がぶつかる壁
        </p>

        <div className="grid gap-6 sm:grid-cols-3">
          {pains.map((p) => (
            <div
              key={p.title}
              className="rounded-2xl border border-destructive/20 bg-destructive/[0.03] p-6"
            >
              <div className="mb-3 inline-flex rounded-lg bg-destructive/10 p-2">
                <p.icon className="h-5 w-5 text-destructive" />
              </div>
              <h3 className="mb-2 font-bold">{p.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {p.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ================================================================== */
/*  使い方 3ステップ                                                    */
/* ================================================================== */
function HowItWorksSection() {
  const steps = [
    {
      num: "1",
      icon: Search,
      title: "比較したい都市を検索",
      description: "市区町村名を入力して2〜5都市を選択。全国1,741市区町村に対応しています。",
    },
    {
      num: "2",
      icon: Scale,
      title: "優先したい観点を選ぶ",
      description:
        "「子育て重視」「価格重視」「安全重視」のプリセットから、あなたの価値観に合った重み付けを選べます。",
    },
    {
      num: "3",
      icon: BarChart3,
      title: "比較レポートを受け取る",
      description:
        "総合スコア・レーダーチャート・指標ごとの詳細比較を含むレポートが即座に生成されます。",
    },
  ];

  return (
    <section className="border-t bg-secondary/30 px-4 py-16 sm:py-20">
      <div className="mx-auto max-w-4xl">
        <p className="mb-2 text-center text-sm font-bold text-primary">HOW IT WORKS</p>
        <h2 className="mb-4 text-center text-2xl font-black tracking-tight sm:text-3xl">
          かんたん3ステップで比較レポート
        </h2>
        <p className="mb-10 text-center text-sm text-muted-foreground">
          会員登録不要ですぐに始められます
        </p>

        <div className="grid gap-8 sm:grid-cols-3">
          {steps.map((s) => (
            <div key={s.num} className="relative flex flex-col items-center text-center">
              {/* ステップ番号 */}
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-xl font-black text-primary-foreground">
                {s.num}
              </div>
              <s.icon className="mb-3 h-6 w-6 text-primary" />
              <h3 className="mb-2 text-lg font-bold">{s.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {s.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ================================================================== */
/*  7カテゴリ分析                                                      */
/* ================================================================== */
function CategorySection() {
  const categories = [
    {
      icon: Baby,
      name: "子育て環境",
      description: "0-14歳比率・保育施設の充実度",
      color: "text-pink-600",
      bg: "bg-pink-50",
    },
    {
      icon: CircleDollarSign,
      name: "住宅価格",
      description: "中古マンション価格中央値",
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      icon: Shield,
      name: "治安",
      description: "刑法犯認知件数（人口千人当たり）",
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      icon: CloudLightning,
      name: "災害リスク",
      description: "洪水・土砂リスク・避難場所数",
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
    {
      icon: GraduationCap,
      name: "教育",
      description: "小中学校の充実度（人口比）",
      color: "text-violet-600",
      bg: "bg-violet-50",
    },
    {
      icon: TrainFront,
      name: "交通利便性",
      description: "鉄道駅数・ターミナル駅距離",
      color: "text-sky-600",
      bg: "bg-sky-50",
    },
    {
      icon: Stethoscope,
      name: "医療",
      description: "病院・診療所・小児科の充実度",
      color: "text-rose-600",
      bg: "bg-rose-50",
    },
  ];

  return (
    <section className="px-4 py-16 sm:py-20">
      <div className="mx-auto max-w-4xl">
        <p className="mb-2 text-center text-sm font-bold text-primary">7 CATEGORIES</p>
        <h2 className="mb-4 text-center text-2xl font-black tracking-tight sm:text-3xl">
          暮らしに関わる7つの観点を数値で比較
        </h2>
        <p className="mb-10 text-center text-sm text-muted-foreground">
          すべて政府統計・公的データに基づく客観指標です
        </p>

        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {categories.map((c) => (
            <div
              key={c.name}
              className="flex items-start gap-3 rounded-xl border border-border/50 bg-card p-4 transition-colors hover:border-primary/30"
            >
              <div className={`shrink-0 rounded-lg p-2 ${c.bg}`}>
                <c.icon className={`h-5 w-5 ${c.color}`} />
              </div>
              <div>
                <h3 className="text-sm font-bold">{c.name}</h3>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                  {c.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ================================================================== */
/*  競合比較                                                           */
/* ================================================================== */
function ComparisonSection() {
  const rows = [
    { label: "データの客観性", townlens: true, review: false, ai: false },
    { label: "出典の透明性", townlens: true, review: false, ai: false },
    { label: "多指標の同時比較", townlens: true, review: false, ai: false },
    { label: "自分の優先度で重み付け", townlens: true, review: false, ai: false },
    { label: "PDF保存・共有", townlens: true, review: false, ai: false },
    { label: "信頼度評価つき", townlens: true, review: false, ai: false },
  ];

  return (
    <section className="border-t bg-secondary/30 px-4 py-16 sm:py-20">
      <div className="mx-auto max-w-3xl">
        <p className="mb-2 text-center text-sm font-bold text-primary">WHY TOWNLENS</p>
        <h2 className="mb-4 text-center text-2xl font-black tracking-tight sm:text-3xl">
          なぜ口コミやAI検索ではダメなのか
        </h2>
        <p className="mb-10 text-center text-sm text-muted-foreground">
          街えらびに「根拠のある数字」が必要な理由
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-3 pr-4 font-bold" />
                <th className="pb-3 px-4 text-center font-black text-primary">
                  TownLens
                </th>
                <th className="pb-3 px-4 text-center font-bold text-muted-foreground">
                  口コミサイト
                </th>
                <th className="pb-3 pl-4 text-center font-bold text-muted-foreground">
                  AI検索
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.label} className="border-b border-border/50">
                  <td className="py-3 pr-4 text-muted-foreground">{r.label}</td>
                  <td className="py-3 px-4 text-center">
                    {r.townlens ? (
                      <CheckCircle2 className="mx-auto h-5 w-5 text-primary" />
                    ) : (
                      <span className="text-muted-foreground">&mdash;</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {r.review ? (
                      <CheckCircle2 className="mx-auto h-5 w-5 text-primary" />
                    ) : (
                      <span className="text-muted-foreground">&mdash;</span>
                    )}
                  </td>
                  <td className="py-3 pl-4 text-center">
                    {r.ai ? (
                      <CheckCircle2 className="mx-auto h-5 w-5 text-primary" />
                    ) : (
                      <span className="text-muted-foreground">&mdash;</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

/* ================================================================== */
/*  ユースケース                                                       */
/* ================================================================== */
function UseCaseSection() {
  const cases = [
    {
      icon: Baby,
      persona: "子育て世帯",
      headline: "「子どもが小学校に上がる前に引越したい」",
      description:
        "保育園の入りやすさ、小児科の数、治安、通学路の安全…子育てに関わるデータをまとめてスコアリング。「子育て重視」プリセットで、あなたの家族に最適な街が見つかります。",
      preset: "子育て重視",
    },
    {
      icon: CircleDollarSign,
      persona: "住宅購入検討者",
      headline: "「予算内で一番いい街はどこ？」",
      description:
        "中古マンション価格を軸に、周辺の生活インフラもまとめて比較。住宅価格だけでなく、暮らしやすさの総合コスパがわかります。",
      preset: "価格重視",
    },
    {
      icon: Shield,
      persona: "安全性を重視する方",
      headline: "「自然災害や犯罪が少ない場所に住みたい」",
      description:
        "犯罪率、洪水・土砂リスク、避難場所の充実度を定量比較。「安全重視」プリセットで、安心して暮らせる街がデータで見えてきます。",
      preset: "安全重視",
    },
  ];

  return (
    <section className="px-4 py-16 sm:py-20">
      <div className="mx-auto max-w-4xl">
        <p className="mb-2 text-center text-sm font-bold text-warm-coral">USE CASES</p>
        <h2 className="mb-4 text-center text-2xl font-black tracking-tight sm:text-3xl">
          こんな方に使われています
        </h2>
        <p className="mb-10 text-center text-sm text-muted-foreground">
          ライフスタイルに合わせた重み付けで、あなただけの比較を
        </p>

        <div className="grid gap-6 sm:grid-cols-3">
          {cases.map((c) => (
            <div
              key={c.persona}
              className="flex flex-col rounded-2xl border border-border/50 bg-card p-6"
            >
              <div className="mb-4 inline-flex self-start rounded-xl bg-primary/10 p-3">
                <c.icon className="h-6 w-6 text-primary" />
              </div>
              <span className="mb-1 text-xs font-bold text-primary">{c.persona}</span>
              <h3 className="mb-3 text-base font-bold leading-snug">{c.headline}</h3>
              <p className="flex-1 text-sm leading-relaxed text-muted-foreground">
                {c.description}
              </p>
              <div className="mt-4 inline-flex self-start rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs font-bold text-primary">
                {c.preset}プリセットがおすすめ
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ================================================================== */
/*  データ信頼性                                                       */
/* ================================================================== */
function DataTrustSection() {
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

/* ================================================================== */
/*  都道府県から探す                                                    */
/* ================================================================== */
function PrefectureSection() {
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

/* ================================================================== */
/*  最終CTA                                                           */
/* ================================================================== */
function FinalCTASection() {
  return (
    <section className="border-t bg-gradient-to-b from-secondary/30 to-background px-4 py-20 sm:py-24">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="mb-4 text-2xl font-black tracking-tight sm:text-3xl">
          データで選べば、街えらびは変わる。
        </h2>
        <p className="mb-8 text-muted-foreground">
          口コミに頼らない、後悔しない街えらびを今すぐ始めましょう。
          <br />
          無料プランで月3回までレポート生成できます。
        </p>
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Button
            size="lg"
            className="bg-warm-coral text-white hover:bg-warm-coral/90"
            asChild
          >
            <Link href="#top">
              <Search className="mr-2 h-4 w-4" />
              街を比較してみる
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/ranking">
              <Heart className="mr-2 h-4 w-4" />
              ランキングを見る
            </Link>
          </Button>
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
            会員登録不要で比較可能
          </span>
          <span className="flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
            無料プランあり
          </span>
          <span className="flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
            全国1,741市区町村対応
          </span>
        </div>
      </div>
    </section>
  );
}
