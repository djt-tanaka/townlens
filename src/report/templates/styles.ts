/** 共通CSS変数とスタイル定義 */
export function baseStyles(): string {
  return `
    :root {
      --bg: #f8fafc;
      --card: #ffffff;
      --text: #0f172a;
      --sub: #334155;
      --line: #cbd5e1;
      --head: #e2e8f0;
      --accent: #1e3a8a;
      --accent-light: #dbeafe;
      --success: #16a34a;
      --warning: #d97706;
      --danger: #dc2626;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      color: var(--text);
      background: #ffffff;
      font-family: "Noto Sans JP", "Hiragino Sans", "Yu Gothic", sans-serif;
      font-size: 12px;
      line-height: 1.6;
    }
    .page {
      padding: 24px 28px;
      page-break-after: always;
      min-height: calc(100vh - 48px);
    }
    .page:last-child {
      page-break-after: auto;
    }
    h1 { font-size: 24px; color: var(--accent); margin-bottom: 16px; }
    h2 { font-size: 18px; color: var(--accent); margin-bottom: 12px; }
    h3 { font-size: 14px; color: var(--text); margin-bottom: 8px; }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
      margin-bottom: 12px;
    }
    th {
      background: var(--head);
      border: 1px solid var(--line);
      padding: 6px 8px;
      text-align: left;
      font-size: 10px;
    }
    td {
      border: 1px solid var(--line);
      padding: 6px 8px;
    }
    td.num { text-align: right; font-variant-numeric: tabular-nums; }
    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: bold;
    }
    .badge-high { background: #dcfce7; color: #166534; }
    .badge-medium { background: #fef3c7; color: #92400e; }
    .badge-low { background: #fee2e2; color: #991b1b; }
    .score-bar {
      height: 8px;
      border-radius: 4px;
      background: var(--accent-light);
    }
    .score-bar-fill {
      height: 100%;
      border-radius: 4px;
      background: var(--accent);
    }
    .meta { color: var(--sub); font-size: 11px; margin-bottom: 12px; }
    .note { color: var(--sub); font-size: 10px; line-height: 1.5; }
  `;
}
