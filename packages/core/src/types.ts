export interface SelectorConfig {
  classId?: string;
  totalCode?: string;
  kidsCode?: string;
}

export interface ReportRow {
  readonly cityInput: string;
  readonly cityResolved: string;
  readonly areaCode: string;
  readonly total: number;
  readonly kids: number;
  readonly ratio: number;
  readonly totalRank: number;
  readonly ratioRank: number;
  /** Phase 1: 取引価格中央値（万円） */
  readonly condoPriceMedian?: number | null;
  /** Phase 1: Q25-Q75レンジ（万円） */
  readonly condoPriceQ25?: number | null;
  readonly condoPriceQ75?: number | null;
  readonly condoPriceCount?: number | null;
  /** Phase 1: 予算上限内取引割合(%) */
  readonly affordabilityRate?: number | null;
  /** Phase 1: 物件タイプラベル */
  readonly propertyTypeLabel?: string | null;
  /** Phase 2a: 刑法犯認知件数（人口千人当たり） */
  readonly crimeRate?: number | null;
  /** Phase 2b: 洪水浸水リスクの有無 */
  readonly floodRisk?: boolean | null;
  /** Phase 2b: 土砂災害リスクの有無 */
  readonly landslideRisk?: boolean | null;
  /** Phase 2b: 指定緊急避難場所数 */
  readonly evacuationSiteCount?: number | null;
  /** Phase 3: 小学校数（人口1万人あたり） */
  readonly elementarySchoolsPerCapita?: number | null;
  /** Phase 3: 中学校数（人口1万人あたり） */
  readonly juniorHighSchoolsPerCapita?: number | null;
  /** Phase 4: 一般病院数（人口10万人あたり） */
  readonly hospitalsPerCapita?: number | null;
  /** Phase 4: 一般診療所数（人口10万人あたり） */
  readonly clinicsPerCapita?: number | null;
  /** Phase 4: 小児科標榜施設数（人口10万人あたり） */
  readonly pediatricsPerCapita?: number | null;
}
