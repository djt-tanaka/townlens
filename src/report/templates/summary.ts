import { CityScoreResult, ConfidenceLevel } from "../../scoring/types";
import { escapeHtml } from "../../utils";

export interface SummaryModel {
  readonly results: ReadonlyArray<CityScoreResult>;
  readonly presetLabel: string;
}

function confidenceBadge(level: ConfidenceLevel): string {
  const labels: Record<ConfidenceLevel, string> = {
    high: "High",
    medium: "Medium",
    low: "Low",
  };
  return `<span class="badge badge-${level}">${labels[level]}</span>`;
}

export function renderSummary(model: SummaryModel): string {
  const sorted = [...model.results].sort((a, b) => a.rank - b.rank);

  const rankingRows = sorted
    .map(
      (r) => `
      <tr>
        <td class="num" style="width:8%">${r.rank}</td>
        <td style="width:25%">${escapeHtml(r.cityName)}</td>
        <td class="num" style="width:15%">${r.compositeScore.toFixed(1)}</td>
        <td style="width:22%">
          <div class="score-bar"><div class="score-bar-fill" style="width:${r.compositeScore}%"></div></div>
        </td>
        <td style="width:15%">${confidenceBadge(r.confidence.level)}</td>
        <td style="width:15%" class="note">${r.notes.length > 0 ? escapeHtml(r.notes[0]) : "-"}</td>
      </tr>`
    )
    .join("\n");

  return `
    <section class="page">
      <h2>結論サマリ</h2>
      <p class="meta">プリセット: ${escapeHtml(model.presetLabel)} / 候補内比較スコアに基づくランキング</p>

      <table>
        <thead>
          <tr>
            <th>順位</th>
            <th>市区町村</th>
            <th>総合スコア</th>
            <th>スコア分布</th>
            <th>信頼度</th>
            <th>注意</th>
          </tr>
        </thead>
        <tbody>
          ${rankingRows}
        </tbody>
      </table>

      <div class="note" style="margin-top:12px;">
        ※ 総合スコアは候補内での相対比較値（0-100）です。全国基準ではありません。<br>
        ※ 信頼度はデータの鮮度・欠損率に基づく参考値です。
      </div>
    </section>`;
}
