import {
  CityScoreResult,
  ChoiceScore,
  IndicatorCategory,
  IndicatorDefinition,
  WeightPreset,
} from "../scoring/types";
import { ReportRow } from "../types";

/** スコア分類の閾値 */
const STRONG_THRESHOLD = 70;
const WEAK_THRESHOLD = 30;
const CLOSE_GAP = 5;
const LARGE_GAP = 20;

/** ナラティブ生成のオプション（後方互換のためオプショナル） */
export interface NarrativeOptions {
  readonly rawRows?: ReadonlyArray<ReportRow>;
  readonly preset?: WeightPreset;
}

/** カテゴリの日本語ラベル */
const CATEGORY_LABELS: Readonly<Record<IndicatorCategory, string>> = {
  childcare: "子育て",
  price: "住宅価格",
  safety: "安全",
  disaster: "災害",
  transport: "交通",
  education: "教育",
};

const jaNumberFormat = new Intl.NumberFormat("ja-JP");

/** 指標の評価分類 */
type IndicatorRating = "strong" | "neutral" | "weak";

/** 分類済み指標（indicatorId 付き） */
interface ClassifiedIndicator {
  readonly id: string;
  readonly label: string;
  readonly score: number;
  readonly rating: IndicatorRating;
}

// ─── 実値ユーティリティ ───

/** 指標IDからReportRowの実値を取得する */
function getRawValueFromRow(
  indicatorId: string,
  rawRow: ReportRow,
): number | null | undefined {
  const mapping: Record<string, () => number | null | undefined> = {
    population_total: () => rawRow.total,
    kids_ratio: () => rawRow.ratio,
    condo_price_median: () => rawRow.condoPriceMedian,
    crime_rate: () => rawRow.crimeRate,
    flood_risk: () => {
      if (rawRow.floodRisk == null && rawRow.landslideRisk == null)
        return undefined;
      return (rawRow.floodRisk ? 1 : 0) + (rawRow.landslideRisk ? 1 : 0);
    },
    evacuation_sites: () => rawRow.evacuationSiteCount,
    elementary_schools_per_capita: () => rawRow.elementarySchoolsPerCapita,
    junior_high_schools_per_capita: () => rawRow.juniorHighSchoolsPerCapita,
  };
  return mapping[indicatorId]?.() ?? undefined;
}

/** cityName/areaCode で ReportRow を検索する */
function findRawRow(
  cityName: string,
  areaCode: string,
  rawRows: ReadonlyArray<ReportRow>,
): ReportRow | undefined {
  return rawRows.find(
    (r) => r.areaCode === areaCode || r.cityResolved === cityName,
  );
}

/** 実値をインライン表示用にフォーマット（例: "4,800万円"） */
function formatRawInline(
  value: number | null | undefined,
  def: IndicatorDefinition,
): string | null {
  if (value === null || value === undefined) return null;
  const formatted =
    def.precision === 0
      ? jaNumberFormat.format(value)
      : value.toFixed(def.precision);
  return `${formatted}${def.unit}`;
}

// ─── 共通分類ロジック ───

/** Choice Score を強み/中立/弱みに分類する */
function classifyIndicators(
  choiceScores: ReadonlyArray<ChoiceScore>,
  definitions: ReadonlyArray<IndicatorDefinition>,
): ReadonlyArray<ClassifiedIndicator> {
  return choiceScores
    .map((cs) => {
      const def = definitions.find((d) => d.id === cs.indicatorId);
      if (!def) return null;
      const rating: IndicatorRating =
        cs.score >= STRONG_THRESHOLD
          ? "strong"
          : cs.score <= WEAK_THRESHOLD
            ? "weak"
            : "neutral";
      return { id: def.id, label: def.label, score: cs.score, rating };
    })
    .filter((item): item is ClassifiedIndicator => item !== null);
}

