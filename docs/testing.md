# テスト

## テストフレームワーク

- **Vitest** (各パッケージの `vitest.config.ts` で設定)
- カバレッジプロバイダ: V8

## テスト実行

```bash
pnpm test                  # 全パッケージのテストをウォッチモードで実行
pnpm test:run              # 全パッケージのテストを1回実行
pnpm test:coverage         # 全パッケージのカバレッジ測定

# 個別パッケージ
pnpm --filter @townlens/core test:run
pnpm --filter @townlens/cli test:run
```

## カバレッジ要件

最低80%（statements / branches / functions / lines すべて）。

### カバレッジ除外ファイル

| ファイル | 除外理由 |
|---------|---------|
| `packages/cli/src/cli.ts` | CLIエントリポイント（E2E対象） |
| `packages/core/src/estat/client.ts` | 外部APIクライアント |
| `packages/core/src/cache.ts` | ファイルI/O依存 |
| `packages/cli/src/report/pdf.ts` | Playwright依存 |
| `packages/core/src/types.ts` | 型定義のみ |
| `packages/core/src/scoring/types.ts` | 型定義のみ |
| `packages/core/src/reinfo/types.ts` | 型定義のみ |

## テストファイル構成

```
packages/core/tests/
├── errors.test.ts                           # CliError
├── utils.test.ts                            # ユーティリティ関数
├── charts/
│   └── colors.test.ts                       # チャートカラー
├── config/
│   └── datasets.test.ts                     # データセットプリセット
├── estat/
│   ├── client.test.ts                       # APIクライアント
│   ├── meta.test.ts                         # メタ情報解析
│   ├── report-data.test.ts                  # レポートデータ構築
│   ├── crime-data.test.ts                   # 犯罪統計処理
│   ├── education-data.test.ts               # 教育統計処理
│   ├── healthcare-data.test.ts              # 医療統計処理
│   ├── transport-data.test.ts               # 交通統計処理
│   ├── merge-crime-scoring.test.ts          # 犯罪指標マージ
│   ├── merge-education-scoring.test.ts      # 教育指標マージ
│   ├── merge-healthcare-scoring.test.ts     # 医療指標マージ
│   ├── merge-transport-scoring.test.ts      # 交通指標マージ
│   └── ward-reorganization.test.ts          # 区再編対応
├── narrative/
│   └── narrative.test.ts                    # ナラティブ生成
├── normalize/
│   └── ...                                  # 名称正規化
├── pipeline/
│   └── report-pipeline.test.ts              # レポートパイプライン
├── reinfo/
│   ├── client.test.ts                       # APIクライアント
│   ├── cache.test.ts                        # キャッシュ機構
│   ├── price-data.test.ts                   # 価格統計
│   ├── stats.test.ts                        # フィルタリング・分位数
│   ├── city-locations.test.ts               # 座標マッピング
│   ├── disaster-client.test.ts              # タイルAPI
│   ├── disaster-data.test.ts                # 災害リスク判定
│   ├── merge-scoring.test.ts                # 価格指標マージ
│   └── merge-disaster-scoring.test.ts       # 災害指標マージ
├── scoring/
│   ├── index.test.ts                        # scoreCities()
│   ├── normalize.test.ts                    # Min-Max正規化
│   ├── percentile.test.ts                   # パーセンタイル
│   ├── composite.test.ts                    # 複合スコア
│   ├── confidence.test.ts                   # 信頼度評価
│   ├── presets.test.ts                      # プリセット検証
│   ├── single-city.test.ts                  # 単一都市スコアリング
│   ├── star-rating.test.ts                  # 星評価変換
│   ├── national-baseline.test.ts            # 全国ベースライン
│   └── merge-indicators.test.ts             # 指標マージ
└── station/
    └── ...                                  # 駅データ処理

packages/cli/tests/
├── utils.test.ts                            # CLIユーティリティ
├── cache/
│   └── ...                                  # ファイルキャッシュ
├── config/
│   └── ...                                  # CLI設定
├── estat/
│   └── ...                                  # CLI固有のestat処理
├── geo/
│   └── ...                                  # 地理情報解決
├── interactive/
│   └── ...                                  # ファジー検索・プロンプト
├── mesh/
│   └── ...                                  # メッシュ分析
├── report/
│   ├── html.test.ts                         # 基本HTML生成
│   └── templates.test.ts                    # スコアリング版テンプレート
└── station/
    └── ...                                  # 駅圏分析
```
