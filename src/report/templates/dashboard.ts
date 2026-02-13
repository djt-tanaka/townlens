import { CityScoreResult, IndicatorDefinition } from "../../scoring/types";
import { escapeHtml } from "../../utils";

export interface DashboardModel {
  readonly results: ReadonlyArray<CityScoreResult>;
  readonly definitions: ReadonlyArray<IndicatorDefinition>;
}

export function renderDashboard(model: DashboardModel): string {
  const cityNames = model.results.map((r) => r.cityName);

  // 指標ヘッダ
  const headerCells = cityNames
    .map((name) => `<th>${escapeHtml(name)}</th>`)
    .join("");

  // 指標ごとに行を生成（Choice Score）
  const choiceRows = model.definitions
    .map((def) => {
      const cells = model.results
        .map((r) => {
          const cs = r.choice.find((c) => c.indicatorId === def.id);
          if (!cs) {
            return `<td class="num" style="color:var(--sub)">-</td>`;
          }
          return `<td class="num">
            ${cs.score.toFixed(1)}
            <div class="score-bar" style="margin-top:2px"><div class="score-bar-fill" style="width:${cs.score}%"></div></div>
          </td>`;
        })
        .join("");

      return `<tr><td><strong>${escapeHtml(def.label)}</strong><br><span class="note">${escapeHtml(def.unit)}</span></td>${cells}</tr>`;
    })
    .join("\n");

  // Baseline パーセンタイル
  const baselineRows = model.definitions
    .map((def) => {
      const cells = model.results
        .map((r) => {
          const bs = r.baseline.find((b) => b.indicatorId === def.id);
          if (!bs) {
            return `<td class="num" style="color:var(--sub)">-</td>`;
          }
          return `<td class="num">${bs.percentile.toFixed(1)}%</td>`;
        })
        .join("");

      return `<tr><td>${escapeHtml(def.label)}</td>${cells}</tr>`;
    })
    .join("\n");

  return `
    <section class="page">
      <h2>指標ダッシュボード</h2>

      <h3>候補内比較スコア（Choice Score: 0-100）</h3>
      <table>
        <thead><tr><th>指標</th>${headerCells}</tr></thead>
        <tbody>${choiceRows}</tbody>
      </table>

      <h3 style="margin-top:16px;">候補内パーセンタイル（Baseline Score）</h3>
      <p class="note" style="margin-bottom:8px;">※ Phase 0 では候補セット内での相対パーセンタイルです。</p>
      <table>
        <thead><tr><th>指標</th>${headerCells}</tr></thead>
        <tbody>${baselineRows}</tbody>
      </table>
    </section>`;
}
