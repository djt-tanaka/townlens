import type { ChoiceScore, IndicatorDefinition } from "../scoring/types";
import { STRONG_THRESHOLD, WEAK_THRESHOLD } from "./constants";

/** 指標の評価分類 */
export type IndicatorRating = "strong" | "neutral" | "weak";

/** 分類済み指標（indicatorId 付き） */
export interface ClassifiedIndicator {
  readonly id: string;
  readonly label: string;
  readonly score: number;
  readonly rating: IndicatorRating;
}

/** Choice Score を強み/中立/弱みに分類する */
export function classifyIndicators(
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
export function groupByRating(indicators: ReadonlyArray<ClassifiedIndicator>): {
  readonly strengths: ReadonlyArray<ClassifiedIndicator>;
  readonly weaknesses: ReadonlyArray<ClassifiedIndicator>;
} {
  return {
    strengths: indicators.filter((i) => i.rating === "strong"),
    weaknesses: indicators.filter((i) => i.rating === "weak"),
  };
}
