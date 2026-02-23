import { X } from "lucide-react";

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
] as const;

export function PainPointSection() {
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
