import { AppError } from "../../errors";
import { normalizeLabel } from "../../normalize/label";
import type { ClassObj, TimeSelection } from "./types";

function classScoreForTime(classObj: ClassObj): number {
  const id = normalizeLabel(classObj.id);
  const name = normalizeLabel(classObj.name);
  let score = 0;
  if (id.includes("time")) {
    score += 4;
  }
  if (name.includes("時間")) {
    score += 4;
  }
  if (name.includes("時間軸") || name.includes("時点")) {
    score += 2;
  }
  return score;
}

function timeComparable(code: string): { len: number; raw: string } {
  const digits = code.replace(/\D/g, "");
  return {
    len: digits.length,
    raw: digits || code
  };
}

/**
 * time分類のコードを新しい順（降順）にソートして返す。
 * フォールバック検索（最新年にデータがない場合に前年を試す等）に使用する。
 */
export function resolveTimeCandidates(classObjs: ClassObj[]): ReadonlyArray<TimeSelection> {
  const sorted = [...classObjs].sort((a, b) => classScoreForTime(b) - classScoreForTime(a));
  const timeClass = sorted[0];

  if (!timeClass || classScoreForTime(timeClass) <= 0) {
    return [];
  }

  return [...timeClass.items]
    .sort((a, b) => {
      const ca = timeComparable(a.code);
      const cb = timeComparable(b.code);
      if (ca.len !== cb.len) {
        return cb.len - ca.len;
      }
      if (ca.raw < cb.raw) {
        return 1;
      }
      if (ca.raw > cb.raw) {
        return -1;
      }
      return 0;
    })
    .map((item) => ({
      classId: timeClass.id,
      code: item.code,
      label: item.name,
    }));
}

export function resolveLatestTime(classObjs: ClassObj[], explicitCode?: string): TimeSelection {
  const sorted = [...classObjs].sort((a, b) => classScoreForTime(b) - classScoreForTime(a));
  const timeClass = sorted[0];

  if (!timeClass || classScoreForTime(timeClass) <= 0) {
    throw new AppError("時間軸(cdTime)をメタ情報から特定できませんでした", [
      "--timeCode で明示指定してください。"
    ]);
  }

  if (explicitCode) {
    const matched = timeClass.items.find((item) => item.code === explicitCode);
    if (!matched) {
      throw new AppError(`--timeCode '${explicitCode}' は存在しません`, [
        `利用可能な時間コード例: ${timeClass.items.slice(-8).map((item) => `${item.code}(${item.name})`).join(", ")}`
      ]);
    }

    return {
      classId: timeClass.id,
      code: matched.code,
      label: matched.name
    };
  }

  const latest = [...timeClass.items].sort((a, b) => {
    const ca = timeComparable(a.code);
    const cb = timeComparable(b.code);
    if (ca.len !== cb.len) {
      return cb.len - ca.len;
    }
    if (ca.raw < cb.raw) {
      return 1;
    }
    if (ca.raw > cb.raw) {
      return -1;
    }
    return 0;
  })[0];

  if (!latest) {
    throw new AppError("時間軸に値が存在しません", ["別の statsDataId を選択してください。"]);
  }

  return {
    classId: timeClass.id,
    code: latest.code,
    label: latest.name
  };
}
