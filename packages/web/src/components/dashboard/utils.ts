import { findPreset } from "@townlens/core";

/** プラン種別 */
export type PlanType = "free" | "standard" | "premium";

/** プラン表示名マッピング */
export const PLAN_LABELS: Record<PlanType, string> = {
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

/** ISO 8601 日時文字列を "YYYY/MM/DD HH:mm" にフォーマット */
export function formatDate(isoString: string): string {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(isoString));
}

/** プリセット名をラベルに変換（見つからない場合は生の名前を返す） */
export function getPresetLabel(presetName: string): string {
  return findPreset(presetName)?.label ?? presetName;
}

/** ステータス表示設定 */
export const STATUS_CONFIG = {
  completed: { label: "完了", variant: "default" as const },
  processing: { label: "生成中", variant: "secondary" as const },
  failed: { label: "失敗", variant: "destructive" as const },
};
