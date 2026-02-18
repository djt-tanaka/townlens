/**
 * ファジー検索モジュール。
 * 部分一致・連続一致・先頭一致ボーナスによるスコアリング。
 */
import { normalizeLabel } from "@townlens/core";

/** ファジー検索の候補アイテム */
export interface FuzzyCandidate {
  readonly label: string;
  readonly value: string;
}

/** ファジー検索のオプション */
export interface FuzzySearchOptions {
  readonly maxResults?: number;
}

/** ファジースコアを計算する */
function computeScore(query: string, target: string): number {
  if (query.length === 0) return 1;

  // 完全一致
  if (target === query) return 100;

  // 前方一致
  if (target.startsWith(query)) return 80;

  // 含み一致
  if (target.includes(query)) return 60;

  // 逆包含（クエリがターゲットより長い場合）
  if (query.includes(target)) return 40;

  // 文字共通度
  let common = 0;
  const targetChars = new Set(target);
  for (const ch of new Set(query)) {
    if (targetChars.has(ch)) {
      common++;
    }
  }

  if (common === 0) return 0;

  // 共通文字率
  const ratio = common / Math.max(query.length, target.length);
  return Math.round(ratio * 30);
}

/** ファジー検索を実行する */
export function fuzzySearch(
  query: string,
  candidates: ReadonlyArray<FuzzyCandidate>,
  options?: FuzzySearchOptions,
): ReadonlyArray<FuzzyCandidate> {
  const normalizedQuery = normalizeLabel(query);
  const maxResults = options?.maxResults ?? candidates.length;

  if (normalizedQuery.length === 0) {
    return candidates.slice(0, maxResults);
  }

  return candidates
    .map((candidate) => ({
      candidate,
      score: computeScore(normalizedQuery, normalizeLabel(candidate.label)),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults)
    .map((item) => item.candidate);
}
