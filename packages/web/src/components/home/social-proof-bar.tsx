import { BarChart3, CircleDollarSign, MapPin, TrendingUp } from "lucide-react";

const stats = [
  { value: "1,741", label: "市区町村をカバー", icon: MapPin },
  { value: "7", label: "分析カテゴリ", icon: BarChart3 },
  { value: "15+", label: "統計指標", icon: TrendingUp },
  { value: "0円", label: "から始められる", icon: CircleDollarSign },
] as const;

export function SocialProofBar() {
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
