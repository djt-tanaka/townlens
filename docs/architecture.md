# アーキテクチャ

## ディレクトリ構成

```
src/
├── cli.ts                 # CLIエントリポイント（Commander.js）
├── types.ts               # 共通型定義（ReportRow）
├── errors.ts              # CliError カスタムエラー
├── utils.ts               # ユーティリティ関数
├── config/                # 設定管理
│   ├── config.ts          # estat.config.json の読み書き
│   └── datasets.ts        # ビルトインデータセットプリセット
├── estat/                 # e-Stat API 連携
│   ├── client.ts          # EstatApiClient（リトライ付きHTTP）
│   ├── cache.ts           # メタ情報キャッシュ（7日TTL）
│   ├── meta.ts            # メタ情報解析・都市名解決
│   ├── report-data.ts     # 統計データ → ReportRow 変換
│   ├── crime-data.ts      # 犯罪統計データ処理
│   ├── inspect.ts         # 統計表の自動診断
│   └── merge-crime-scoring.ts  # 犯罪指標マージ
├── reinfo/                # 不動産情報ライブラリ API 連携
│   ├── client.ts          # ReinfoApiClient（リトライ付き）
│   ├── cache.ts           # 取引データキャッシュ（7日TTL）
│   ├── types.ts           # API関連型定義
│   ├── price-data.ts      # 取引価格統計
│   ├── stats.ts           # フィルタリング・分位数計算
│   ├── city-locations.ts  # 市区町村代表座標
│   ├── disaster-client.ts # 災害タイルAPI（GeoJSON）
│   ├── disaster-data.ts   # 災害リスク判定
│   ├── merge-scoring.ts   # 価格指標マージ
│   └── merge-disaster-scoring.ts  # 災害指標マージ
├── scoring/               # スコアリングエンジン
│   ├── index.ts           # scoreCities() メイン関数
│   ├── types.ts           # スコアリング型定義
│   ├── presets.ts         # 重みプリセット・指標定義
│   ├── normalize.ts       # Min-Max正規化
│   ├── percentile.ts      # パーセンタイル計算
│   ├── composite.ts       # 複合スコア計算
│   └── confidence.ts      # 信頼度評価
└── report/                # レポート生成
    ├── html.ts            # 基本HTML生成
    ├── pdf.ts             # Playwright HTML→PDF変換
    └── templates/         # スコアリング版テンプレート
        ├── compose.ts     # レポート全体組成
        ├── cover.ts       # カバーページ
        ├── summary.ts     # ランキングサマリー
        ├── dashboard.ts   # 指標ダッシュボード
        ├── city-detail.ts # 都市詳細ページ
        ├── disclaimer.ts  # 免責事項
        └── styles.ts      # CSS定義
```

## モジュール構成

| モジュール | 責務 |
|-----------|------|
| `config` | 設定ファイルの読み書き、データセットプリセット管理 |
| `estat` | e-Stat API との通信、メタ情報解析、人口・犯罪データ取得 |
| `reinfo` | 不動産情報ライブラリ API との通信、価格統計・災害リスク取得 |
| `scoring` | 多指標の正規化・パーセンタイル・複合スコア・信頼度評価 |
| `report` | HTMLテンプレート描画、Playwright でのPDF変換 |

## データフロー

```
CLI入力（--cities "世田谷区,渋谷区"）
    │
    ▼
[Phase 0] 人口統計 ─── e-Stat API (statsDataId: 0003448299)
    │  → 総人口・0-14歳人口・比率 → CityIndicators[]
    │
    ▼
[Phase 1] 不動産価格 ─── 不動産情報ライブラリ API (XIT001)
    │  → 取引価格中央値・Q25/Q75・予算内割合
    │  → mergePriceIntoScoringInput()
    │
    ▼
[Phase 2a] 犯罪統計 ─── e-Stat API (statsDataId: 0000020211)
    │  → 刑法犯認知件数（千人当たり）
    │  → mergeCrimeIntoScoringInput()
    │
    ▼
[Phase 2b] 災害リスク ─── 不動産情報ライブラリ API (GeoJSON タイル)
    │  → 洪水・土砂災害・避難場所
    │  → mergeDisasterIntoScoringInput()
    │
    ▼
[スコアリング] ─── scoring/index.ts
    │  → Choice Score（候補内正規化）
    │  → Baseline Score（パーセンタイル）
    │  → Composite Score（重み付き総合スコア）
    │
    ▼
[レポート生成] ─── report/templates/ → report/pdf.ts
    │  → HTML組成（カバー/サマリー/ダッシュボード/詳細/免責）
    │  → Playwright Chromium で A4 PDF出力
    │
    ▼
  出力ファイル（.pdf）
```

## 設計原則

- **不変性**: 全型定義に `readonly`、データマージはスプレッド演算子で新規オブジェクト生成
- **段階的統合**: 各Phase（人口→価格→犯罪→災害）は独立したオプション。`--no-price`, `--no-crime`, `--no-disaster` で個別にスキップ可能
- **キャッシュ戦略**: メタ情報・取引データを `.cache/` にファイルベースで7日間保持
- **レート制限対策**: 都市間200ms、タイル間300msのディレイ。APIリトライは指数バックオフ（最大3回）
