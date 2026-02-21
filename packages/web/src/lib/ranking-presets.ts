/**
 * ランキングプリセットのメタ情報。
 * core パッケージの WeightPreset を Web 表示用に拡張する。
 */

export interface RankingPresetMeta {
  readonly name: string;
  readonly label: string;
  readonly description: string;
  readonly iconName: string;
  readonly slug: string;
}

export const RANKING_PRESET_META: ReadonlyArray<RankingPresetMeta> = [
  {
    name: "childcare",
    label: "子育てしやすい街",
    description:
      "保育・教育環境と安全性を重視したランキング",
    iconName: "Baby",
    slug: "childcare",
  },
  {
    name: "price",
    label: "住宅コスパの良い街",
    description:
      "住宅価格と生活コストを重視したランキング",
    iconName: "Home",
    slug: "price",
  },
  {
    name: "safety",
    label: "安全な街",
    description:
      "治安と災害リスクの低さを重視したランキング",
    iconName: "Shield",
    slug: "safety",
  },
];

const VALID_SLUGS = new Set(RANKING_PRESET_META.map((m) => m.slug));

/** プリセット名からメタ情報を検索 */
export function findRankingPresetMeta(
  name: string,
): RankingPresetMeta | undefined {
  return RANKING_PRESET_META.find((m) => m.name === name);
}

/** URL スラグが有効なプリセットかどうか */
export function isValidPresetSlug(slug: string): slug is string {
  return VALID_SLUGS.has(slug);
}
