import type { WeightPreset } from "@townlens/core";
import { CATEGORY_COLORS } from "@townlens/core";
import type { IndicatorCategory } from "@townlens/core";
import { Card, CardContent } from "@/components/ui/card";

interface ReportHeroProps {
  readonly cityNames: ReadonlyArray<string>;
  readonly preset: WeightPreset;
  readonly createdAt: string;
  readonly hasPriceData: boolean;
  readonly hasCrimeData: boolean;
  readonly hasDisasterData: boolean;
  readonly timeLabel?: string;
}

const categoryOrder: ReadonlyArray<IndicatorCategory> = [
  "childcare",
  "price",
  "safety",
  "disaster",
  "transport",
];

/** レポートのカバーセクション。グラデーションバナー + メタ情報 + カテゴリバッジ */
export function ReportHero({
  cityNames,
  preset,
  createdAt,
  hasPriceData,
  hasCrimeData,
  hasDisasterData,
  timeLabel,
}: ReportHeroProps) {
  const dataSources = ["e-Stat（政府統計総合窓口）"];
  if (hasPriceData || hasCrimeData || hasDisasterData) {
    dataSources.push("不動産情報ライブラリ（国土交通省）");
  }

  return (
    <header className="space-y-6">
      {/* グラデーションバナー */}
      <div className="rounded-2xl bg-gradient-to-r from-emerald-50 via-sky-50 to-violet-50 px-4 py-6 text-center sm:px-8 sm:py-10">
        <h1 className="text-xl font-extrabold tracking-tight text-slate-800 sm:text-3xl">
          {cityNames.join("・")} 比較レポート
        </h1>
        <p className="mt-2 text-base text-slate-500">
          子育て世帯のための街えらびレポート
        </p>
      </div>

      {/* メタ情報カード */}
      <Card>
        <CardContent className="space-y-3 pt-6">
          <MetaRow emoji="🏢" label="対象市区町村">
            <div className="flex flex-wrap gap-2">
              {cityNames.map((name) => (
                <span
                  key={name}
                  className="inline-block rounded-full bg-sky-50 px-3 py-1 text-sm font-semibold text-sky-800"
                >
                  {name}
                </span>
              ))}
            </div>
          </MetaRow>
          <MetaRow emoji="📊" label="プリセット">
            <strong>{preset.label}</strong>
          </MetaRow>
          <MetaRow emoji="📅" label="生成日時">
            {new Date(createdAt).toLocaleDateString("ja-JP")}
          </MetaRow>
          <MetaRow emoji="📁" label="データソース">
            {dataSources.join(" / ")}
          </MetaRow>
          {timeLabel && (
            <MetaRow emoji="🕒" label="時点">
              {timeLabel}
            </MetaRow>
          )}
        </CardContent>
      </Card>

      {/* カテゴリバッジ */}
      <div className="flex flex-wrap justify-center gap-2">
        {categoryOrder.map((cat) => {
          const c = CATEGORY_COLORS[cat];
          return (
            <span
              key={cat}
              className="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold"
              style={{
                backgroundColor: c.light,
                color: c.dark,
                borderColor: `${c.primary}33`,
              }}
            >
              {c.emoji} {c.label}
            </span>
          );
        })}
      </div>
    </header>
  );
}

function MetaRow({
  emoji,
  label,
  children,
}: {
  readonly emoji: string;
  readonly label: string;
  readonly children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 text-sm">
      <span className="text-base">{emoji}</span>
      <span className="min-w-[5rem] shrink-0 font-semibold text-slate-700 sm:min-w-[6rem]">
        {label}
      </span>
      <span className="text-slate-600">{children}</span>
    </div>
  );
}
