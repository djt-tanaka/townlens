import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface UsageCardProps {
  readonly plan: "free" | "standard" | "premium";
  readonly reportsGenerated: number;
  readonly reportsLimit: number | null;
}

export const PLAN_LABELS: Record<UsageCardProps["plan"], string> = {
  free: "フリー",
  standard: "スタンダード",
  premium: "プレミアム",
};

/** 利用量パーセンテージを算出（上限なしまたは0の場合は0を返す） */
export function calculateUsagePercentage(
  reportsGenerated: number,
  reportsLimit: number | null,
): number {
  if (reportsLimit === null || reportsLimit <= 0) return 0;
  return Math.min((reportsGenerated / reportsLimit) * 100, 100);
}

/** 利用量 + プラン情報カード */
export function UsageCard({
  plan,
  reportsGenerated,
  reportsLimit,
}: UsageCardProps) {
  const planLabel = PLAN_LABELS[plan] ?? plan;
  const percentage = calculateUsagePercentage(reportsGenerated, reportsLimit);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">今月の利用状況</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* レポート生成数 */}
        <div className="space-y-2">
          <div className="flex items-baseline justify-between text-sm">
            <span className="text-muted-foreground">レポート生成数</span>
            <span className="font-medium">
              {reportsGenerated} / {reportsLimit ?? "∞"}
            </span>
          </div>

          {/* プログレスバー（上限がある場合のみ） */}
          {reportsLimit !== null && (
            <div
              role="progressbar"
              aria-valuenow={reportsGenerated}
              aria-valuemin={0}
              aria-valuemax={reportsLimit}
              aria-label={`レポート生成数: ${reportsGenerated}/${reportsLimit}`}
              className="h-2 w-full rounded-full bg-secondary"
            >
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${percentage}%` }}
              />
            </div>
          )}
        </div>

        {/* プラン情報 */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">現在のプラン</span>
          <Badge variant={plan === "free" ? "outline" : "default"}>
            {planLabel}
          </Badge>
        </div>

        {/* アップグレード導線（フリープランのみ） */}
        {plan === "free" && (
          <Button variant="outline" size="sm" className="w-full" disabled>
            アップグレード（近日公開）
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
