import { ReinfoApiClient } from "./client";
import { CityLocation } from "./city-locations";

/** タイル座標 */
export interface TileCoord {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/** GeoJSON Feature（簡易型定義） */
export interface GeoJsonFeature {
  readonly type: "Feature";
  readonly geometry: {
    readonly type: string;
    readonly coordinates: unknown;
  };
  readonly properties: Record<string, unknown>;
}

/** GeoJSON FeatureCollection（簡易型定義） */
export interface GeoJsonFeatureCollection {
  readonly type: "FeatureCollection";
  readonly features: ReadonlyArray<GeoJsonFeature>;
}

/** 災害リスク判定結果 */
export interface DisasterRiskResult {
  /** 洪水浸水想定区域にフィーチャが存在するか */
  readonly floodRisk: boolean;
  /** 土砂災害警戒区域にフィーチャが存在するか */
  readonly landslideRisk: boolean;
  /** 周辺の指定緊急避難場所数 */
  readonly evacuationSiteCount: number;
}

/** 標準的なSlippy Map式の緯度経度→タイル座標変換 */
export function latLngToTile(lat: number, lng: number, zoom: number): TileCoord {
  const n = Math.pow(2, zoom);
  const x = Math.floor(((lng + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n);
  return { x, y, z: zoom };
}

/** デフォルトのズームレベル（約1km²のエリアをカバー） */
const DEFAULT_ZOOM = 14;

/** API呼び出し間のディレイ（ms） */
const TILE_DELAY_MS = 200;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 指定地点の災害リスクを判定する。
 * 3種のタイルAPI（洪水/土砂/避難場所）を呼び出し、フィーチャの有無で判定する。
 */
export async function fetchDisasterRisk(
  client: ReinfoApiClient,
  location: CityLocation,
  zoom: number = DEFAULT_ZOOM,
): Promise<DisasterRiskResult> {
  const tile = latLngToTile(location.lat, location.lng, zoom);

  const [floodData, landslideData, evacuationData] = await Promise.all([
    client.fetchTile("XKT026", tile).catch((err) => {
      console.warn(`[warn] 洪水浸水想定区域(XKT026)の取得に失敗: ${err instanceof Error ? err.message : String(err)}`);
      return null;
    }),
    client.fetchTile("XKT029", tile).catch((err) => {
      console.warn(`[warn] 土砂災害警戒区域(XKT029)の取得に失敗: ${err instanceof Error ? err.message : String(err)}`);
      return null;
    }),
    sleep(TILE_DELAY_MS).then(() => client.fetchTile("XGT001", tile).catch((err) => {
      console.warn(`[warn] 指定緊急避難場所(XGT001)の取得に失敗: ${err instanceof Error ? err.message : String(err)}`);
      return null;
    })),
  ]);

  const floodRisk = hasFeatures(floodData);
  const landslideRisk = hasFeatures(landslideData);
  const evacuationSiteCount = countFeatures(evacuationData);

  return { floodRisk, landslideRisk, evacuationSiteCount };
}

/** FeatureCollectionにフィーチャが1つ以上存在するか */
function hasFeatures(data: GeoJsonFeatureCollection | null): boolean {
  if (!data || !Array.isArray(data.features)) {
    return false;
  }
  return data.features.length > 0;
}

/** FeatureCollection内のフィーチャ数を返す */
function countFeatures(data: GeoJsonFeatureCollection | null): number {
  if (!data || !Array.isArray(data.features)) {
    return 0;
  }
  return data.features.length;
}
