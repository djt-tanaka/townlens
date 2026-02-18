# アーキテクチャ

## パッケージ構成

CLI は `@townlens/cli` パッケージとして `packages/cli/` に配置される。
ビジネスロジック・型定義・スコアリングエンジンは `@townlens/core` に分離されており、CLI はそれを利用する薄いアダプタ層。

```
packages/cli/
├── src/
│   ├── cli.ts                 # CLIエントリポイント（Commander.js）
│   ├── utils.ts               # FS依存ユーティリティ（ensureDir, resolveOutPath）
│   ├── cache/
│   │   └── file-cache.ts      # FileCacheAdapter（CacheAdapter実装、7日TTL）
│   ├── config/
│   │   └── config.ts          # estat.config.json の読み書き
│   ├── estat/
│   │   └── inspect.ts         # 統計表の自動診断
│   ├── geo/                   # 地理座標・メッシュ解決
│   │   ├── resolver.ts        # GeoResolver
│   │   └── types.ts           # 座標型定義
│   ├── interactive/           # 対話式UI
│   │   ├── prompts.ts         # inquirer プロンプト
│   │   └── fuzzy-search.ts    # あいまい検索
│   ├── mesh/                  # 地域メッシュ
│   │   ├── types.ts           # メッシュ型定義
│   │   ├── geometry.ts        # メッシュ幾何計算
│   │   ├── lookup.ts          # メッシュ検索
│   │   └── utils.ts           # メッシュユーティリティ
│   ├── report/                # レポート生成
│   │   ├── html.ts            # 基本HTML生成
│   │   ├── pdf.ts             # Playwright HTML→PDF変換
│   │   └── templates/         # スコアリング版テンプレート
│   │       ├── compose.ts     # レポート全体組成
│   │       ├── cover.ts       # カバーページ
│   │       ├── summary.ts     # ランキングサマリー
│   │       ├── dashboard.ts   # 指標ダッシュボード
│   │       ├── city-detail.ts # 都市詳細ページ
│   │       ├── disclaimer.ts  # 免責事項
│   │       └── styles.ts      # CSS定義
│   └── station/               # 駅・エリア情報
│       ├── area-builder.ts    # エリア情報組成
│       ├── loader.ts          # 駅データ読み込み
│       └── types.ts           # 駅型定義
└── tests/                     # テスト（134テスト）
    ├── config/
    ├── estat/
    ├── geo/
    ├── interactive/
    ├── mesh/
    ├── report/
    └── station/
```

## @townlens/core との分担

| パッケージ | 責務 |
|-----------|------|
| `@townlens/core` | 型定義、スコアリングエンジン、API クライアント、正規化、ナラティブ生成、チャートカラー |
| `@townlens/cli` | CLI エントリポイント、ファイルI/O、PDF生成、対話式UI、設定管理、キャッシュ永続化 |

### CLI 固有モジュール

| モジュール | 責務 |
|-----------|------|
| `cache` | `FileCacheAdapter` — `CacheAdapter` インターフェースのファイルシステム実装 |
| `config` | 設定ファイルの読み書き（`@townlens/core` のデータセットプリセットを利用） |
| `estat` | `inspect` コマンド（統計表の自動診断） |
| `geo` | 座標解決・メッシュ変換 |
| `interactive` | inquirer ベースの対話式都市選択 |
| `mesh` | 地域メッシュコード処理 |
| `report` | HTMLテンプレート描画、Playwright でのPDF変換 |
| `station` | 駅・エリア情報の読み込みと組成 |

## データフロー

```
CLI入力（--cities "世田谷区,渋谷区"）
    │
    ▼
[初期化] FileCacheAdapter 生成 → EstatApiClient / ReinfoApiClient に注入
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
[スコアリング] ─── @townlens/core scoring
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
- **キャッシュDI**: `CacheAdapter` インターフェースを `@townlens/core` で定義し、CLI は `FileCacheAdapter`（ファイルベース、7日TTL、envelope方式）で実装。Web側は別のアダプタを注入可能
- **レート制限対策**: 都市間200ms、タイル間300msのディレイ。APIリトライは指数バックオフ（最大3回）
- **core依存**: ビジネスロジックは全て `@townlens/core` からインポート。CLI は I/O と UI のみ担当
