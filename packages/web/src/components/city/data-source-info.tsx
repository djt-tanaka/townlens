import { Badge } from "@/components/ui/badge";
import type { CityDataAvailability } from "@/lib/city-data";

interface DataSourceInfoProps {
  readonly dataAvailability: CityDataAvailability;
}

/** データソースと取得状況を表示する小さな情報バー */
export function DataSourceInfo({ dataAvailability }: DataSourceInfoProps) {
  const sources = ["e-Stat（政府統計総合窓口）"];
  if (
    dataAvailability.hasPriceData ||
    dataAvailability.hasDisasterData
  ) {
    sources.push("不動産情報ライブラリ（国土交通省）");
  }

  const categories = [
    { label: "住宅価格", ok: dataAvailability.hasPriceData },
    { label: "安全", ok: dataAvailability.hasCrimeData },
    { label: "災害", ok: dataAvailability.hasDisasterData },
    { label: "教育", ok: dataAvailability.hasEducationData },
    { label: "医療", ok: dataAvailability.hasHealthcareData },
    { label: "交通", ok: dataAvailability.hasTransportData },
  ];

  return (
    <section className="rounded-xl border border-border/50 bg-secondary/30 p-4">
      <div className="mb-2 text-xs font-semibold text-muted-foreground">
        データソース: {sources.join(" / ")}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {categories.map((cat) => (
          <Badge
            key={cat.label}
            variant={cat.ok ? "default" : "outline"}
            className={
              cat.ok
                ? "bg-primary/10 text-primary hover:bg-primary/10"
                : "text-muted-foreground/50"
            }
          >
            {cat.ok ? "\u2713" : "\u2013"} {cat.label}
          </Badge>
        ))}
      </div>
    </section>
  );
}
