/**
 * 駅データの型定義。
 */

/** 駅マスタの1エントリ */
export interface StationEntry {
  /** 駅名 */
  readonly name: string;
  /** 路線名 */
  readonly lineName: string;
  /** 緯度 */
  readonly lat: number;
  /** 経度 */
  readonly lng: number;
  /** 所属市区町村コード（5桁） */
  readonly areaCode?: string;
}
