/**
 * データ取得フェーズの共通実行ロジック。
 * 各フェーズ（不動産価格・犯罪・災害・教育・交通・医療）で繰り返される
 * try/catch/merge/enrich パターンを一元化する。
 */

import type { ReportRow, CityIndicators, IndicatorDefinition } from "@townlens/core";

/** データ取得フェーズの累積状態 */
export interface PhaseState {
  readonly scoringInput: ReadonlyArray<CityIndicators>;
  readonly definitions: ReadonlyArray<IndicatorDefinition>;
  readonly enrichedRows: ReadonlyArray<ReportRow>;
}

/** データ取得フェーズの設定 */
export interface DataPhaseConfig<TData> {
  readonly name: string;
  readonly indicators: ReadonlyArray<IndicatorDefinition>;
  readonly fetch: () => Promise<ReadonlyMap<string, TData>>;
  readonly merge: (
    input: ReadonlyArray<CityIndicators>,
    data: ReadonlyMap<string, TData>,
  ) => ReadonlyArray<CityIndicators>;
  readonly enrich: (row: ReportRow, data: TData) => ReportRow;
}

/** フェーズの実行結果 */
export interface PhaseResult {
  readonly state: PhaseState;
  readonly hasData: boolean;
}

/** 単一フェーズを実行する */
export async function executePhase<TData>(
  config: DataPhaseConfig<TData>,
  current: PhaseState,
): Promise<PhaseResult> {
  try {
    const dataMap = await config.fetch();

    if (dataMap.size === 0) {
      console.warn(`[warn] ${config.name}が0件でした`);
      return { state: current, hasData: false };
    }

    return {
      state: {
        scoringInput: config.merge(current.scoringInput, dataMap),
        definitions: [...current.definitions, ...config.indicators],
        enrichedRows: current.enrichedRows.map((row) => {
          const data = dataMap.get(row.areaCode);
          if (!data) return row;
          return config.enrich(row, data);
        }),
      },
      hasData: true,
    };
  } catch (err) {
    console.warn(
      `[warn] ${config.name}の取得に失敗しました: ${err instanceof Error ? err.message : String(err)}`,
    );
    return { state: current, hasData: false };
  }
}
