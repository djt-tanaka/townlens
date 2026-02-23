/**
 * 比較ナラティブ生成。
 * 複数都市間のスコア差・トレードオフ・プリセット影響を解説する。
 */

import type {
  CityScoreResult,
  IndicatorCategory,
  IndicatorDefinition,
  WeightPreset,
} from "../scoring/types";
import { renderStarText } from "../scoring/star-rating";
import type { StarRating } from "../scoring/star-rating";
import type { ReportRow } from "../types";
import { getRawValueFromRow, findRawRow } from "../report-row-utils";
import { CLOSE_GAP, LARGE_GAP, CATEGORY_LABELS } from "./constants";
import { formatRawInline, type NarrativeOptions } from "./city-narrative";

// ─── 内部ヘルパー ───

/** スコア差の大きさを判定 */
function classifyGap(gap: number): "close" | "moderate" | "large" {
  if (gap <= CLOSE_GAP) return "close";
  if (gap >= LARGE_GAP) return "large";
  return "moderate";
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

// ─── 文章ビルダー ───

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

  // スター評価がある場合
  if (first.starRating != null && second.starRating != null) {
    const firstStars = renderStarText(Math.round(first.starRating) as StarRating);
    const secondStars = renderStarText(Math.round(second.starRating) as StarRating);
    const starGap = first.starRating - second.starRating;

    const allSame = sorted.every(
      (c) => c.starRating === first.starRating,
    );
    if (allSame) {
      return `候補間の総合評価に差はなく、いずれも${firstStars}（${first.starRating.toFixed(1)}/5.0）の同等の評価となりました。`;
    }

    if (Math.abs(starGap) < 0.3) {
      return `${first.cityName}が総合1位ですが、${second.cityName}との差はわずかであり、実質的にほぼ同等の評価です。`;
    }
    if (Math.abs(starGap) >= 1.0) {
      return `${first.cityName}が${firstStars}（${first.starRating.toFixed(1)}/5.0）で総合1位、2位の${second.cityName}は${secondStars}（${second.starRating.toFixed(1)}/5.0）です。`;
    }
    return `総合的に${first.cityName}（${firstStars} ${first.starRating.toFixed(1)}/5.0）が最も高い評価で、${second.cityName}（${secondStars} ${second.starRating.toFixed(1)}/5.0）が続きます。`;
  }

  // レガシー: 数値スコアベース
  const gap = first.compositeScore - second.compositeScore;

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

  if (leaderMap.size === 1) {
    const [leader] = leaderMap.keys();
    return `${leader}は全ての指標で候補内最高値を記録しています。`;
  }

  if (rawRows && rawRows.length >= 2) {
    return buildTradeoffWithRawValues(results, definitions, leaderMap, rawRows);
  }

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

      const others = sorted.filter((r) => r.cityName !== city);
      if (others.length === 0 || !leaderFormatted) {
        labelParts.push(label);
        continue;
      }

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

  if (first.compositeScore === second.compositeScore) return "";

  const sortedWeights = Object.entries(preset.weights).sort(
    ([, a], [, b]) => b - a,
  );
  const [topCatName, topCatWeight] = sortedWeights[0];
  const catLabel =
    CATEGORY_LABELS[topCatName as IndicatorCategory] ?? topCatName;
  const weightPct = Math.round(topCatWeight * 100);

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

// ─── 公開API ───

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
