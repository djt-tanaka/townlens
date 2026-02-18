import { AppError } from "../errors";
import { DATASETS } from "../config/datasets";
import { arrify, parseNumber, textFrom, toCdParamName } from "../utils";
import { normalizeLabel, normalizeLabelWithKana } from "../normalize/label";
import { findByReading } from "../normalize/readings";

export interface ClassItem {
  code: string;
  name: string;
}

export interface ClassObj {
  id: string;
  name: string;
  items: ClassItem[];
}

export interface AreaEntry {
  code: string;
  name: string;
}

export interface CityResolution {
  input: string;
  resolvedName: string;
  code: string;
}

export interface TimeSelection {
  classId: string;
  code: string;
  label: string;
}

export interface AgeSelection {
  classId: string;
  paramName: string;
  total: ClassItem;
  kids: ClassItem;
}

export interface DataValue {
  area?: string;
  time?: string;
  cats: Record<string, string>;
  value: number | null;
}

export function extractClassObjects(metaInfo: any): ClassObj[] {
  const classObjs = arrify(metaInfo?.CLASS_INF?.CLASS_OBJ);
  return classObjs
    .map((classObj): ClassObj | null => {
      const id = textFrom(classObj?.["@id"]);
      if (!id) {
        return null;
      }

      const items = arrify(classObj?.CLASS)
        .map((item): ClassItem | null => {
          const code = textFrom(item?.["@code"]);
          if (!code) {
            return null;
          }
          return {
            code,
            name: textFrom(item?.["@name"])
          };
        })
        .filter((item): item is ClassItem => item !== null);

      return {
        id,
        name: textFrom(classObj?.["@name"]),
        items
      };
    })
    .filter((item): item is ClassObj => item !== null);
}

function classScoreForArea(classObj: ClassObj): number {
  const id = normalizeLabel(classObj.id);
  const name = normalizeLabel(classObj.name);
  let score = 0;

  if (id.includes("area")) {
    score += 4;
  }
  if (name.includes("地域")) {
    score += 4;
  }
  if (name.includes("地域事項") || name.includes("地域区分")) {
    score += 3;
  }

  const sample = classObj.items.slice(0, 10).map((item) => item.name).join(" ");
  if (/(市|区|町|村)/.test(sample)) {
    score += 1;
  }

  return score;
}

export function resolveAreaClass(classObjs: ClassObj[]): ClassObj {
  const sorted = [...classObjs].sort((a, b) => classScoreForArea(b) - classScoreForArea(a));
  const selected = sorted[0];

  if (!selected || classScoreForArea(selected) <= 0) {
    throw new AppError("地域事項(cdArea)をメタ情報から特定できませんでした", [
      "statsDataId が市区町村を含む統計表か確認してください。",
      "townlens search --keyword \"市区町村 人口\" で統計表を再検索してください。"
    ]);
  }

  return selected;
}

export function buildAreaEntries(areaClass: ClassObj): AreaEntry[] {
  return areaClass.items.map((item) => ({
    code: item.code,
    name: item.name
  }));
}

const PREFECTURE_PREFIX = /^(北海道|東京都|京都府|大阪府|.{2,3}県)/;

function stripPrefecture(input: string): string {
  return input.replace(PREFECTURE_PREFIX, "");
}

function candidateScore(input: string, target: string): number {
  const a = normalizeLabel(input);
  const b = normalizeLabel(target);
  if (a === b) {
    return 100;
  }
  if (b.includes(a) || a.includes(b)) {
    return 70;
  }

  let common = 0;
  for (const ch of new Set(a)) {
    if (b.includes(ch)) {
      common += 1;
    }
  }
  return common;
}

export function resolveCities(cities: string[], areaEntries: AreaEntry[]): CityResolution[] {
  return cities.map((city) => resolveSingleCity(city, areaEntries));
}

