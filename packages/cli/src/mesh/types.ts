/** メッシュ単位の人口データポイント */
export interface MeshDataPoint {
  readonly meshCode: string;
  readonly population?: number;
  readonly kidsPopulation?: number;
  readonly kidsRatio?: number;
}

/** 複数メッシュの集約結果 */
export interface AggregatedMeshData {
  readonly totalPopulation: number;
  readonly totalKids: number;
  readonly kidsRatio: number;
  readonly meshCount: number;
  /** データ取得できたメッシュの割合 (0-1) */
  readonly coverageRate: number;
}

/** メッシュデータ取得の設定 */
export interface MeshDataConfig {
  readonly statsDataId: string;
  readonly timeCode?: string;
  readonly selectors?: {
    readonly classId?: string;
    readonly totalCode?: string;
    readonly kidsCode?: string;
  };
}
