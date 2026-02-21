import {
  Users,
  Baby,
  Home,
  ShieldAlert,
  CloudRain,
  MapPin,
  GraduationCap,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { CityRawData } from "@/lib/city-data";

interface CityStatsProps {
  readonly population: number;
  readonly kidsRatio: number;
  readonly rawData: CityRawData;
}

interface StatItem {
  readonly icon: React.ReactNode;
  readonly label: string;
  readonly value: string;
  readonly unit: string;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("ja-JP").format(value);
}

function buildStatItems(
  population: number,
  kidsRatio: number,
  rawData: CityRawData,
): ReadonlyArray<StatItem> {
  const items: StatItem[] = [
    {
      icon: <Users className="h-5 w-5 text-primary" />,
      label: "総人口",
      value: formatNumber(population),
      unit: "人",
    },
    {
      icon: <Baby className="h-5 w-5 text-primary" />,
      label: "0-14歳比率",
      value: kidsRatio.toFixed(1),
      unit: "%",
    },
  ];

  if (rawData.condoPriceMedian != null) {
    items.push({
      icon: <Home className="h-5 w-5 text-primary" />,
      label: "中古マンション価格（中央値）",
      value: formatNumber(rawData.condoPriceMedian),
      unit: "万円",
    });
  }

  if (rawData.crimeRate != null) {
    items.push({
      icon: <ShieldAlert className="h-5 w-5 text-primary" />,
      label: "刑法犯認知件数",
      value: rawData.crimeRate.toFixed(2),
      unit: "件/千人",
    });
  }

  if (rawData.floodRisk != null) {
    items.push({
      icon: <CloudRain className="h-5 w-5 text-primary" />,
      label: "洪水・土砂災害リスク",
      value: rawData.floodRisk ? "あり" : "なし",
      unit: "",
    });
  }

  if (rawData.evacuationSiteCount != null) {
    items.push({
      icon: <MapPin className="h-5 w-5 text-primary" />,
      label: "避難場所数",
      value: formatNumber(rawData.evacuationSiteCount),
      unit: "箇所",
    });
  }

  if (rawData.elementarySchoolsPerCapita != null) {
    items.push({
      icon: <GraduationCap className="h-5 w-5 text-primary" />,
      label: "小学校数（万人あたり）",
      value: rawData.elementarySchoolsPerCapita.toFixed(2),
      unit: "校/万人",
    });
  }

  if (rawData.juniorHighSchoolsPerCapita != null) {
    items.push({
      icon: <GraduationCap className="h-5 w-5 text-primary" />,
      label: "中学校数（万人あたり）",
      value: rawData.juniorHighSchoolsPerCapita.toFixed(2),
      unit: "校/万人",
    });
  }

  return items;
}

/** 都市の基本統計を表示するカードグリッド */
export function CityStats({ population, kidsRatio, rawData }: CityStatsProps) {
  const items = buildStatItems(population, kidsRatio, rawData);

  return (
    <section>
      <h2 className="mb-4 text-xl font-bold">基本統計</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <Card key={item.label}>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-lg bg-primary/10 p-2">{item.icon}</div>
              <div>
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className="text-lg font-bold">
                  {item.value}
                  {item.unit && (
                    <span className="ml-1 text-sm font-normal text-muted-foreground">
                      {item.unit}
                    </span>
                  )}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
