/**
 * 地理ターゲットの判別共用体型。
 * 市区町村・メッシュ・駅圏を統一的に扱う。
 */

/** 地理ターゲットの種別 */
export type GeoTargetKind = "municipality" | "mesh" | "station_area";

/** メッシュレベル（JIS X 0410） */
export type MeshLevel = 1 | 2 | 3 | "half";

/** 共通の地理ターゲットベース */
interface GeoTargetBase {
  readonly kind: GeoTargetKind;
  /** スコアリングに渡す一意識別子 */
  readonly id: string;
  /** 表示用ラベル */
  readonly label: string;
  readonly lat?: number;
  readonly lng?: number;
}

/** 市区町村ターゲット（既存互換） */
export interface MunicipalityTarget extends GeoTargetBase {
  readonly kind: "municipality";
  /** 5桁の市区町村コード */
  readonly areaCode: string;
}

/** メッシュターゲット */
export interface MeshTarget extends GeoTargetBase {
  readonly kind: "mesh";
  /** 4-9桁のメッシュコード */
  readonly meshCode: string;
  readonly meshLevel: MeshLevel;
  /** 参考: 親市区町村コード */
  readonly parentAreaCode?: string;
}

/** 駅圏ターゲット */
export interface StationAreaTarget extends GeoTargetBase {
  readonly kind: "station_area";
  readonly stationName: string;
  readonly lineName: string;
  /** 圏の半径(m) */
  readonly radiusM: number;
  /** 圏内メッシュコード群 */
  readonly meshCodes: ReadonlyArray<string>;
  /** 参考: 所属市区町村コード */
  readonly parentAreaCode?: string;
}

/** 地理ターゲット統合型 */
export type GeoTarget = MunicipalityTarget | MeshTarget | StationAreaTarget;

/** MunicipalityTargetを構築するヘルパー */
export function municipalityTarget(
  areaCode: string,
  label: string,
  location?: { readonly lat: number; readonly lng: number },
): MunicipalityTarget {
  return {
    kind: "municipality",
    id: areaCode,
    label,
    areaCode,
    ...location,
  };
}

/** MeshTargetを構築するヘルパー */
export function meshTarget(
  meshCode: string,
  meshLevel: MeshLevel,
  label: string,
  location?: { readonly lat: number; readonly lng: number },
  parentAreaCode?: string,
): MeshTarget {
  return {
    kind: "mesh",
    id: meshCode,
    label,
    meshCode,
    meshLevel,
    parentAreaCode,
    ...location,
  };
}

/** StationAreaTargetを構築するヘルパー */
export function stationAreaTarget(
  stationName: string,
  lineName: string,
  radiusM: number,
  meshCodes: ReadonlyArray<string>,
  location: { readonly lat: number; readonly lng: number },
  parentAreaCode?: string,
): StationAreaTarget {
  return {
    kind: "station_area",
    id: `station_${stationName}`,
    label: `${stationName}駅 ${radiusM}m圏`,
    stationName,
    lineName,
    radiusM,
    meshCodes,
    parentAreaCode,
    lat: location.lat,
    lng: location.lng,
  };
}
