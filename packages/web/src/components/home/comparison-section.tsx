import { CheckCircle2 } from "lucide-react";

const rows = [
  { label: "データの客観性", townlens: true, review: false, ai: false },
  { label: "出典の透明性", townlens: true, review: false, ai: false },
  { label: "多指標の同時比較", townlens: true, review: false, ai: false },
  { label: "自分の優先度で重み付け", townlens: true, review: false, ai: false },
  { label: "PDF保存・共有", townlens: true, review: false, ai: false },
  { label: "信頼度評価つき", townlens: true, review: false, ai: false },
] as const;

export function ComparisonSection() {
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
