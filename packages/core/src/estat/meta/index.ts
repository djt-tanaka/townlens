export type {
  ClassItem,
  ClassObj,
  AreaEntry,
  CityResolution,
  TimeSelection,
  AgeSelection,
  DataValue,
} from "./types";

export { extractClassObjects } from "./class-objects";

export {
  resolveAreaClass,
  buildAreaEntries,
  resolveCities,
  isMunicipalityCode,
  isDesignatedCityCode,
} from "./area";

export {
  resolveTimeCandidates,
  resolveLatestTime,
} from "./time";

export type { DefaultFilter } from "./filters";
export {
  isTotalLabel,
  resolveDefaultFilters,
} from "./filters";

export { resolveAgeSelection } from "./age";

export {
  extractDataValues,
  valuesByArea,
} from "./data";

export { formatSelectionPreview } from "./preview";

export type {
  OldWardEntry,
  WardReorganizationEntry,
  CodeExpansion,
} from "./ward-reorganization";
export {
  isReorganizedCode,
  isAbolishedCode,
  expandAreaCodes,
  aggregateRawValues,
  aggregatePerCapitaValues,
  aggregateBooleanValues,
  expandPopulationMap,
} from "./ward-reorganization";