/** 分類済み指標をグループ分けする */
function groupByRating(indicators: ReadonlyArray<ClassifiedIndicator>): {
  readonly strengths: ReadonlyArray<ClassifiedIndicator>;
  readonly weaknesses: ReadonlyArray<ClassifiedIndicator>;
} {
  return {
    strengths: indicators.filter((i) => i.rating === "strong"),
    weaknesses: indicators.filter((i) => i.rating === "weak"),
  };
}

// ─── 都市別ナラティブ ───

interface CityNarrativeInput {
  readonly cityName: string;
  readonly compositeScore: number;
  readonly rank: number;
  readonly totalCities: number;
  readonly choiceScores: ReadonlyArray<ChoiceScore>;
  readonly definitions: ReadonlyArray<IndicatorDefinition>;
  readonly confidenceLevel: "high" | "medium" | "low";
  readonly missingIndicatorCount: number;
}

/** 総合評価文 */
function buildOverallSentence(input: CityNarrativeInput): string {
  const { cityName, compositeScore, rank, totalCities } = input;
  const score = compositeScore.toFixed(1);

  if (totalCities === 1) {
    return `${cityName}の総合スコアは${score}点です。`;
  }
  if (rank === 1) {
    return `${cityName}は総合スコア${score}点で、候補${totalCities}市区町村の中で最も高い評価となりました。`;
  }
  if (rank === totalCities) {
    return `${cityName}は総合スコア${score}点で、候補${totalCities}市区町村の中で最も低い評価となりました。`;
  }
  return `${cityName}は総合スコア${score}点で、候補${totalCities}市区町村中${rank}位の評価です。`;
}

/** 強み・弱みに実値を付記した文章を生成 */
function buildStrengthWeaknessSentence(
  classified: ReadonlyArray<ClassifiedIndicator>,
  definitions: ReadonlyArray<IndicatorDefinition>,
  rawRow: ReportRow | undefined,
): string {
  const { strengths, weaknesses } = groupByRating(classified);

  if (strengths.length === 0 && weaknesses.length === 0) {
    return "各指標は候補内で平均的な水準にあります。";
  }

  const parts: string[] = [];
  if (strengths.length > 0) {
    const labels = strengths.map((s) => {
      if (rawRow) {
        const def = definitions.find((d) => d.id === s.id);
        if (def) {
          const raw = getRawValueFromRow(def.id, rawRow);
          const formatted = formatRawInline(raw, def);
          if (formatted) return `${s.label}（${formatted}）`;
        }
      }
      return s.label;
    });
    parts.push(`${labels.join("、")}が強みです。`);
  }
  if (weaknesses.length > 0) {
    const labels = weaknesses.map((w) => {
      if (rawRow) {
        const def = definitions.find((d) => d.id === w.id);
        if (def) {
          const raw = getRawValueFromRow(def.id, rawRow);
          const formatted = formatRawInline(raw, def);
          if (formatted) return `${w.label}（${formatted}）`;
        }
      }
      return w.label;
    });
    parts.push(`一方、${labels.join("、")}は相対的に課題があります。`);
  }
  return parts.join("");
}

/** プリセットの重み配分がスコアに与える影響を解説 */
function buildPresetCommentary(
  result: CityScoreResult,
  definitions: ReadonlyArray<IndicatorDefinition>,
  preset: WeightPreset,
): string {
  // 最重要カテゴリを特定
  const sortedWeights = Object.entries(preset.weights).sort(
    ([, a], [, b]) => b - a,
  );
  const [topCatName, topCatWeight] = sortedWeights[0];

  const catDefs = definitions.filter((d) => d.category === topCatName);
  const catScores = catDefs
    .map((d) => result.choice.find((c) => c.indicatorId === d.id)?.score)
    .filter((s): s is number => s !== undefined);

  if (catScores.length === 0) return "";

  const catAvg = catScores.reduce((a, b) => a + b, 0) / catScores.length;
  const catLabel =
    CATEGORY_LABELS[topCatName as IndicatorCategory] ?? topCatName;
  const weightPct = Math.round(topCatWeight * 100);

  if (catAvg >= STRONG_THRESHOLD) {
    return `${preset.label}では${catLabel}（重み${weightPct}%）が最重視されますが、この分野のスコアが高く、総合評価を押し上げています。`;
  }
  if (catAvg <= WEAK_THRESHOLD) {
    return `${preset.label}では${catLabel}（重み${weightPct}%）が最重視されますが、この分野のスコアが低く、総合評価を下げる要因になっています。`;
  }
  return "";
}

