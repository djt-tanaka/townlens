import { BarChart3, Scale, Search } from "lucide-react";

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
] as const;

export function HowItWorksSection() {
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
