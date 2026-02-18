import { escapeHtml } from "@townlens/core";
import { renderCityscapeSvg } from "./charts/cityscape";

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
  const citiesList = model.cities.map((c) => escapeHtml(c)).join("\u3001");
  const dataSources = [`e-Stat API (${escapeHtml(model.statsDataId)})`];
  if (model.hasPriceData) {
    dataSources.push("\u4e0d\u52d5\u7523\u60c5\u5831\u30e9\u30a4\u30d6\u30e9\u30ea API");
  }

  const priceConditions: string[] = [];
  if (model.propertyTypeLabel) {
    priceConditions.push(
      `\u7269\u4ef6\u30bf\u30a4\u30d7: ${escapeHtml(model.propertyTypeLabel)}`,
    );
  }
  if (model.budgetLimit !== undefined) {
    priceConditions.push(
      `\u4e88\u7b97\u4e0a\u9650: ${numberFormat(model.budgetLimit)}\u4e07\u5186`,
    );
  }

  const priceConditionLine =
    priceConditions.length > 0
      ? `<div style="display:flex;align-items:center;gap:8px;"><span style="font-size:16px;">\ud83d\udcb0</span><span>${priceConditions.join(" / ")}</span></div>`
      : "";

  const cityBadges = model.cities
    .map(
      (c) =>
        `<span style="display:inline-block;background:#e0f2fe;color:#075985;padding:4px 14px;border-radius:16px;font-weight:600;font-size:14px;">${escapeHtml(c)}</span>`,
    )
    .join(" ");

  return `
    <section class="page" style="display:flex;flex-direction:column;justify-content:center;align-items:center;">
      <div style="width:100%;border-radius:16px;overflow:hidden;margin-bottom:28px;">
        ${renderCityscapeSvg()}
      </div>

      <h1 style="font-size:36px;font-weight:800;color:#1e293b;margin-bottom:8px;text-align:center;">${escapeHtml(model.title)}</h1>
      <p style="font-size:16px;color:#64748b;margin-bottom:28px;text-align:center;">\u5b50\u80b2\u3066\u4e16\u5e2f\u306e\u305f\u3081\u306e\u8857\u3048\u3089\u3073\u30ec\u30dd\u30fc\u30c8</p>

      <div class="score-card" style="width:100%;max-width:420px;text-align:left;">
        <div style="display:flex;flex-direction:column;gap:12px;">
          <div style="display:flex;align-items:center;gap:8px;">
            <span style="font-size:16px;">\ud83c\udfe2</span>
            <span style="font-weight:600;color:#1e293b;">\u5bfe\u8c61\u5e02\u533a\u753a\u6751</span>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;padding-left:28px;">${cityBadges}</div>

          <div style="display:flex;align-items:center;gap:8px;margin-top:4px;">
            <span style="font-size:16px;">\ud83d\udcca</span>
            <span>\u30d7\u30ea\u30bb\u30c3\u30c8: <strong>${escapeHtml(model.presetLabel)}</strong></span>
          </div>

          ${priceConditionLine}

          <div style="display:flex;align-items:center;gap:8px;">
            <span style="font-size:16px;">\ud83d\udcc5</span>
            <span>\u751f\u6210\u65e5\u6642: ${escapeHtml(model.generatedAt)}</span>
          </div>

          <div style="display:flex;align-items:center;gap:8px;">
            <span style="font-size:16px;">\ud83d\udcc1</span>
            <span>\u30c7\u30fc\u30bf\u30bd\u30fc\u30b9: ${dataSources.join(" / ")}</span>
          </div>

          <div style="display:flex;align-items:center;gap:8px;">
            <span style="font-size:16px;">\ud83d\udd52</span>
            <span>\u6642\u70b9: ${escapeHtml(model.timeLabel)}</span>
          </div>
        </div>
      </div>

      <div style="margin-top:24px;display:flex;justify-content:center;gap:10px;flex-wrap:wrap;">
        <span class="category-badge" style="background:#d1fae5;color:#065f46;border:1px solid #10b98133;">\ud83d\udc76 \u5b50\u80b2\u3066</span>
        <span class="category-badge" style="background:#e0f2fe;color:#075985;border:1px solid #0ea5e933;">\ud83c\udfe0 \u4f4f\u5b85\u4fa1\u683c</span>
        <span class="category-badge" style="background:#ffe4e6;color:#9f1239;border:1px solid #f43f5e33;">\ud83d\udee1\ufe0f \u5b89\u5168</span>
        <span class="category-badge" style="background:#ede9fe;color:#5b21b6;border:1px solid #8b5cf633;">\ud83c\udf0a \u707d\u5bb3</span>
        <span class="category-badge" style="background:#fef3c7;color:#92400e;border:1px solid #f59e0b33;">\ud83d\ude83 \u4ea4\u901a</span>
      </div>
    </section>`;
}
