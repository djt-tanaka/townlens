/**
 * 駅名ファジー解決モジュール。
 * 漢字・ひらがな・カタカナ入力に対応し、駅DBから候補を検索する。
 */

import { AppError, normalizeLabel, katakanaToHiragana } from "@townlens/core";
import { findStationByName, getAllStationNames } from "./stations";
import type { StationEntry } from "./types";

/** 駅名解決結果 */
export interface StationResolution {
  /** 入力文字列 */
  readonly input: string;
  /** 解決された駅名（DB上の正式名称） */
  readonly stationName: string;
  /** 該当する StationEntry（複数路線の場合複数） */
  readonly entries: ReadonlyArray<StationEntry>;
}

/**
 * 駅名の読み仮名マップ。
 * ひらがな読み → 漢字駅名の逆引き。
 * 駅DBの全駅に対応する読みを定義する。
 */
const STATION_READINGS: ReadonlyMap<string, string> = new Map([
  // JR山手線
  ["とうきょう", "東京"],
  ["ゆうらくちょう", "有楽町"],
  ["しんばし", "新橋"],
  ["はままつちょう", "浜松町"],
  ["たまち", "田町"],
  ["しながわ", "品川"],
  ["おおさき", "大崎"],
  ["ごたんだ", "五反田"],
  ["めぐろ", "目黒"],
  ["えびす", "恵比寿"],
  ["しぶや", "渋谷"],
  ["はらじゅく", "原宿"],
  ["よよぎ", "代々木"],
  ["しんじゅく", "新宿"],
  ["しんおおくぼ", "新大久保"],
  ["たかだのばば", "高田馬場"],
  ["めじろ", "目白"],
  ["いけぶくろ", "池袋"],
  ["おおつか", "大塚"],
  ["すがも", "巣鴨"],
  ["こまごめ", "駒込"],
  ["たばた", "田端"],
  ["にしにっぽり", "西日暮里"],
  ["にっぽり", "日暮里"],
  ["うぐいすだに", "鶯谷"],
  ["うえの", "上野"],
  ["おかちまち", "御徒町"],
  ["あきはばら", "秋葉原"],
  ["かんだ", "神田"],
  // JR中央線
  ["なかの", "中野"],
  ["おぎくぼ", "荻窪"],
  ["きちじょうじ", "吉祥寺"],
  ["みたか", "三鷹"],
  ["こくぶんじ", "国分寺"],
  ["たちかわ", "立川"],
  ["はちおうじ", "八王子"],
  // JR京浜東北線・東海道線
  ["かわさき", "川崎"],
  ["よこはま", "横浜"],
  ["おおふな", "大船"],
  ["ふじさわ", "藤沢"],
  // 東急
  ["じゆうがおか", "自由が丘"],
  ["むさしこすぎ", "武蔵小杉"],
  ["ひよし", "日吉"],
  ["ふたこたまがわ", "二子玉川"],
  ["たまぷらーざ", "たまプラーザ"],
  // 小田急・京王
  ["しもきたざわ", "下北沢"],
  ["まちだ", "町田"],
  ["ちょうふ", "調布"],
  ["ふちゅう", "府中"],
  // 西武
  ["ねりま", "練馬"],
  ["ところざわ", "所沢"],
  // 東京メトロ
  ["おもてさんどう", "表参道"],
  ["ぎんざ", "銀座"],
  ["ろっぽんぎ", "六本木"],
  ["なかめぐろ", "中目黒"],
  ["あかさか", "赤坂"],
  ["おおてまち", "大手町"],
  ["とよす", "豊洲"],
  ["つきしま", "月島"],
  // 都営
  ["あざぶじゅうばん", "麻布十番"],
  ["しおどめ", "汐留"],
  // 埼玉
  ["おおみや", "大宮"],
  ["うらわ", "浦和"],
  ["かわぐち", "川口"],
  // 千葉
  ["ちば", "千葉"],
  ["ふなばし", "船橋"],
  ["かしわ", "柏"],
  ["まつど", "松戸"],
  // 近畿
  ["おおさか", "大阪"],
  ["うめだ", "梅田"],
  ["なんば", "難波"],
  ["てんのうじ", "天王寺"],
  ["きょうばし", "京橋"],
  ["しんおおさか", "新大阪"],
  ["さんのみや", "三ノ宮"],
  ["きょうと", "京都"],
  ["なら", "奈良"],
  // 中部
  ["なごや", "名古屋"],
  ["さかえ", "栄"],
  ["かなやま", "金山"],
  // 九州
  ["はかた", "博多"],
  ["てんじん", "天神"],
  // 北海道
  ["さっぽろ", "札幌"],
  ["おおどおり", "大通"],
  // 東北
  ["せんだい", "仙台"],
  // 北陸
  ["かなざわ", "金沢"],
  // 新幹線主要駅
  ["しずおか", "静岡"],
  ["はままつ", "浜松"],
  ["ひろしま", "広島"],
  ["おかやま", "岡山"],
]);