function resolveSingleCity(city: string, areaEntries: AreaEntry[]): CityResolution {
  const normalizedInput = normalizeLabel(city);
  const strippedInput = normalizeLabel(stripPrefecture(city));

  const exact = areaEntries.filter((entry) => {
    const normalizedName = normalizeLabel(entry.name);
    return normalizedName === normalizedInput || normalizedName === strippedInput;
  });

  if (exact.length === 1) {
    return {
      input: city,
      resolvedName: exact[0].name,
      code: exact[0].code
    };
  }

  if (exact.length > 1) {
    throw new AppError(
      `市区町村名 '${city}' は複数候補があります`,
      [
        `候補: ${exact.slice(0, 8).map((entry) => `${entry.name}(${entry.code})`).join(", ")}`,
        "都道府県を含む正式名称で指定してください。"
      ],
      undefined,
      3
    );
  }

  // カナ正規化一致: カタカナ→ひらがな統一後に比較
  const kanaNormInput = normalizeLabelWithKana(city);
  const kanaStrippedInput = normalizeLabelWithKana(stripPrefecture(city));
  const kanaMatch = areaEntries.filter((entry) => {
    const kanaNormName = normalizeLabelWithKana(entry.name);
    return kanaNormName === kanaNormInput || kanaNormName === kanaStrippedInput;
  });

  if (kanaMatch.length === 1) {
    return {
      input: city,
      resolvedName: kanaMatch[0].name,
      code: kanaMatch[0].code,
    };
  }

  // 読み仮名一致: ひらがな/カタカナ入力を読み仮名DBで逆引き
  const readingCandidates = findByReading(kanaNormInput);
  if (readingCandidates.length > 0) {
    const readingMatch = areaEntries.filter((entry) =>
      readingCandidates.includes(entry.name),
    );
    if (readingMatch.length === 1) {
      return {
        input: city,
        resolvedName: readingMatch[0].name,
        code: readingMatch[0].code,
      };
    }
  }

  const partial = areaEntries.filter((entry) => {
    const normalizedName = normalizeLabel(entry.name);
    return normalizedName.includes(normalizedInput) || normalizedInput.includes(normalizedName) ||
      normalizedName.includes(strippedInput) || strippedInput.includes(normalizedName);
  });

  if (partial.length === 1) {
    return {
      input: city,
      resolvedName: partial[0].name,
      code: partial[0].code
    };
  }

  const suggestions = [...areaEntries]
    .map((entry) => ({
      ...entry,
      score: candidateScore(city, entry.name)
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .filter((entry) => entry.score > 0)
    .map((entry) => `${entry.name}(${entry.code})`);

  if (partial.length > 1) {
    throw new AppError(
      `市区町村名 '${city}' は曖昧です`,
      [
        `候補: ${partial.slice(0, 8).map((entry) => `${entry.name}(${entry.code})`).join(", ")}`,
        "より具体的な名称で再実行してください。"
      ],
      undefined,
      3
    );
  }

  throw new AppError(
    `市区町村名 '${city}' を解決できませんでした`,
    [
      suggestions.length > 0 ? `近い候補: ${suggestions.join(", ")}` : "メタ情報に候補がありません。",
      "statsDataId が市区町村粒度の統計か確認してください。"
    ],
    undefined,
    3
  );
}

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

export interface DefaultFilter {
  readonly paramName: string;
  readonly code: string;
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

function isTotalLabel(name: string): number {
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

export function extractDataValues(data: any): DataValue[] {
  const values = arrify(data?.GET_STATS_DATA?.STATISTICAL_DATA?.DATA_INF?.VALUE);
  return values.map((item) => {
    const attrs = Object.entries(item ?? {}).filter(([key]) => key.startsWith("@"));
    const cats: Record<string, string> = {};
    let area: string | undefined;
    let time: string | undefined;

    for (const [key, value] of attrs) {
      const normalizedKey = key.slice(1);
      if (normalizedKey === "area") {
        area = textFrom(value);
      } else if (normalizedKey === "time") {
        time = textFrom(value);
      } else if (normalizedKey.startsWith("cat") || normalizedKey === "tab") {
        cats[normalizedKey] = textFrom(value);
      }
    }

    return {
      area,
      time,
      cats,
      value: parseNumber(item?.$)
    };
  });
}

export function valuesByArea(values: DataValue[], timeCode: string): Map<string, number> {
  const map = new Map<string, number>();

  const filtered = values.filter((value) => {
    if (!value.area) {
      return false;
    }
    if (!value.time) {
      return true;
    }
    return value.time === timeCode;
  });

  for (const row of filtered) {
    if (!row.area || row.value === null) {
      continue;
    }
    // 防御: 同一areaの重複がある場合は最初の値を保持（上書きしない）
    if (!map.has(row.area)) {
      map.set(row.area, row.value);
    }
  }

  return map;
}

export function formatSelectionPreview(classObjs: ClassObj[]): string {
  const previews = classObjs
    .filter((classObj) => classObj.id.startsWith("cat"))
    .slice(0, 5)
    .map((classObj) => {
      const sample = classObj.items.slice(0, 5).map((item) => `${item.code}:${item.name}`).join(" | ");
      return `${classObj.id}(${classObj.name}) => ${sample}`;
    });

  return previews.join("\n");
}
