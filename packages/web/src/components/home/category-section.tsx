import {
  Baby,
  CircleDollarSign,
  CloudLightning,
  GraduationCap,
  Shield,
  Stethoscope,
  TrainFront,
} from "lucide-react";

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
] as const;

export function CategorySection() {
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