/** 「駅」「えき」「エキ」サフィックスを除去する */
function stripStationSuffix(input: string): string {
  return input.replace(/(駅|えき|エキ)$/u, "");
}

/** 入力をカナ正規化（全角→半角、カタカナ→ひらがな、空白除去） */
function normalizeStationInput(input: string): string {
  return katakanaToHiragana(normalizeLabel(stripStationSuffix(input)));
}

/**
 * 駅名を解決する。
 * マッチングパイプライン: 完全一致 → カナ読み逆引き → 部分一致 → エラー（候補付き）
 */
export function resolveStation(
  input: string,
  lineFilter?: string,
): StationResolution {
  const trimmed = input.trim();
  const stripped = stripStationSuffix(trimmed);
  const normalized = normalizeLabel(stripped);

  // 1. 完全一致（漢字そのまま）
  const exactEntries = findStationByName(stripped);
  if (exactEntries.length > 0) {
    return applyLineFilter({
      input: trimmed,
      stationName: stripped,
      entries: exactEntries,
    }, lineFilter);
  }

  // normalizeLabel 後の完全一致
  const allNames = getAllStationNames();
  const normalizedExact = allNames.find(
    (name) => normalizeLabel(name) === normalized,
  );
  if (normalizedExact) {
    const entries = findStationByName(normalizedExact);
    return applyLineFilter({
      input: trimmed,
      stationName: normalizedExact,
      entries,
    }, lineFilter);
  }

  // 2. カナ読み逆引き（ひらがな/カタカナ入力対応）
  const kanaInput = normalizeStationInput(trimmed);
  const readingMatch = STATION_READINGS.get(kanaInput);
  if (readingMatch) {
    const entries = findStationByName(readingMatch);
    if (entries.length > 0) {
      return applyLineFilter({
        input: trimmed,
        stationName: readingMatch,
        entries,
      }, lineFilter);
    }
  }

  // 3. 部分一致（漢字の含み検索）
  const partialMatches = allNames.filter((name) => {
    const normalizedName = normalizeLabel(name);
    return normalizedName.includes(normalized) || normalized.includes(normalizedName);
  });

  if (partialMatches.length === 1) {
    const entries = findStationByName(partialMatches[0]);
    return applyLineFilter({
      input: trimmed,
      stationName: partialMatches[0],
      entries,
    }, lineFilter);
  }

  if (partialMatches.length > 1) {
    // 完全前方一致を優先
    const prefixMatch = partialMatches.find(
      (name) => normalizeLabel(name).startsWith(normalized),
    );
    if (prefixMatch) {
      const entries = findStationByName(prefixMatch);
      return applyLineFilter({
        input: trimmed,
        stationName: prefixMatch,
        entries,
      }, lineFilter);
    }
  }

  // 4. ファジースコアリングで候補提示
  const suggestions = allNames
    .map((name) => ({
      name,
      score: fuzzyScore(normalized, normalizeLabel(name)),
    }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map((s) => s.name);

  throw new AppError(
    `駅名 '${trimmed}' を解決できません`,
    [
      suggestions.length > 0
        ? `候補: ${suggestions.join(", ")}`
        : "登録駅に一致する候補がありません。",
      "漢字の正式名称で指定してください。",
    ],
    undefined,
    3,
  );
}

/** 路線フィルタを適用する */
function applyLineFilter(
  resolution: StationResolution,
  lineFilter?: string,
): StationResolution {
  if (!lineFilter) return resolution;

  const normalizedFilter = normalizeLabel(lineFilter);
  const filtered = resolution.entries.filter(
    (entry) => normalizeLabel(entry.lineName).includes(normalizedFilter),
  );

  if (filtered.length === 0) {
    const availableLines = resolution.entries
      .map((e) => e.lineName)
      .join(", ");
    throw new AppError(
      `駅 '${resolution.stationName}' に路線 '${lineFilter}' が見つかりません`,
      [`利用可能な路線: ${availableLines}`],
      undefined,
      3,
    );
  }

  return {
    ...resolution,
    entries: filtered,
  };
}

/** 文字共通度によるファジースコア */
function fuzzyScore(input: string, target: string): number {
  if (input === target) return 100;
  if (target.includes(input) || input.includes(target)) return 70;

  let common = 0;
  for (const ch of new Set(input)) {
    if (target.includes(ch)) {
      common += 1;
    }
  }
  return common;
}

/** 複数駅を一括解決する */
export function resolveStations(
  inputs: ReadonlyArray<string>,
  lineFilter?: string,
): ReadonlyArray<StationResolution> {
  return inputs.map((input) => resolveStation(input, lineFilter));
}
