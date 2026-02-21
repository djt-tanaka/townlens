// ─── 共通型・ユーティリティ ───
export type { ReportRow, SelectorConfig } from "./types";
export { AppError, formatError } from "./errors";
export { arrify, textFrom, parseNumber, toCdParamName, escapeHtml } from "./utils";
export type { CacheAdapter } from "./cache";
export { DEFAULT_CACHE_TTL_MS } from "./cache";

// ─── 正規化 ───
export { normalizeLabel, normalizeLabelWithKana } from "./normalize/label";
export { katakanaToHiragana } from "./normalize/kana";
export { findByReading } from "./normalize/readings";

// ─── スコアリング ───
export type {
  IndicatorCategory,
  IndicatorDefinition,
  IndicatorValue,
  CityIndicators,
  ChoiceScore,
  CityScoreResult,
  ConfidenceInput,
  ConfidenceResult,
  ConfidenceLevel,
  BaselineScore,
  WeightPreset,
  IndicatorStarRating,
} from "./scoring/types";
export { scoreCities } from "./scoring";
export { scoreSingleCity } from "./scoring/single-city";
export type { SingleCityScore } from "./scoring/single-city";
export { mergeIndicators } from "./scoring/merge-indicators";
export { normalizeWithinCandidates } from "./scoring/normalize";
export type { ChoiceScoreWithCity } from "./scoring/normalize";
export { calculatePercentile } from "./scoring/percentile";
export { calculateCompositeScore } from "./scoring/composite";
export { evaluateConfidence } from "./scoring/confidence";
export {
  percentileToStars,
  renderStarText,
  renderStarTextFloat,
  starLabel,
  starColor,
  computeCompositeStars,
} from "./scoring/star-rating";
export type { StarRating } from "./scoring/star-rating";
export {
  NATIONAL_BASELINES,
  getNationalBaseline,
  computeNationalPercentile,
} from "./scoring/national-baseline";
export type { NationalBaselineEntry } from "./scoring/national-baseline";
export {
  CHILDCARE_FOCUSED,
  PRICE_FOCUSED,
  SAFETY_FOCUSED,
  ALL_PRESETS,
  findPreset,
  POPULATION_INDICATORS,
  PRICE_INDICATORS,
  SAFETY_INDICATORS,
  DISASTER_INDICATORS,
  EDUCATION_INDICATORS,
  TRANSPORT_INDICATORS,
  HEALTHCARE_INDICATORS,
  ALL_INDICATORS,
} from "./scoring/presets";

// ─── e-Stat ───
export { EstatApiClient } from "./estat/client";
export type { StatsListItem, GetStatsDataParams } from "./estat/client";
export {
  extractClassObjects,
  resolveAreaClass,
  buildAreaEntries,
  resolveCities,
  resolveLatestTime,
  resolveTimeCandidates,
  resolveAgeSelection,
  resolveDefaultFilters,
  extractDataValues,
  valuesByArea,
  formatSelectionPreview,
} from "./estat/meta";
export type {
  ClassItem,
  ClassObj,
  AreaEntry,
  CityResolution,
  TimeSelection,
  AgeSelection,
  DataValue,
  DefaultFilter,
} from "./estat/meta";
export { buildReportData, toScoringInput } from "./estat/report-data";
export type { BuildReportInput, BuildReportResult } from "./estat/report-data";
export { buildCrimeData } from "./estat/crime-data";
export type { CrimeDataConfig, CrimeStats } from "./estat/crime-data";
export { mergeCrimeIntoScoringInput } from "./estat/merge-crime-scoring";
export { buildEducationData } from "./estat/education-data";
export type { EducationDataConfig, EducationStats } from "./estat/education-data";
export { mergeEducationIntoScoringInput } from "./estat/merge-education-scoring";
export { buildHealthcareData } from "./estat/healthcare-data";
export type { HealthcareDataConfig, HealthcareStats } from "./estat/healthcare-data";
export { mergeHealthcareIntoScoringInput } from "./estat/merge-healthcare-scoring";

// ─── データセット定義 ───
export { DATASETS } from "./config/datasets";
export type { DatasetPreset } from "./config/datasets";

// ─── 不動産情報ライブラリ ───
export { ReinfoApiClient } from "./reinfo/client";
export type {
  ReinfoTradeRecord,
  ReinfoTradeResponse,
  ReinfoCityRecord,
  CondoPriceStats,
  PropertyType,
} from "./reinfo/types";
export { PROPERTY_TYPE_LABELS } from "./reinfo/types";
export {
  filterTradesByType,
  filterByBudgetLimit,
  parseTradePrices,
  calculatePriceStats,
  calculateAffordabilityRate,
} from "./reinfo/stats";
export { buildPriceData } from "./reinfo/price-data";
export { mergePriceIntoScoringInput } from "./reinfo/merge-scoring";
export { geocodeCityName } from "./reinfo/geocode";
export { getCityLocation, getCityLocationAsync, CITY_LOCATIONS } from "./reinfo/city-locations";
export type { CityLocation } from "./reinfo/city-locations";

// ─── 防災 ───
export { latLngToTile, fetchDisasterRisk } from "./reinfo/disaster-client";
export type { TileCoord, GeoJsonFeatureCollection, DisasterRiskResult } from "./reinfo/disaster-client";
export { buildDisasterData } from "./reinfo/disaster-data";
export { mergeDisasterIntoScoringInput } from "./reinfo/merge-disaster-scoring";

// ─── ナラティブ ───
export { generateCityNarrative, generateComparisonNarrative } from "./narrative";
export type { NarrativeOptions } from "./narrative";

// ─── チャート ───
export {
  CATEGORY_COLORS,
  CITY_COLORS,
  getCategoryColor,
  getCategoryForIndicator,
  getCityColor,
  renderCategoryBadge,
  renderCategoryLegend,
} from "./charts/colors";
export type { CategoryColor } from "./charts/colors";

// ─── 駅データ ───
export type { StationEntry } from "./station/types";
export {
  findStationByName,
  getAllStationNames,
  getStationCount,
  countStationsByAreaCode,
} from "./station/stations";
export { haversineDistanceKm } from "./station/haversine";
export {
  TERMINAL_STATIONS,
  nearestTerminalDistance,
  nearestTerminalDistanceKm,
} from "./station/terminal-stations";
export type { TerminalDistance } from "./station/terminal-stations";

// ─── 交通データ ───
export { buildTransportData } from "./estat/transport-data";
export type { TransportDataConfig, TransportStats } from "./estat/transport-data";
export { mergeTransportIntoScoringInput } from "./estat/merge-transport-scoring";

// ─── パイプライン ───
export { runReportPipeline } from "./pipeline/report-pipeline";
export type { PipelineInput, PipelineResult, PipelineClients } from "./pipeline/report-pipeline";
