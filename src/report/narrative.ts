import {
  CityScoreResult,
  ChoiceScore,
  IndicatorDefinition,
} from "../scoring/types";

/** スコア分類の閾値 */
const STRONG_THRESHOLD = 70;
const WEAK_THRESHOLD = 30;
const CLOSE_GAP = 5;
const LARGE_GAP = 20;

/** 指標の評価分類 */
type IndicatorRating = "strong" | "neutral" | "weak";

/** 分類済み指標 */
interface ClassifiedIndicator {
  readonly label: string;
  readonly score: number;
  readonly rating: IndicatorRating;
}

/** Choice Score を強み/中立/弱みに分類する */
function classifyIndicators(
  choiceScores: ReadonlyArray<ChoiceScore>,
  definitions: ReadonlyArray<IndicatorDefinition>
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
      return { label: def.label, score: cs.score, rating };
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

/** 強み・弱み・中立に基づく文章を生成 */
function buildStrengthWeaknessSentence(
  classified: ReadonlyArray<ClassifiedIndicator>
): string {
  const { strengths, weaknesses } = groupByRating(classified);

  if (strengths.length === 0 && weaknesses.length === 0) {
    return "各指標は候補内で平均的な水準にあります。";
  }

  const parts: string[] = [];
  if (strengths.length > 0) {
    const labels = strengths.map((s) => s.label).join("、");
    parts.push(`${labels}が強みです。`);
  }
  if (weaknesses.length > 0) {
    const labels = weaknesses.map((w) => w.label).join("、");
    parts.push(`一方、${labels}は相対的に課題があります。`);
  }
  return parts.join("");
}

/** 信頼度に基づく注記 */
function buildConfidenceCaveat(
  confidenceLevel: "high" | "medium" | "low",
  missingCount: number
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
  totalCities: number
): string {
  const classified = classifyIndicators(result.choice, definitions);
  const totalIndicators = definitions.length;
  const availableIndicators = result.choice.length;
  const missingCount = totalIndicators - availableIndicators;

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
    buildStrengthWeaknessSentence(classified),
  ];

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
  results: ReadonlyArray<CityScoreResult>
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
    (c) => c.compositeScore === first.compositeScore
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

/** 指標ごとのリーダーを特定し、トレードオフ文を生成 */
function buildTradeoffSentence(
  results: ReadonlyArray<CityScoreResult>,
  definitions: ReadonlyArray<IndicatorDefinition>
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

  const parts = Array.from(leaderMap.entries()).map(
    ([city, labels]) => `${city}は${labels.join("・")}で優位`
  );

  if (parts.length === 2) {
    return `${parts[0]}、${parts[1]}であり、優先する観点によって選択が分かれます。`;
  }
  return `${parts.join("、")}となっています。`;
}

/** 比較ナラティブを生成する */
export function generateComparisonNarrative(
  results: ReadonlyArray<CityScoreResult>,
  definitions: ReadonlyArray<IndicatorDefinition>
): string {
  return [
    buildWinnerSentence(results),
    buildTradeoffSentence(results, definitions),
  ]
    .filter((s) => s.length > 0)
    .join("");
}
