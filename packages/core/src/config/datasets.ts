import type { SelectorConfig } from "../types";

export interface DatasetPreset {
  /** e-Stat 統計表ID */
  readonly statsDataId: string;
  /** 人間向け説明ラベル */
  readonly label: string;
  /** 年齢区分のセレクタ（人口データ用） */
  readonly selectors?: Readonly<SelectorConfig>;
}

/**
 * ツールが内部で使用するデータセットのプリセット。
 * ユーザーが statsDataId を知る必要がないよう、動作確認済みのIDを定義する。
 */
export const DATASETS = {
  /** 国勢調査 年齢（3区分），男女別人口 ― 都道府県，市区町村（令和2年） */
  population: {
    statsDataId: "0003448299",
    label: "国勢調査 年齢（3区分）人口（令和2年）",
    selectors: {
      classId: "cat01",
    },
  },
  /** 社会・人口統計体系 市区町村データ K安全（刑法犯認知件数） */
  crime: {
    statsDataId: "0000020211",
    label: "社会・人口統計体系 K安全（市区町村）",
  },
  /** 社会・人口統計体系 市区町村データ E教育（小学校数・中学校数等） */
  education: {
    statsDataId: "0000020205",
    label: "社会・人口統計体系 E教育（市区町村）",
  },
  /**
   * 国勢調査 地域メッシュ統計（3次メッシュ）。
   * --mesh-stats-id で上書き可能。
   */
  meshPopulation: {
    statsDataId: "0003448233",
    label: "国勢調査 地域メッシュ統計 人口（令和2年）",
    selectors: {
      classId: "cat01",
      totalCode: "000",
      kidsCode: "001",
    },
  },
} as const satisfies Record<string, DatasetPreset>;
