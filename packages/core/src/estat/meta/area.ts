import { AppError } from "../../errors";
import { normalizeLabel, normalizeLabelWithKana } from "../../normalize/label";
import { findByReading } from "../../normalize/readings";
import type { AreaEntry, CityResolution, ClassObj } from "./types";

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
