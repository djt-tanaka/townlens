/**
 * 料金プラン定義。
 * UI とバリデーション双方で使用する。
 */

export interface PlanFeature {
  readonly text: string;
  readonly included: boolean;
}

export interface PlanDefinition {
  readonly id: "free" | "standard" | "premium";
  readonly name: string;
  readonly price: string;
  readonly priceNote: string;
  readonly description: string;
  readonly features: ReadonlyArray<PlanFeature>;
  readonly highlighted: boolean;
  readonly ctaLabel: string;
}

export const PLAN_DEFINITIONS: ReadonlyArray<PlanDefinition> = [
  {
    id: "free",
    name: "フリー",
    price: "¥0",
    priceNote: "無料",
    description: "まずは試してみたい方に",
    features: [
      { text: "月間レポート 100件", included: true },
      { text: "比較都市数 2都市", included: true },
      { text: "総合スコアのみ", included: true },
      { text: "固定プリセット", included: true },
      { text: "PDF ダウンロード", included: false },
    ],
    highlighted: false,
    ctaLabel: "現在のプラン",
  },
  {
    id: "standard",
    name: "スタンダード",
    price: "¥980",
    priceNote: "/月",
    description: "しっかり比較したい方に",
    features: [
      { text: "月間レポート 無制限", included: true },
      { text: "比較都市数 5都市", included: true },
      { text: "全指標の詳細スコア", included: true },
      { text: "全プリセット", included: true },
      { text: "PDF ダウンロード（準備中）", included: false },
    ],
    highlighted: true,
    ctaLabel: "スタンダードに申し込む",
  },
  {
    id: "premium",
    name: "プレミアム",
    price: "¥2,980",
    priceNote: "/月",
    description: "プロフェッショナル向け",
    features: [
      { text: "月間レポート 無制限", included: true },
      { text: "比較都市数 5都市", included: true },
      { text: "全指標の詳細スコア", included: true },
      { text: "カスタム重みプリセット", included: true },
      { text: "PDF ダウンロード（準備中）", included: false },
    ],
    highlighted: false,
    ctaLabel: "プレミアムに申し込む",
  },
] as const;
