import { toCdParamName } from "../../utils";
import { normalizeLabel } from "../../normalize/label";
import type { ClassItem, ClassObj } from "./types";

export interface DefaultFilter {
  readonly paramName: string;
  readonly code: string;
}

/** 「総数」「総人口」「男女計」「計」に該当するラベルのスコアを返す */
export function isTotalLabel(name: string): number {
  const normalized = normalizeLabel(name);
  if (normalized === "総数") {
    return 100;
  }
  if (normalized === "総人口") {
    return 95;
  }
  if (normalized === "男女計") {
    return 90;
  }
  if (normalized === "計") {
    return 80;
  }
  if (normalized.includes("総数") || normalized.includes("総人口")) {
    return 70;
  }
  return 0;
}

/** 「総数」「実数」など、デフォルト（集約）値と見なせるラベルのスコアを返す */
function isDefaultLabel(name: string): number {
  const totalScore = isTotalLabel(name);
  if (totalScore > 0) {
    return totalScore;
  }
  const normalized = normalizeLabel(name);
  if (normalized === "実数") {
    return 100;
  }
  if (normalized.includes("実数")) {
    return 80;
  }
  if (normalized === "人" || normalized === "人口") {
    return 60;
  }
  return 0;
}

/** 分類内で「総数」「実数」に該当するデフォルト項目を探す */
function findDefaultItem(cls: ClassObj): ClassItem | null {
  const scored = [...cls.items]
    .map((item) => ({ ...item, score: isDefaultLabel(item.name) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored.length > 0 ? scored[0] : null;
}

/**
 * 指定された分類以外のcat/tab分類について、デフォルト（総数/実数）コードを検出する。
 * APIパラメータに追加することで、不要なクロス集計行（男女別、構成比等）を排除する。
 */
export function resolveDefaultFilters(
  classObjs: ReadonlyArray<ClassObj>,
  excludeClassIds: ReadonlySet<string>,
): ReadonlyArray<DefaultFilter> {
  return classObjs
    .filter((cls) => !excludeClassIds.has(cls.id))
    .filter((cls) => cls.id.startsWith("cat") || cls.id === "tab")
    .map((cls) => {
      const defaultItem = findDefaultItem(cls);
      if (!defaultItem) {
        return null;
      }
      return {
        paramName: toCdParamName(cls.id),
        code: defaultItem.code,
      };
    })
    .filter((f): f is DefaultFilter => f !== null);
}
