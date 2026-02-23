import { Baby, CircleDollarSign, Shield } from "lucide-react";

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
] as const;

export function UseCaseSection() {
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
