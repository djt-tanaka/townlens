import { ReinfoApiClient } from "./client";
import { getCityLocation } from "./city-locations";
import { fetchDisasterRisk, DisasterRiskResult } from "./disaster-client";

/** 都市ごとの災害リスクデータ */
export interface CityDisasterData {
  /** 洪水浸水リスクの有無 */
  readonly floodRisk: boolean;
  /** 土砂災害リスクの有無 */
  readonly landslideRisk: boolean;
  /** 災害リスクスコア（0=なし, 1=一方あり, 2=両方あり） */
  readonly riskScore: number;
  /** 周辺の指定緊急避難場所数 */
  readonly evacuationSiteCount: number;
}

/** API呼び出し間のディレイ（ms） */
const DELAY_MS = 300;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** DisasterRiskResultからリスクスコアを算出 */
function toRiskScore(result: DisasterRiskResult): number {
  return (result.floodRisk ? 1 : 0) + (result.landslideRisk ? 1 : 0);
}

/**
 * 複数都市の災害リスクデータを構築する。
 * 代表地点（市役所位置）の周辺タイルから洪水・土砂・避難場所情報を取得する。
 * 代表地点が未登録の都市はMapに含まれない。
 */
export async function buildDisasterData(
  client: ReinfoApiClient,
  areaCodes: ReadonlyArray<string>,
): Promise<ReadonlyMap<string, CityDisasterData>> {
  const result = new Map<string, CityDisasterData>();

  if (areaCodes.length === 0) {
    return result;
  }

  for (let i = 0; i < areaCodes.length; i++) {
    const code = areaCodes[i];
    const location = getCityLocation(code);
    if (!location) {
      continue;
    }

    if (i > 0) {
      await sleep(DELAY_MS);
    }

    const risk = await fetchDisasterRisk(client, location);
    result.set(code, {
      floodRisk: risk.floodRisk,
      landslideRisk: risk.landslideRisk,
      riskScore: toRiskScore(risk),
      evacuationSiteCount: risk.evacuationSiteCount,
    });
  }

  return result;
}
