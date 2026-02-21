/**
 * 主要駅データベース。
 * 実体は @townlens/core に移行済み。後方互換のため再エクスポートする。
 */

export {
  findStationByName,
  getAllStationNames,
  getStationCount,
} from "@townlens/core";
