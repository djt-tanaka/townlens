/**
 * レポート生成パイプライン。
 * 実装は @townlens/core に移動済み。Web 側は再エクスポートのみ。
 */
export { runReportPipeline } from "@townlens/core";
export type { PipelineInput, PipelineResult, PipelineClients } from "@townlens/core";
