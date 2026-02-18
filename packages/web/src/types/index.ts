/**
 * Web 固有の API リクエスト/レスポンス型定義。
 * @townlens/core の型はそのまま使用し、ここでは Web API のインターフェースのみ定義する。
 */

import type {
  CityScoreResult,
  IndicatorDefinition,
  ReportRow,
  WeightPreset,
} from "@townlens/core";

/** GET /api/cities/search のレスポンス */
export interface CitySearchResponse {
  readonly cities: ReadonlyArray<{
    readonly code: string;
    readonly name: string;
    readonly prefecture: string;
  }>;
}

/** POST /api/reports のリクエスト */
export interface CreateReportRequest {
  readonly cities: ReadonlyArray<string>;
  readonly preset: string;
  readonly options?: {
    readonly includePrice?: boolean;
    readonly includeCrime?: boolean;
    readonly includeDisaster?: boolean;
  };
}

/** POST /api/reports のレスポンス */
export interface CreateReportResponse {
  readonly reportId: string;
  readonly status: "completed" | "failed";
  readonly error?: string;
}

/** GET /api/reports/[id] のレスポンス */
export interface ReportResponse {
  readonly report: {
    readonly id: string;
    readonly cities: ReadonlyArray<string>;
    readonly preset: WeightPreset;
    readonly createdAt: string;
    readonly results: ReadonlyArray<CityScoreResult>;
    readonly definitions: ReadonlyArray<IndicatorDefinition>;
    readonly rawRows: ReadonlyArray<ReportRow>;
    readonly hasPriceData: boolean;
    readonly hasCrimeData: boolean;
    readonly hasDisasterData: boolean;
  };
}

/** GET /api/usage のレスポンス */
export interface UsageResponse {
  readonly plan: "free" | "standard" | "premium";
  readonly currentMonth: {
    readonly reportsGenerated: number;
    readonly reportsLimit: number | null;
  };
}

/** 共通エラーレスポンス */
export interface ApiErrorResponse {
  readonly error: string;
  readonly details?: string;
}
