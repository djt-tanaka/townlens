# レポートテンプレート

## HTML → PDF 変換

**ファイル**: `src/report/pdf.ts`

Playwright の Chromium を使用して HTML を A4 PDF に変換。

| 設定 | 値 |
|------|-----|
| フォーマット | A4 |
| マージン（上下） | 14mm |
| マージン（左右） | 10mm |
| 背景色印刷 | 有効 |

前提条件: `npx playwright install chromium` の実行が必要。

## テンプレート構成

**ディレクトリ**: `src/report/templates/`

スコアリング版レポートの組成は `compose.ts` の `renderScoredReportHtml()` が担当。

```
renderScoredReportHtml()
├── renderCover()        — カバーページ（タイトル・生成日時・対象都市・設定情報）
├── renderSummary()      — サマリー（総合スコアランキング表）
├── renderDashboard()    — ダッシュボード（指標別スコア詳細テーブル）
├── renderCityDetail()   — 都市詳細（各都市の個別ページ × N）
└── renderDisclaimer()   — 免責事項（データ出典・注意事項）
```

基本（非スコアリング）版は `src/report/html.ts` の `renderReportHtml()` で生成。

## スタイル定義

**ファイル**: `src/report/templates/styles.ts`

### カラー変数

| 変数 | 値 | 用途 |
|------|-----|------|
| `--bg` | `#f8fafc` | 背景色 |
| `--card` | `#ffffff` | カード背景 |
| `--text` | `#0f172a` | テキスト色 |
| `--sub` | `#334155` | サブテキスト色 |
| `--line` | `#cbd5e1` | 罫線色 |
| `--head` | `#e2e8f0` | テーブルヘッダ背景 |
| `--accent` | `#1e3a8a` | アクセント色（青） |
| `--accent-light` | `#dbeafe` | アクセント淡色 |
| `--success` | `#16a34a` | 成功色（緑） |
| `--warning` | `#d97706` | 警告色（オレンジ） |
| `--danger` | `#dc2626` | 危険色（赤） |

### フォント・レイアウト

- フォントファミリー: `Noto Sans JP`, `Hiragino Sans`, `Yu Gothic`, sans-serif
- 基本フォントサイズ: 12px
- テーブルフォントサイズ: 11px（ヘッダ: 10px）
- 行間: 1.6
- ページ区切り: `.page` クラスに `page-break-after: always`

### 信頼度バッジ

| クラス | 背景色 | テキスト色 |
|--------|--------|-----------|
| `.badge-high` | `#dcfce7` | `#166534` |
| `.badge-medium` | `#fef3c7` | `#92400e` |
| `.badge-low` | `#fee2e2` | `#991b1b` |
