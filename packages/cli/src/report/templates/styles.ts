/** 共通CSS変数とスタイル定義（子育て世帯向けカラフルデザイン） */
export function baseStyles(): string {
  return `
    :root {
      --bg: #f8fafc;
      --card: #ffffff;
      --text: #1e293b;
      --sub: #64748b;
      --line: #e2e8f0;
      --head: #f1f5f9;
      --accent: #10b981;
      --accent-light: #d1fae5;

      --cat-childcare: #10b981;
      --cat-childcare-light: #d1fae5;
      --cat-price: #0ea5e9;
      --cat-price-light: #e0f2fe;
      --cat-safety: #f43f5e;
      --cat-safety-light: #ffe4e6;
      --cat-disaster: #8b5cf6;
      --cat-disaster-light: #ede9fe;
      --cat-transport: #f59e0b;
      --cat-transport-light: #fef3c7;

      --success: #16a34a;
      --warning: #d97706;
      --danger: #dc2626;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      color: var(--text);
      background: var(--bg);
      font-family: "Noto Sans JP", "Hiragino Sans", "Yu Gothic", sans-serif;
      font-size: 13px;
      line-height: 1.7;
    }
    .page {
      padding: 28px 28px;
      page-break-after: always;
      min-height: calc(100vh - 56px);
    }
    .page:last-child {
      page-break-after: auto;
    }
    h1 { font-size: 36px; font-weight: 800; color: var(--text); margin-bottom: 20px; letter-spacing: -0.02em; }
    h2 { font-size: 24px; font-weight: 700; color: var(--text); margin-bottom: 16px; letter-spacing: -0.01em; }
    h3 { font-size: 16px; font-weight: 600; color: var(--text); margin-bottom: 10px; }
    table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      font-size: 12px;
      margin-bottom: 16px;
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid var(--line);
    }
    th {
      background: var(--head);
      padding: 8px 10px;
      text-align: left;
      font-size: 11px;
      font-weight: 600;
      color: var(--sub);
      border-bottom: 1px solid var(--line);
    }
    td {
      padding: 8px 10px;
      border-bottom: 1px solid var(--line);
    }
    tr:last-child td { border-bottom: none; }
    td.num { text-align: right; font-variant-numeric: tabular-nums; }
    .badge {
      display: inline-block;
      padding: 3px 10px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
    }
    .badge-high { background: #dcfce7; color: #166534; }
    .badge-medium { background: #fef3c7; color: #92400e; }
    .badge-low { background: #fee2e2; color: #991b1b; }
    .category-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 12px;
      border-radius: 16px;
      font-size: 12px;
      font-weight: 600;
    }
    .score-card {
      background: var(--card);
      border-radius: 12px;
      padding: 16px 20px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
      margin-bottom: 12px;
    }
    .ranking-card {
      background: var(--card);
      border-radius: 12px;
      padding: 16px 20px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
    }
    .chart-container {
      display: flex;
      justify-content: center;
      margin: 16px 0;
    }
    .score-bar {
      height: 10px;
      border-radius: 5px;
      background: var(--line);
    }
    .score-bar-fill {
      height: 100%;
      border-radius: 5px;
      background: var(--accent);
      transition: width 0.3s;
    }
    .meta { color: var(--sub); font-size: 13px; margin-bottom: 16px; line-height: 1.8; }
    .note { color: var(--sub); font-size: 11px; line-height: 1.6; }
    .narrative {
      background: var(--accent-light);
      border-left: 4px solid var(--accent);
      padding: 16px 20px;
      margin: 16px 0;
      border-radius: 0 12px 12px 0;
    }
    .narrative h3 {
      font-size: 14px;
      color: var(--accent);
      margin-bottom: 8px;
    }
    .narrative p {
      font-size: 13px;
      line-height: 1.8;
      color: var(--text);
    }
    .category-section {
      margin-bottom: 20px;
      page-break-inside: avoid;
    }
    .category-header {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 16px;
      border-radius: 10px;
      margin-bottom: 12px;
      font-weight: 700;
      font-size: 15px;
    }
    .indicator-card {
      background: var(--card);
      border-radius: 10px;
      padding: 14px 18px;
      margin-bottom: 10px;
      box-shadow: 0 1px 2px rgba(0,0,0,0.04);
    }
    svg text {
      font-family: "Noto Sans JP", "Hiragino Sans", "Yu Gothic", sans-serif;
    }
  `;
}
