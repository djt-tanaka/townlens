import { escapeHtml } from "../utils";

export interface ReportRow {
  cityInput: string;
  cityResolved: string;
  areaCode: string;
  total: number;
  kids: number;
  ratio: number;
  totalRank: number;
  ratioRank: number;
}

export interface ReportModel {
  title: string;
  generatedAt: string;
  statsDataId: string;
  timeLabel: string;
  totalLabel: string;
  kidsLabel: string;
  classInfo: string;
  rows: ReportRow[];
}

function numberFormat(value: number): string {
  return new Intl.NumberFormat("ja-JP").format(value);
}

export function renderReportHtml(model: ReportModel): string {
  const rowsHtml = model.rows
    .map((row, index) => {
      const ratioText = `${row.ratio.toFixed(2)}%`;
      return `
      <tr>
        <td>${index + 1}</td>
        <td>${escapeHtml(row.cityInput)}</td>
        <td>${escapeHtml(row.cityResolved)}</td>
        <td>${escapeHtml(row.areaCode)}</td>
        <td class="num">${numberFormat(row.total)}</td>
        <td class="num">${row.totalRank}</td>
        <td class="num">${numberFormat(row.kids)}</td>
        <td class="num">${ratioText}</td>
        <td class="num">${row.ratioRank}</td>
      </tr>`;
    })
    .join("\n");

  const citiesList = model.rows.map((r) => escapeHtml(r.cityInput)).join("、");

  return `<!doctype html>
<html lang="ja">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(model.title)}</title>
    <style>
      :root {
        --bg: #f8fafc;
        --card: #ffffff;
        --text: #0f172a;
        --sub: #334155;
        --line: #cbd5e1;
        --head: #e2e8f0;
        --accent: #1e3a8a;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        padding: 20px;
        color: var(--text);
        background: linear-gradient(150deg, #f8fafc 0%, #eff6ff 100%);
        font-family: "Noto Sans JP", "Hiragino Sans", "Yu Gothic", sans-serif;
      }
      .cover {
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        min-height: calc(100vh - 40px);
        text-align: center;
        page-break-after: always;
      }
      .cover h1 {
        font-size: 28px;
        color: var(--accent);
        margin-bottom: 24px;
      }
      .cover .cover-meta {
        color: var(--sub);
        font-size: 14px;
        line-height: 2;
      }
      .report {
        background: var(--card);
        border: 1px solid var(--line);
        border-radius: 12px;
        padding: 20px;
      }
      h2 {
        margin: 0 0 6px;
        font-size: 20px;
        color: var(--accent);
      }
      .meta {
        margin-bottom: 16px;
        color: var(--sub);
        font-size: 12px;
        line-height: 1.6;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        table-layout: fixed;
        font-size: 12px;
      }
      thead th {
        background: var(--head);
        border: 1px solid var(--line);
        padding: 8px;
        font-size: 11px;
      }
      td {
        border: 1px solid var(--line);
        padding: 8px;
      }
      td.num {
        text-align: right;
      }
      .footnote {
        margin-top: 12px;
        font-size: 11px;
        color: var(--sub);
        line-height: 1.6;
      }
    </style>
  </head>
  <body>
    <section class="cover">
      <h1>${escapeHtml(model.title)}</h1>
      <div class="cover-meta">
        生成日時: ${escapeHtml(model.generatedAt)}<br />
        対象市区町村: ${citiesList}<br />
        statsDataId: ${escapeHtml(model.statsDataId)}<br />
        時点: ${escapeHtml(model.timeLabel)}
      </div>
    </section>

    <section class="report">
      <h2>比較結果</h2>
      <div class="meta">
        指標: ${escapeHtml(model.totalLabel)} / ${escapeHtml(model.kidsLabel)} / 0〜14歳比率
      </div>
      <table>
        <thead>
          <tr>
            <th style="width: 4%">No</th>
            <th style="width: 13%">入力名</th>
            <th style="width: 13%">解決名</th>
            <th style="width: 9%">cdArea</th>
            <th style="width: 14%">人口（総数）</th>
            <th style="width: 7%">人口順位</th>
            <th style="width: 14%">0〜14歳人口</th>
            <th style="width: 13%">0〜14歳比率</th>
            <th style="width: 7%">比率順位</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
      <div class="footnote">
        出典: e-Stat API getStatsData<br />
        statsDataId: ${escapeHtml(model.statsDataId)}<br />
        時点コード: ${escapeHtml(model.timeLabel)}<br />
        使用分類: ${escapeHtml(model.classInfo)}<br />
        本レポートはCLIによる自動生成です。
      </div>
    </section>
  </body>
</html>`;
}
