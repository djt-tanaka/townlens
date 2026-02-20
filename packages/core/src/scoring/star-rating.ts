/**
 * 5段階スター評価
 *
 * 全国パーセンタイル（0-100）を 1〜5 のスター評価に変換する。
 * 表示用のユーティリティも提供する。
 */

/** スター評価値（1-5の整数） */
export type StarRating = 1 | 2 | 3 | 4 | 5;

/** スター評価の閾値定義 */
const STAR_THRESHOLDS: ReadonlyArray<{
  readonly minPercentile: number;
  readonly stars: StarRating;
}> = [
  { minPercentile: 80, stars: 5 },
  { minPercentile: 60, stars: 4 },
  { minPercentile: 40, stars: 3 },
  { minPercentile: 20, stars: 2 },
  { minPercentile: 0, stars: 1 },
];

/** パーセンタイル（0-100）をスター評価（1-5）に変換 */
export function percentileToStars(percentile: number): StarRating {
  const clamped = Math.max(0, Math.min(100, percentile));
  for (const t of STAR_THRESHOLDS) {
    if (clamped >= t.minPercentile) {
      return t.stars;
    }
  }
  return 1;
}

/** スター評価から表示用テキストを生成（例: "★★★★☆"） */
export function renderStarText(stars: number): string {
  const rounded = Math.round(Math.max(1, Math.min(5, stars)));
  return "\u2605".repeat(rounded) + "\u2606".repeat(5 - rounded);
}

/** スター評価に対応する日本語ラベル */
const STAR_LABELS: Readonly<Record<StarRating, string>> = {
  5: "とても良い",
  4: "良い",
  3: "普通",
  2: "やや低い",
  1: "要注意",
};

/** スター数に対応するラベルを取得 */
export function starLabel(stars: StarRating): string {
  return STAR_LABELS[stars];
}

/** スター評価に対応する色を取得 */
export function starColor(stars: number): string {
  const rounded = Math.round(Math.max(1, Math.min(5, stars)));
  if (rounded >= 5) return "#10b981"; // green
  if (rounded >= 4) return "#22c55e"; // light green
  if (rounded >= 3) return "#f59e0b"; // amber
  if (rounded >= 2) return "#f97316"; // orange
  return "#f43f5e"; // rose
}

/** 小数のスター値から半星表示テキストを生成（例: 3.7 → "★★★★☆"） */
export function renderStarTextFloat(stars: number): string {
  const clamped = Math.max(1, Math.min(5, stars));
  const full = Math.round(clamped);
  return "\u2605".repeat(full) + "\u2606".repeat(5 - full);
}

/**
 * 複数の指標スター評価から加重平均のコンポジットスター値を計算
 * @returns 1.0〜5.0 の小数値（0.1 刻み）
 */
export function computeCompositeStars(
  indicatorStars: ReadonlyArray<{
    readonly indicatorId: string;
    readonly stars: StarRating;
  }>,
  weights: ReadonlyArray<{
    readonly indicatorId: string;
    readonly weight: number;
  }>,
): number {
  let weightedSum = 0;
  let totalWeight = 0;

  for (const is of indicatorStars) {
    const w = weights.find((w) => w.indicatorId === is.indicatorId);
    const weight = w?.weight ?? 1;
    weightedSum += is.stars * weight;
    totalWeight += weight;
  }

  if (totalWeight === 0) return 3;

  const raw = weightedSum / totalWeight;
  return Math.round(raw * 10) / 10;
}
