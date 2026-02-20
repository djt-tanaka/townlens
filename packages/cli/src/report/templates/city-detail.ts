import { escapeHtml, generateCityNarrative, CATEGORY_COLORS, starColor } from "@townlens/core";
import type {
  CityScoreResult,
  IndicatorCategory,
  IndicatorDefinition,
  ConfidenceLevel,
  ReportRow,
  WeightPreset,
} from "@townlens/core";
import { renderScoreGauge } from "./charts/gauge";

export interface CityDetailModel {
  readonly result: CityScoreResult;
  readonly definition: ReadonlyArray<IndicatorDefinition>;
  readonly rawRow: ReportRow;
  readonly totalCities: number;
  readonly rawRows?: ReadonlyArray<ReportRow>;
  readonly preset?: WeightPreset;
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
function getRawValue(
  indicatorId: string,
  rawRow: ReportRow,
): number | null | undefined {
  const mapping: Record<string, () => number | null | undefined> = {
    population_total: () => rawRow.total,
    kids_ratio: () => rawRow.ratio,
    condo_price_median: () => rawRow.condoPriceMedian,
    crime_rate: () => rawRow.crimeRate,
    flood_risk: () => {
      if (rawRow.floodRisk == null && rawRow.landslideRisk == null)
        return undefined;
      return (rawRow.floodRisk ? 1 : 0) + (rawRow.landslideRisk ? 1 : 0);
    },
    evacuation_sites: () => rawRow.evacuationSiteCount,
  };
  return mapping[indicatorId]?.() ?? undefined;
}

function formatRawValue(
  raw: number | null | undefined,
  def: IndicatorDefinition,
): string {
  if (raw === null || raw === undefined) {
    return "-";
  }
  return def.precision === 0 ? numberFormat(raw) : raw.toFixed(def.precision);
}

/** 価格レンジ情報のHTML（カード内表示用） */
function renderPriceRangeCard(rawRow: ReportRow): string {
  const q25 = rawRow.condoPriceQ25;
  const q75 = rawRow.condoPriceQ75;
  const count = rawRow.condoPriceCount;
  if (q25 == null || q75 == null) {
    return "";
  }
  const countDisplay =
    count != null
      ? `<span class="note">\uff08\u53d6\u5f15\u4ef6\u6570: ${numberFormat(count)}\u4ef6\uff09</span>`
      : "";
  const affordabilityLine =
    rawRow.affordabilityRate != null
      ? `<div style="margin-top:6px;font-size:12px;">\u4e88\u7b97\u5185\u53d6\u5f15\u5272\u5408: <strong>${rawRow.affordabilityRate.toFixed(1)}%</strong></div>`
      : "";

  return `
    <div style="margin-top:8px;padding:8px 12px;background:#f8fafc;border-radius:8px;font-size:12px;">
      \u4fa1\u683c\u30ec\u30f3\u30b8 (Q25-Q75): <strong>${numberFormat(q25)} \u301c ${numberFormat(q75)} \u4e07\u5186</strong> ${countDisplay}
      ${affordabilityLine}
    </div>`;
}

/** 指標をカテゴリ別にグループ化 */
function groupByCategory(
  definitions: ReadonlyArray<IndicatorDefinition>,
): ReadonlyArray<{
  readonly category: IndicatorCategory;
  readonly defs: ReadonlyArray<IndicatorDefinition>;
}> {
  const seen = new Set<IndicatorCategory>();
  const groups: Array<{
    readonly category: IndicatorCategory;
    readonly defs: ReadonlyArray<IndicatorDefinition>;
  }> = [];

  for (const def of definitions) {
    if (!seen.has(def.category)) {
      seen.add(def.category);
      groups.push({
        category: def.category,
        defs: definitions.filter((d) => d.category === def.category),
      });
    }
  }
  return groups;
}

export function renderCityDetail(model: CityDetailModel): string {
  const { result, rawRow } = model;

  // スコアゲージ
  const gauge = renderScoreGauge({
    score: result.compositeScore,
    label: result.starRating != null ? "\u7dcf\u5408\u8a55\u4fa1" : "\u7dcf\u5408\u30b9\u30b3\u30a2",
    rank: result.rank,
    totalCities: model.totalCities,
    starRating: result.starRating,
  });

  // カテゴリ別カード
  const groups = groupByCategory(model.definition);
  const categoryCards = groups
    .map((group) => {
      const catColor = CATEGORY_COLORS[group.category];

      const indicators = group.defs
        .map((def) => {
          const cs = result.choice.find((c) => c.indicatorId === def.id);
          const bs = result.baseline.find((b) => b.indicatorId === def.id);
          const is = result.indicatorStars?.find((s) => s.indicatorId === def.id);
          const raw = getRawValue(def.id, rawRow);
          const rawDisplay = formatRawValue(raw, def);
          const priceRange =
            def.id === "condo_price_median"
              ? renderPriceRangeCard(rawRow)
              : "";

          // スター評価がある場合はスター表示、なければ従来のスコア表示
          let scoreDisplay: string;
          if (is) {
            const filled = "\u2605";
            const empty = "\u2606";
            const stColor = starColor(is.stars);
            scoreDisplay = `
              <div style="font-size:18px;letter-spacing:1px;color:${stColor};">${filled.repeat(is.stars)}${empty.repeat(5 - is.stars)}</div>
              <div class="note" style="margin-top:2px;">\u5168\u56fd\u4e0a\u4f4d ${is.nationalPercentile.toFixed(0)}%</div>`;
          } else {
            const score = cs?.score ?? 0;
            const sColor =
              score >= 70 ? "#10b981" : score >= 40 ? "#f59e0b" : "#f43f5e";
            scoreDisplay = `
              <div style="font-size:20px;font-weight:800;color:${sColor};">${cs ? cs.score.toFixed(1) : "-"}</div>
              <div class="note">\u30b9\u30b3\u30a2</div>
              ${bs ? `<div class="note" style="margin-top:2px;">${bs.percentile.toFixed(1)}%</div>` : ""}`;
          }

          return `
          <div style="display:flex;justify-content:space-between;align-items:flex-start;padding:10px 0;${group.defs.indexOf(def) < group.defs.length - 1 ? "border-bottom:1px solid #f1f5f9;" : ""}">
            <div style="flex:1;">
              <div style="font-weight:600;font-size:13px;color:#1e293b;">${escapeHtml(def.label)}</div>
              <div style="font-size:18px;font-weight:700;color:#1e293b;margin-top:2px;">${rawDisplay} <span style="font-size:12px;color:#64748b;">${escapeHtml(def.unit)}</span></div>
              ${priceRange}
            </div>
            <div style="text-align:right;min-width:80px;">
              ${scoreDisplay}
            </div>
          </div>`;
        })
        .join("");

      // ミニスコアバー（カテゴリ平均）: スター評価ベースまたはスコアベース
      const catStars = group.defs
        .map((d) => result.indicatorStars?.find((s) => s.indicatorId === d.id)?.stars as number | undefined)
        .filter((s): s is number => s != null);
      const catScores = group.defs
        .map((d) => result.choice.find((c) => c.indicatorId === d.id)?.score)
        .filter((s): s is number => s !== undefined);

      const hasCatStars = catStars.length > 0;
      const catStarAvg = hasCatStars
        ? catStars.reduce((sum, v) => sum + v, 0) / catStars.length
        : 0;
      const catAvg =
        catScores.length > 0
          ? catScores.reduce((a, b) => a + b, 0) / catScores.length
          : 0;

      const avgDisplay = hasCatStars
        ? (() => {
            const rounded = Math.round(catStarAvg);
            const filled = "\u2605";
            const empty = "\u2606";
            const stColor = starColor(catStarAvg);
            return `<span style="font-size:14px;color:${stColor};">${filled.repeat(rounded)}${empty.repeat(5 - rounded)}</span>`;
          })()
        : `\u5e73\u5747 <strong style="color:${catColor.primary};">${catAvg.toFixed(1)}</strong>`;

      // バーの幅: スター評価では5段階ベース、なければ100ベース
      const barWidth = hasCatStars ? (catStarAvg / 5) * 100 : catAvg;

      return `
        <div class="score-card" style="border-left:4px solid ${catColor.primary};">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
            <div style="display:flex;align-items:center;gap:8px;">
              <span style="font-size:18px;">${catColor.emoji}</span>
              <span style="font-weight:700;font-size:15px;color:${catColor.dark};">${escapeHtml(catColor.label)}</span>
            </div>
            <div style="font-size:13px;color:#64748b;">${avgDisplay}</div>
          </div>
          <div class="score-bar" style="height:6px;margin-bottom:12px;">
            <div class="score-bar-fill" style="width:${barWidth}%;background:${catColor.primary};"></div>
          </div>
          ${indicators}
        </div>`;
    })
    .join("\n");

  const notesList =
    result.notes.length > 0
      ? result.notes.map((n) => `<li>${escapeHtml(n)}</li>`).join("")
      : "<li>\u7279\u8a18\u4e8b\u9805\u306a\u3057</li>";

  return `
    <section class="page">
      <h2>${escapeHtml(result.cityName)}\uff08${escapeHtml(result.areaCode)}\uff09</h2>

      <div style="display:flex;align-items:center;gap:24px;margin-bottom:20px;flex-wrap:wrap;">
        <div class="chart-container" style="margin:0;">${gauge}</div>
        <div>
          ${result.starRating != null
            ? `<p class="meta" style="margin-bottom:8px;">
            \u7dcf\u5408\u8a55\u4fa1: <strong style="font-size:18px;">${result.starRating.toFixed(1)}</strong> / 5.0
          </p>`
            : `<p class="meta" style="margin-bottom:8px;">
            \u7dcf\u5408\u30b9\u30b3\u30a2: <strong style="font-size:18px;">${result.compositeScore.toFixed(1)}</strong> / 100
          </p>`}
          <p class="meta" style="margin-bottom:8px;">
            \u4fe1\u983c\u5ea6: <span class="badge badge-${result.confidence.level}">${confidenceLabel(result.confidence.level)}</span>
          </p>
        </div>
      </div>

      ${categoryCards}

      <div class="narrative" style="margin-top:16px;">
        <h3>\u8a55\u4fa1\u30b3\u30e1\u30f3\u30c8</h3>
        <p>${escapeHtml(generateCityNarrative(result, model.definition, model.totalCities, { rawRows: model.rawRows, preset: model.preset }))}</p>
      </div>

      <h3 style="margin-top:16px;">\u6ce8\u610f\u4e8b\u9805</h3>
      <ul class="note" style="padding-left:16px;">
        ${notesList}
      </ul>
    </section>`;
}
