import { ConfidenceInput, ConfidenceResult } from "./types";

/**
 * データの信頼度を3段階で判定する
 *
 * High: データ年が2年以内 & 欠損率 <10% & サンプル数 >= 30
 * Medium: データ年が4年以内 & 欠損率 <30%
 * Low: 上記以外
 */
export function evaluateConfidence(input: ConfidenceInput): ConfidenceResult {
  const currentYear = new Date().getFullYear();
  const dataYearNum = parseInt(input.dataYear, 10);
  const yearsOld = Number.isFinite(dataYearNum)
    ? currentYear - dataYearNum
    : Infinity;

  const hasSufficientSample =
    input.sampleCount === null ? false : input.sampleCount >= 30;

  if (yearsOld <= 2 && input.missingRate < 0.1 && hasSufficientSample) {
    return {
      level: "high",
      reason: `データ年: ${input.dataYear}（${yearsOld}年前）、欠損率: ${(input.missingRate * 100).toFixed(0)}%、サンプル数: ${input.sampleCount}`,
    };
  }

  if (yearsOld <= 4 && input.missingRate < 0.3) {
    return {
      level: "medium",
      reason: `データ年: ${input.dataYear}（${yearsOld}年前）、欠損率: ${(input.missingRate * 100).toFixed(0)}%`,
    };
  }

  const reasons: string[] = [];
  if (yearsOld > 4) {
    reasons.push(`データが${yearsOld}年前`);
  }
  if (input.missingRate >= 0.3) {
    reasons.push(`欠損率が${(input.missingRate * 100).toFixed(0)}%`);
  }
  if (!hasSufficientSample && input.sampleCount !== null) {
    reasons.push(`サンプル数が${input.sampleCount}件`);
  }

  return {
    level: "low",
    reason: reasons.length > 0 ? reasons.join("、") : "信頼度評価の条件を満たしません",
  };
}
