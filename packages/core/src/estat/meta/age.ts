import { AppError } from "../../errors";
import { DATASETS } from "../../config/datasets";
import { normalizeLabel } from "../../normalize/label";
import { toCdParamName } from "../../utils";
import { isTotalLabel } from "./filters";
import type { AgeSelection, ClassObj } from "./types";

function isKidsLabel(name: string): number {
  const normalized = normalizeLabel(name);
  if (/^0[~\-]14歳$/.test(normalized)) {
    return 100;
  }
  if (/0[~\-]14/.test(normalized)) {
    return 95;
  }
  if (normalized.includes("0歳") && normalized.includes("14歳")) {
    return 90;
  }
  if (normalized.includes("15歳未満")) {
    return 85;
  }
  if (normalized.includes("14歳以下")) {
    return 80;
  }
  return 0;
}

function classScoreForAge(classObj: ClassObj): number {
  const id = normalizeLabel(classObj.id);
  const name = normalizeLabel(classObj.name);
  let score = 0;
  if (id.startsWith("cat")) {
    score += 2;
  }
  if (name.includes("年齢") || name.includes("分類")) {
    score += 3;
  }
  return score;
}

export function resolveAgeSelection(
  classObjs: ClassObj[],
  overrides?: { classId?: string; totalCode?: string; kidsCode?: string }
): AgeSelection {
  const candidates = [...classObjs]
    .filter((classObj) => classScoreForAge(classObj) > 0)
    .sort((a, b) => classScoreForAge(b) - classScoreForAge(a));

  const selectedClass = overrides?.classId
    ? candidates.find((classObj) => classObj.id === overrides.classId)
    : candidates.find((classObj) => {
        const totalScore = Math.max(...classObj.items.map((item) => isTotalLabel(item.name)), 0);
        const kidsScore = Math.max(...classObj.items.map((item) => isKidsLabel(item.name)), 0);
        return totalScore > 0 && kidsScore > 0;
      });

  if (!selectedClass) {
    const diagnostics = candidates.slice(0, 5).map((classObj) => {
      const bestTotal = Math.max(...classObj.items.map((item) => isTotalLabel(item.name)), 0);
      const bestKids = Math.max(...classObj.items.map((item) => isKidsLabel(item.name)), 0);
      const sample = classObj.items.slice(0, 6).map((item) => item.name).join(", ");
      return `  ${classObj.id}(${classObj.name}): 総数${bestTotal > 0 ? "○" : "×"} 0-14歳${bestKids > 0 ? "○" : "×"} → ${sample}`;
    }).join("\n");

    const hints: string[] = [
      diagnostics
        ? `候補分類の診断:\n${diagnostics}`
        : "分類候補が見つかりませんでした。",
      "--classId/--totalCode/--kidsCode で手動指定するか、別の statsDataId を試してください。",
      `事前診断: townlens inspect --statsDataId <ID>`,
      `推奨統計表: --statsDataId ${DATASETS.population.statsDataId} (${DATASETS.population.label})`,
    ];
    throw new AppError("年齢区分（総数/0〜14）を特定できませんでした", hints);
  }

  const total = overrides?.totalCode
    ? selectedClass.items.find((item) => item.code === overrides.totalCode)
    : [...selectedClass.items].sort((a, b) => isTotalLabel(b.name) - isTotalLabel(a.name))[0];

  const kids = overrides?.kidsCode
    ? selectedClass.items.find((item) => item.code === overrides.kidsCode)
    : [...selectedClass.items].sort((a, b) => isKidsLabel(b.name) - isKidsLabel(a.name))[0];

  if (!total || isTotalLabel(total.name) <= 0) {
    throw new AppError("総数カテゴリを特定できませんでした", [
      `分類 ${selectedClass.id} の候補例: ${selectedClass.items.slice(0, 12).map((item) => `${item.code}:${item.name}`).join(", ")}`,
      "--totalCode で手動指定してください。"
    ]);
  }

  if (!kids || isKidsLabel(kids.name) <= 0) {
    throw new AppError("0〜14歳カテゴリを特定できませんでした", [
      `分類 ${selectedClass.id} の候補例: ${selectedClass.items.slice(0, 12).map((item) => `${item.code}:${item.name}`).join(", ")}`,
      "--kidsCode で手動指定してください。"
    ]);
  }

  return {
    classId: selectedClass.id,
    paramName: toCdParamName(selectedClass.id),
    total,
    kids
  };
}