/** 信頼度に基づく注記 */
function buildConfidenceCaveat(
  confidenceLevel: "high" | "medium" | "low",
  missingCount: number,
): string {
  if (confidenceLevel === "low") {
    const missingNote =
      missingCount > 0 ? `（${missingCount}件の指標データが欠損）` : "";
    return `なお、データの信頼度が低いため${missingNote}、参考値としてご確認ください。`;
  }
  if (missingCount > 0) {
    return `※ ${missingCount}件の指標データが欠損しているため、評価の精度に限りがあります。`;
  }
  return "";
}

/** 都市別ナラティブを生成する */
export function generateCityNarrative(
  result: CityScoreResult,
  definitions: ReadonlyArray<IndicatorDefinition>,
  totalCities: number,
  options?: NarrativeOptions,
): string {
  const classified = classifyIndicators(result.choice, definitions);
  const totalIndicators = definitions.length;
  const availableIndicators = result.choice.length;
  const missingCount = totalIndicators - availableIndicators;

  const rawRow = options?.rawRows
    ? findRawRow(result.cityName, result.areaCode, options.rawRows)
    : undefined;

  const input: CityNarrativeInput = {
    cityName: result.cityName,
    compositeScore: result.compositeScore,
    rank: result.rank,
    totalCities,
    choiceScores: result.choice,
    definitions,
    confidenceLevel: result.confidence.level,
    missingIndicatorCount: missingCount,
  };

  const sentences: string[] = [
    buildOverallSentence(input),
    buildStrengthWeaknessSentence(classified, definitions, rawRow),
  ];

  if (options?.preset) {
    const presetComment = buildPresetCommentary(
      result,
      definitions,
      options.preset,
    );
    if (presetComment) {
      sentences.push(presetComment);
    }
  }

  const caveat = buildConfidenceCaveat(input.confidenceLevel, missingCount);
  if (caveat) {
    sentences.push(caveat);
  }

  return sentences.join("");
}

// ─── 比較ナラティブ ───

/** スコア差の大きさを判定 */
function classifyGap(gap: number): "close" | "moderate" | "large" {
  if (gap <= CLOSE_GAP) return "close";
  if (gap >= LARGE_GAP) return "large";
  return "moderate";
}

/** 1位の都市に基づく結論文 */
function buildWinnerSentence(
  results: ReadonlyArray<CityScoreResult>,
): string {
  const sorted = [...results].sort((a, b) => a.rank - b.rank);
  const first = sorted[0];

  if (sorted.length === 1) {
    return `${first.cityName}の単独評価です。比較対象がないため、各指標の絶対的な水準をご確認ください。`;
  }

  const second = sorted[1];
  const gap = first.compositeScore - second.compositeScore;

  // 全都市同スコア
  const allSame = sorted.every(
    (c) => c.compositeScore === first.compositeScore,
  );
  if (allSame) {
    return "候補間の総合スコアに差はなく、いずれも同等の評価となりました。";
  }

  const gapClass = classifyGap(gap);
  if (gapClass === "close") {
    return `${first.cityName}が総合1位ですが、${second.cityName}との差は${gap.toFixed(1)}点と僅差であり、実質的にほぼ同等の評価です。`;
  }
  if (gapClass === "large") {
    return `${first.cityName}が総合1位（${first.compositeScore.toFixed(1)}点）で、2位の${second.cityName}（${second.compositeScore.toFixed(1)}点）に${gap.toFixed(1)}点の大きな差をつけています。`;
  }
  return `総合的に${first.cityName}（${first.compositeScore.toFixed(1)}点）が最も高い評価で、${second.cityName}（${second.compositeScore.toFixed(1)}点）が続きます。`;
}

