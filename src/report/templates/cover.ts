import { escapeHtml } from "../../utils";

export interface CoverModel {
  readonly title: string;
  readonly generatedAt: string;
  readonly cities: ReadonlyArray<string>;
  readonly statsDataId: string;
  readonly timeLabel: string;
  readonly presetLabel: string;
  /** Phase 1: 不動産価格データが含まれるか */
  readonly hasPriceData?: boolean;
  /** Phase 1: 物件タイプラベル */
  readonly propertyTypeLabel?: string;
  /** Phase 1: 予算上限（万円） */
  readonly budgetLimit?: number;
}

function numberFormat(value: number): string {
  return new Intl.NumberFormat("ja-JP").format(value);
}

export function renderCover(model: CoverModel): string {
  const citiesList = model.cities.map((c) => escapeHtml(c)).join("、");
  const dataSources = [`e-Stat API (${escapeHtml(model.statsDataId)})`];
  if (model.hasPriceData) {
    dataSources.push("不動産情報ライブラリ API");
  }

  const priceConditions: string[] = [];
  if (model.propertyTypeLabel) {
    priceConditions.push(`物件タイプ: ${escapeHtml(model.propertyTypeLabel)}`);
  }
  if (model.budgetLimit !== undefined) {
    priceConditions.push(`予算上限: ${numberFormat(model.budgetLimit)}万円`);
  }
  const priceConditionLine =
    priceConditions.length > 0
      ? `${priceConditions.join(" / ")}<br>`
      : "";

  return `
    <section class="page" style="display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;">
      <h1 style="font-size:28px;margin-bottom:24px;">${escapeHtml(model.title)}</h1>
      <div class="meta" style="line-height:2.2;">
        生成日時: ${escapeHtml(model.generatedAt)}<br>
        対象市区町村: ${citiesList}<br>
        プリセット: ${escapeHtml(model.presetLabel)}<br>
        ${priceConditionLine}
        データソース: ${dataSources.join(" / ")}<br>
        時点: ${escapeHtml(model.timeLabel)}
      </div>
    </section>`;
}
