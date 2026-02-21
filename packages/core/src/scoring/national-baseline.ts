/**
 * 全国ベースラインデータ
 *
 * 各指標について全国市区町村の分布をもとにしたパーセンタイル境界値を定義する。
 * これにより候補セット内の相対比較ではなく、全国的な絶対評価が可能になる。
 *
 * breakpoints は [p20, p40, p60, p80] の 4 値で、
 * direction を加味して 5 段階のスター評価に変換する。
 */

export interface NationalBaselineEntry {
  readonly indicatorId: string;
  /** [p20, p40, p60, p80] — 昇順の生値ブレークポイント */
  readonly breakpoints: readonly [number, number, number, number];
}

/**
 * 全国ベースラインデータ（2020年国勢調査・各種統計ベース推計値）
 *
 * 将来的に実データから自動生成する想定だが、初期値として
 * 全国約 1,700 市区町村の分布を踏まえた推計値を設定。
 */
export const NATIONAL_BASELINES: ReadonlyArray<NationalBaselineEntry> = [
  {
    indicatorId: "population_total",
    breakpoints: [15_000, 50_000, 120_000, 300_000],
  },
  {
    indicatorId: "kids_ratio",
    breakpoints: [9.0, 10.5, 12.0, 13.5],
  },
  {
    indicatorId: "condo_price_median",
    breakpoints: [800, 1_500, 2_500, 4_000],
  },
  {
    indicatorId: "crime_rate",
    breakpoints: [2.0, 4.0, 6.0, 9.0],
  },
  {
    indicatorId: "flood_risk",
    breakpoints: [0, 0, 1, 1],
  },
  {
    indicatorId: "evacuation_sites",
    breakpoints: [3, 8, 20, 50],
  },
  {
    indicatorId: "elementary_schools_per_capita",
    breakpoints: [0.5, 1.0, 1.5, 2.5],
  },
  {
    indicatorId: "junior_high_schools_per_capita",
    breakpoints: [0.25, 0.5, 0.8, 1.2],
  },
  {
    indicatorId: "hospitals_per_capita",
    breakpoints: [3, 5, 7, 10],
  },
  {
    indicatorId: "clinics_per_capita",
    breakpoints: [40, 55, 70, 90],
  },
  {
    indicatorId: "pediatrics_per_capita",
    breakpoints: [5, 8, 12, 18],
  },
];

const baselineMap = new Map(
  NATIONAL_BASELINES.map((b) => [b.indicatorId, b]),
);

/** 指標IDからベースラインを取得 */
export function getNationalBaseline(
  indicatorId: string,
): NationalBaselineEntry | undefined {
  return baselineMap.get(indicatorId);
}

/**
 * 生値を全国ベースラインと比較してパーセンタイル（0-100）を推定する。
 *
 * breakpoints = [p20, p40, p60, p80] に対し、線形補間でパーセンタイルを算出。
 * direction === "lower_better" の場合はパーセンタイルを反転する。
 */
export function computeNationalPercentile(
  rawValue: number,
  indicatorId: string,
  direction: "higher_better" | "lower_better",
): number {
  const baseline = baselineMap.get(indicatorId);
  if (!baseline) {
    return 50; // ベースラインなし → 中央
  }

  const [p20, p40, p60, p80] = baseline.breakpoints;
  const thresholds = [p20, p40, p60, p80];
  const percentiles = [20, 40, 60, 80];

  let rawPercentile: number;

  if (rawValue <= thresholds[0]) {
    // p20 以下: 0-20 の間で線形補間（下限は p20 の半分と仮定）
    const lowerBound = thresholds[0] * 0.5;
    const range = thresholds[0] - lowerBound;
    rawPercentile =
      range > 0
        ? Math.max(0, ((rawValue - lowerBound) / range) * 20)
        : 10;
  } else if (rawValue >= thresholds[3]) {
    // p80 以上: 80-100 の間で線形補間（上限は p80 の 1.5 倍と仮定）
    const upperBound = thresholds[3] * 1.5;
    const range = upperBound - thresholds[3];
    rawPercentile =
      range > 0
        ? Math.min(100, 80 + ((rawValue - thresholds[3]) / range) * 20)
        : 90;
  } else {
    // 区間内の線形補間
    for (let i = 0; i < thresholds.length - 1; i++) {
      if (rawValue <= thresholds[i + 1]) {
        const segmentRange = thresholds[i + 1] - thresholds[i];
        const pctRange = percentiles[i + 1] - percentiles[i];
        rawPercentile =
          segmentRange > 0
            ? percentiles[i] +
              ((rawValue - thresholds[i]) / segmentRange) * pctRange
            : percentiles[i];
        break;
      }
    }
    rawPercentile ??= 50;
  }

  // lower_better の場合は反転
  const percentile =
    direction === "lower_better" ? 100 - rawPercentile : rawPercentile;

  return Math.round(percentile * 10) / 10;
}
