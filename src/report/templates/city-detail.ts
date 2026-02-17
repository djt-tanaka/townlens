import { CityScoreResult, IndicatorDefinition, ConfidenceLevel } from "../../scoring/types";
import { escapeHtml } from "../../utils";
import { ReportRow } from "../../types";
import { generateCityNarrative } from "../narrative";

export interface CityDetailModel {
  readonly result: CityScoreResult;
  readonly definition: ReadonlyArray<IndicatorDefinition>;
  readonly rawRow: ReportRow;
  readonly totalCities: number;
}

function confidenceLabel(level: ConfidenceLevel): string {
  const labels: Record<ConfidenceLevel, string> = {
    high: "High",
    medium: "Medium",
    low: "Low",
  };
  return labels[level];
}

function numberFormat(value: number): string {
  return new Intl.NumberFormat("ja-JP").format(value);
}

/** 指標IDからReportRowの実値を取得するマッピング */
function getRawValue(indicatorId: string, rawRow: ReportRow): number | null | undefined {
  const mapping: Record<string, () => number | null | undefined> = {
    population_total: () => rawRow.total,
    kids_ratio: () => rawRow.ratio,
    condo_price_median: () => rawRow.condoPriceMedian,
    crime_rate: () => rawRow.crimeRate,
    flood_risk: () => {
      if (rawRow.floodRisk == null && rawRow.landslideRisk == null) return undefined;
      return (rawRow.floodRisk ? 1 : 0) + (rawRow.landslideRisk ? 1 : 0);
    },
    evacuation_sites: () => rawRow.evacuationSiteCount,
  };
  return mapping[indicatorId]?.() ?? undefined;
}

function formatRawValue(raw: number | null | undefined, def: IndicatorDefinition): string {
  if (raw === null || raw === undefined) {
    return "-";
  }
  return def.precision === 0 ? numberFormat(raw) : raw.toFixed(def.precision);
}

/** 価格のQ25-Q75レンジ行（存在する場合のみ） */
function renderPriceRange(rawRow: ReportRow): string {
  const q25 = rawRow.condoPriceQ25;
  const q75 = rawRow.condoPriceQ75;
  const count = rawRow.condoPriceCount;
  if (q25 == null || q75 == null) {
    return "";
  }
  const countDisplay = count != null ? `（取引件数: ${numberFormat(count)}件）` : "";
  const affordabilityLine =
    rawRow.affordabilityRate != null
      ? `
        <tr>
          <td>├ 予算内取引割合</td>
          <td class="num">${rawRow.affordabilityRate.toFixed(1)}%</td>
          <td class="num">-</td>
          <td class="num">-</td>
        </tr>`
      : "";
  return `
        <tr>
          <td>├ 価格レンジ (Q25-Q75)</td>
          <td class="num">${numberFormat(q25)} 〜 ${numberFormat(q75)} 万円${countDisplay}</td>
          <td class="num">-</td>
          <td class="num">-</td>
        </tr>${affordabilityLine}`;
}

export function renderCityDetail(model: CityDetailModel): string {
  const { result, rawRow } = model;

  const indicatorRows = model.definition
    .map((def) => {
      const cs = result.choice.find((c) => c.indicatorId === def.id);
      const bs = result.baseline.find((b) => b.indicatorId === def.id);
      const raw = getRawValue(def.id, rawRow);
      const rawDisplay = formatRawValue(raw, def);
      const priceRange = def.id === "condo_price_median" ? renderPriceRange(rawRow) : "";

      return `
        <tr>
          <td>${escapeHtml(def.label)}</td>
          <td class="num">${rawDisplay} ${escapeHtml(def.unit)}</td>
          <td class="num">${cs ? cs.score.toFixed(1) : "-"}</td>
          <td class="num">${bs ? `${bs.percentile.toFixed(1)}%` : "-"}</td>
        </tr>${priceRange}`;
    })
    .join("\n");

  const notesList =
    result.notes.length > 0
      ? result.notes.map((n) => `<li>${escapeHtml(n)}</li>`).join("")
      : "<li>特記事項なし</li>";

  return `
    <section class="page">
      <h2>${escapeHtml(result.cityName)}（${escapeHtml(result.areaCode)}）</h2>
      <p class="meta">
        総合スコア: <strong>${result.compositeScore.toFixed(1)}</strong> / 100
        &nbsp;|&nbsp; 順位: <strong>${result.rank}位</strong>
        &nbsp;|&nbsp; 信頼度: <span class="badge badge-${result.confidence.level}">${confidenceLabel(result.confidence.level)}</span>
      </p>

      <h3>指標詳細</h3>
      <table>
        <thead>
          <tr>
            <th>指標</th>
            <th>実値</th>
            <th>候補内スコア</th>
            <th>パーセンタイル</th>
          </tr>
        </thead>
        <tbody>
          ${indicatorRows}
        </tbody>
      </table>

      <div class="narrative" style="margin-top:12px;">
        <h3>評価コメント</h3>
        <p>${escapeHtml(generateCityNarrative(result, model.definition, model.totalCities))}</p>
      </div>

      <h3 style="margin-top:12px;">注意事項</h3>
      <ul class="note" style="padding-left:16px;">
        ${notesList}
      </ul>
    </section>`;
}
