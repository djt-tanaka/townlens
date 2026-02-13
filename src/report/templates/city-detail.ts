import { CityScoreResult, IndicatorDefinition, ConfidenceLevel } from "../../scoring/types";
import { escapeHtml } from "../../utils";
import { ReportRow } from "../../types";

export interface CityDetailModel {
  readonly result: CityScoreResult;
  readonly definition: ReadonlyArray<IndicatorDefinition>;
  readonly rawRow: ReportRow;
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

export function renderCityDetail(model: CityDetailModel): string {
  const { result, rawRow } = model;

  const indicatorRows = model.definition
    .map((def) => {
      const cs = result.choice.find((c) => c.indicatorId === def.id);
      const bs = result.baseline.find((b) => b.indicatorId === def.id);
      const raw = rawRow[def.id === "population_total" ? "total" : "ratio" as keyof ReportRow];
      const rawDisplay =
        typeof raw === "number"
          ? def.precision === 0
            ? numberFormat(raw)
            : raw.toFixed(def.precision)
          : "-";

      return `
        <tr>
          <td>${escapeHtml(def.label)}</td>
          <td class="num">${rawDisplay} ${escapeHtml(def.unit)}</td>
          <td class="num">${cs ? cs.score.toFixed(1) : "-"}</td>
          <td class="num">${bs ? `${bs.percentile.toFixed(1)}%` : "-"}</td>
        </tr>`;
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

      <h3 style="margin-top:12px;">注意事項</h3>
      <ul class="note" style="padding-left:16px;">
        ${notesList}
      </ul>
    </section>`;
}