/** 指標ごとのリーダーを特定し、実値比較付きのトレードオフ文を生成 */
function buildTradeoffSentence(
  results: ReadonlyArray<CityScoreResult>,
  definitions: ReadonlyArray<IndicatorDefinition>,
  rawRows: ReadonlyArray<ReportRow> | undefined,
): string {
  if (results.length < 2) return "";

  // 指標ごとに最高スコアの都市を特定
  const leaderMap = new Map<string, string[]>();

  for (const def of definitions) {
    let bestCity = "";
    let bestScore = -1;

    for (const r of results) {
      const cs = r.choice.find((c) => c.indicatorId === def.id);
      if (cs && cs.score > bestScore) {
        bestScore = cs.score;
        bestCity = r.cityName;
      }
    }

    if (bestCity) {
      const existing = leaderMap.get(bestCity) ?? [];
      leaderMap.set(bestCity, [...existing, def.label]);
    }
  }

  // 全指標で同一都市がリード
  if (leaderMap.size === 1) {
    const [leader] = leaderMap.keys();
    return `${leader}は全ての指標で候補内最高値を記録しています。`;
  }

  // 実値比較を生成（rawRows がある場合）
  if (rawRows && rawRows.length >= 2) {
    return buildTradeoffWithRawValues(results, definitions, leaderMap, rawRows);
  }

  // rawRows がない場合はラベルのみ（従来の挙動）
  const parts = Array.from(leaderMap.entries()).map(
    ([city, labels]) => `${city}は${labels.join("・")}で優位`,
  );

  if (parts.length === 2) {
    return `${parts[0]}、${parts[1]}であり、優先する観点によって選択が分かれます。`;
  }
  return `${parts.join("、")}となっています。`;
}

/** 実値を含むトレードオフ文を生成 */
function buildTradeoffWithRawValues(
  results: ReadonlyArray<CityScoreResult>,
  definitions: ReadonlyArray<IndicatorDefinition>,
  leaderMap: Map<string, string[]>,
  rawRows: ReadonlyArray<ReportRow>,
): string {
  const sorted = [...results].sort((a, b) => a.rank - b.rank);
  const parts: string[] = [];

  for (const [city, indicatorLabels] of leaderMap.entries()) {
    const labelParts: string[] = [];

    for (const label of indicatorLabels) {
      const def = definitions.find((d) => d.label === label);
      if (!def) {
        labelParts.push(label);
        continue;
      }

      // 各都市の実値を取得して比較文を作る
      const cityRow = rawRows.find(
        (r) =>
          r.cityResolved === city ||
          results.find((res) => res.cityName === city)?.areaCode ===
            r.areaCode,
      );
      if (!cityRow) {
        labelParts.push(label);
        continue;
      }

      const leaderRaw = getRawValueFromRow(def.id, cityRow);
      const leaderFormatted = formatRawInline(leaderRaw, def);

      // 比較対象の都市の値を取得（1位 vs 最も差のある都市）
      const others = sorted.filter((r) => r.cityName !== city);
      if (others.length === 0 || !leaderFormatted) {
        labelParts.push(label);
        continue;
      }

      // 最も差が大きい相手を見つける
      let worstOther: { name: string; raw: number | null | undefined } | null =
        null;
      for (const other of others) {
        const otherRow = findRawRow(other.cityName, other.areaCode, rawRows);
        if (!otherRow) continue;
        const otherRaw = getRawValueFromRow(def.id, otherRow);
        if (otherRaw == null || leaderRaw == null) continue;
        if (
          !worstOther ||
          worstOther.raw == null ||
          Math.abs(leaderRaw - otherRaw) >
            Math.abs(leaderRaw - (worstOther.raw as number))
        ) {
          worstOther = { name: other.cityName, raw: otherRaw };
        }
      }

      if (worstOther?.raw != null) {
        const otherFormatted = formatRawInline(worstOther.raw, def);
        if (others.length === 1) {
          labelParts.push(`${label}（${leaderFormatted} vs ${otherFormatted}）`);
        } else {
          labelParts.push(
            `${label}（${leaderFormatted} vs ${worstOther.name}${otherFormatted}）`,
          );
        }
      } else {
        labelParts.push(leaderFormatted ? `${label}（${leaderFormatted}）` : label);
      }
    }

    parts.push(`${city}は${labelParts.join("・")}で優位`);
  }

  if (parts.length === 2) {
    return `${parts[0]}、${parts[1]}であり、優先する観点によって選択が分かれます。`;
  }
  return `${parts.join("、")}となっています。`;
}

