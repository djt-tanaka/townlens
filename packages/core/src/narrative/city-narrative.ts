/**
 * 都市別ナラティブ生成。
 * 個々の都市のスコア・強み・弱みに基づいた評価テキストを組み立てる。
 */

import type {
  CityScoreResult,
  ChoiceScore,
  IndicatorCategory,
  IndicatorDefinition,
  WeightPreset,
} from "../scoring/types";
import { renderStarText } from "../scoring/star-rating";
import type { StarRating } from "../scoring/star-rating";
import type { ReportRow } from "../types";
import { getRawValueFromRow, findRawRow } from "../report-row-utils";
import { STRONG_THRESHOLD, WEAK_THRESHOLD, CATEGORY_LABELS } from "./constants";
import { classifyIndicators, groupByRating } from "./classify";

/** ナラティブ生成のオプション（後方互換のためオプショナル） */
export interface NarrativeOptions {
  readonly rawRows?: ReadonlyArray<ReportRow>;
  readonly preset?: WeightPreset;
}

const jaNumberFormat = new Intl.NumberFormat("ja-JP");

/** 実値をインライン表示用にフォーマット（例: "4,800万円"） */
export function formatRawInline(
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

// ─── 内部型 ───

interface CityNarrativeInput {
  readonly cityName: string;
  readonly compositeScore: number;
  readonly rank: number;
  readonly totalCities: number;
  readonly choiceScores: ReadonlyArray<ChoiceScore>;
  readonly definitions: ReadonlyArray<IndicatorDefinition>;
  readonly confidenceLevel: "high" | "medium" | "low";
  readonly missingIndicatorCount: number;
  readonly starRating?: number;
}

// ─── 文章ビルダー ───

/** スター評価の日本語ラベル */
function starRatingLabel(stars: number): string {
  const rounded = Math.round(stars);
  if (rounded >= 5) return "とても良い";
  if (rounded >= 4) return "良い";
  if (rounded >= 3) return "普通";
  if (rounded >= 2) return "やや低い";
  return "要注意";
}

/** 総合評価文 */
function buildOverallSentence(input: CityNarrativeInput): string {
  const { cityName, compositeScore, rank, totalCities, starRating } = input;

  if (starRating != null) {
    const stars = renderStarText(Math.round(starRating) as StarRating);
    const label = starRatingLabel(starRating);

    if (totalCities === 1) {
      return `${cityName}の総合評価は${stars}（${starRating.toFixed(1)}/5.0・${label}）です。`;
    }
    if (rank === 1) {
      return `${cityName}は総合評価${stars}（${starRating.toFixed(1)}/5.0・${label}）で、候補${totalCities}市区町村の中で最も高い評価となりました。`;
    }
    if (rank === totalCities) {
      return `${cityName}は総合評価${stars}（${starRating.toFixed(1)}/5.0・${label}）で、候補${totalCities}市区町村の中で最も低い評価となりました。`;
    }
    return `${cityName}は総合評価${stars}（${starRating.toFixed(1)}/5.0・${label}）で、候補${totalCities}市区町村中${rank}位の評価です。`;
  }

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
  classified: ReturnType<typeof classifyIndicators>,
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

// ─── 公開API ───

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
    starRating: result.starRating,
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
