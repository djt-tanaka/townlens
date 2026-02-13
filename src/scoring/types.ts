/** 指標のカテゴリ（重みプリセットで使用） */
export type IndicatorCategory =
  | "childcare"
  | "price"
  | "safety"
  | "disaster"
  | "transport";

/** 指標のメタ定義 */
export interface IndicatorDefinition {
  readonly id: string;
  readonly label: string;
  readonly unit: string;
  /** 値が大きいほど良い or 小さいほど良い */
  readonly direction: "higher_better" | "lower_better";
  readonly category: IndicatorCategory;
  readonly precision: number;
}

/** 単一の指標データポイント */
export interface IndicatorValue {
  readonly indicatorId: string;
  readonly rawValue: number | null;
  readonly dataYear: string;
  readonly sourceId: string;
}

/** 都市ごとの全指標データ */
export interface CityIndicators {
  readonly cityName: string;
  readonly areaCode: string;
  readonly indicators: ReadonlyArray<IndicatorValue>;
}

/** 全国基準パーセンタイル（0-100） */
export interface BaselineScore {
  readonly indicatorId: string;
  readonly percentile: number;
  readonly populationSize: number;
  readonly baselineName: string;
}

/** 候補内正規化スコア（0-100） */
export interface ChoiceScore {
  readonly indicatorId: string;
  readonly score: number;
}

/** 信頼度レベル */
export type ConfidenceLevel = "high" | "medium" | "low";

/** 信頼度判定の入力 */
export interface ConfidenceInput {
  readonly dataYear: string;
  readonly sampleCount: number | null;
  readonly missingRate: number;
}

/** 信頼度判定の結果 */
export interface ConfidenceResult {
  readonly level: ConfidenceLevel;
  readonly reason: string;
}

/** 重みプリセット */
export interface WeightPreset {
  readonly name: string;
  readonly label: string;
  readonly weights: Readonly<Record<IndicatorCategory, number>>;
}

/** 都市ごとの総合スコア結果 */
export interface CityScoreResult {
  readonly cityName: string;
  readonly areaCode: string;
  readonly baseline: ReadonlyArray<BaselineScore>;
  readonly choice: ReadonlyArray<ChoiceScore>;
  readonly compositeScore: number;
  readonly confidence: ConfidenceResult;
  readonly rank: number;
  readonly notes: ReadonlyArray<string>;
}