/** プリセットの重み配分が比較結果に与える影響を解説 */
function buildPresetImpactSentence(
  results: ReadonlyArray<CityScoreResult>,
  definitions: ReadonlyArray<IndicatorDefinition>,
  preset: WeightPreset,
): string {
  if (results.length < 2) return "";

  const sorted = [...results].sort((a, b) => a.rank - b.rank);
  const first = sorted[0];
  const second = sorted[1];

  // 同スコアの場合はコメント不要
  if (first.compositeScore === second.compositeScore) return "";

  // 最重要カテゴリを特定
  const sortedWeights = Object.entries(preset.weights).sort(
    ([, a], [, b]) => b - a,
  );
  const [topCatName, topCatWeight] = sortedWeights[0];
  const catLabel =
    CATEGORY_LABELS[topCatName as IndicatorCategory] ?? topCatName;
  const weightPct = Math.round(topCatWeight * 100);

  // 最重要カテゴリにおける1位と2位のスコア差を計算
  const catDefs = definitions.filter((d) => d.category === topCatName);
  if (catDefs.length === 0) return "";

  const firstCatAvg = computeCategoryAvg(first, catDefs);
  const secondCatAvg = computeCategoryAvg(second, catDefs);

  if (firstCatAvg === null || secondCatAvg === null) return "";

  const catGap = firstCatAvg - secondCatAvg;

  if (Math.abs(catGap) >= 20) {
    if (catGap > 0) {
      return `${preset.label}では${catLabel}カテゴリ（重み${weightPct}%）が最重視されるため、${first.cityName}のこの分野での優位が総合順位に反映されています。`;
    }
    return `${preset.label}では${catLabel}カテゴリ（重み${weightPct}%）が最重視されますが、${first.cityName}は他の分野で補って総合1位となっています。`;
  }
  return "";
}

/** カテゴリ内の平均スコアを計算 */
function computeCategoryAvg(
  result: CityScoreResult,
  catDefs: ReadonlyArray<IndicatorDefinition>,
): number | null {
  const scores = catDefs
    .map((d) => result.choice.find((c) => c.indicatorId === d.id)?.score)
    .filter((s): s is number => s !== undefined);
  if (scores.length === 0) return null;
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

/** 比較ナラティブを生成する */
export function generateComparisonNarrative(
  results: ReadonlyArray<CityScoreResult>,
  definitions: ReadonlyArray<IndicatorDefinition>,
  options?: NarrativeOptions,
): string {
  const sentences = [
    buildWinnerSentence(results),
    buildTradeoffSentence(results, definitions, options?.rawRows),
  ].filter((s) => s.length > 0);

  if (options?.preset) {
    const presetImpact = buildPresetImpactSentence(
      results,
      definitions,
      options.preset,
    );
    if (presetImpact) {
      sentences.push(presetImpact);
    }
  }

  return sentences.join("");
}
