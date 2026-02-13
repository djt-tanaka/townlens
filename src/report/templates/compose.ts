import { CityScoreResult, IndicatorDefinition, WeightPreset } from "../../scoring/types";
import { ReportRow } from "../../types";
import { baseStyles } from "./styles";
import { CoverModel, renderCover } from "./cover";
import { renderSummary } from "./summary";
import { renderDashboard } from "./dashboard";
import { renderCityDetail } from "./city-detail";
import { renderDisclaimer } from "./disclaimer";
import { escapeHtml } from "../../utils";

export interface ScoredReportModel {
  readonly title: string;
  readonly generatedAt: string;
  readonly cities: ReadonlyArray<string>;
  readonly statsDataId: string;
  readonly timeLabel: string;
  readonly preset: WeightPreset;
  readonly results: ReadonlyArray<CityScoreResult>;
  readonly definitions: ReadonlyArray<IndicatorDefinition>;
  readonly rawRows: ReadonlyArray<ReportRow>;
  /** Phase 1: 不動産価格データが含まれるか */
  readonly hasPriceData?: boolean;
  /** Phase 1: 物件タイプラベル */
  readonly propertyTypeLabel?: string;
  /** Phase 1: 予算上限（万円） */
  readonly budgetLimit?: number;
  /** Phase 2a: 犯罪統計データが含まれるか */
  readonly hasCrimeData?: boolean;
  /** Phase 2b: 災害リスクデータが含まれるか */
  readonly hasDisasterData?: boolean;
}

/**
 * 全セクションを組み立てて完全なHTML文書を返す
 */
export function renderScoredReportHtml(model: ScoredReportModel): string {
  const cover = renderCover({
    title: model.title,
    generatedAt: model.generatedAt,
    cities: model.cities,
    statsDataId: model.statsDataId,
    timeLabel: model.timeLabel,
    presetLabel: model.preset.label,
    hasPriceData: model.hasPriceData,
    propertyTypeLabel: model.propertyTypeLabel,
    budgetLimit: model.budgetLimit,
  });

  const summary = renderSummary({
    results: model.results,
    presetLabel: model.preset.label,
  });

  const dashboard = renderDashboard({
    results: model.results,
    definitions: model.definitions,
  });

  const cityDetails = model.results
    .map((result) => {
      const rawRow = model.rawRows.find((r) => r.areaCode === result.areaCode);
      if (!rawRow) {
        return "";
      }
      return renderCityDetail({
        result,
        definition: model.definitions,
        rawRow,
      });
    })
    .join("\n");

  const disclaimer = renderDisclaimer({
    statsDataId: model.statsDataId,
    timeLabel: model.timeLabel,
    generatedAt: model.generatedAt,
    hasPriceData: model.hasPriceData,
    hasCrimeData: model.hasCrimeData,
    hasDisasterData: model.hasDisasterData,
  });

  return `<!doctype html>
<html lang="ja">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(model.title)}</title>
    <style>${baseStyles()}</style>
  </head>
  <body>
    ${cover}
    ${summary}
    ${dashboard}
    ${cityDetails}
    ${disclaimer}
  </body>
</html>`;
}
