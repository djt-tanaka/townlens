# テスト

## テストフレームワーク

- **Vitest** (`vitest.config.ts` で設定)
- カバレッジプロバイダ: V8

## テスト実行

```bash
npm test                  # ウォッチモードで実行
npm run test:run          # 1回実行
npm run test:coverage     # カバレッジ測定付き
```

## カバレッジ要件

最低80%（statements / branches / functions / lines すべて）。

### カバレッジ除外ファイル

| ファイル | 除外理由 |
|---------|---------|
| `src/cli.ts` | CLIエントリポイント（E2E対象） |
| `src/estat/client.ts` | 外部APIクライアント |
| `src/estat/cache.ts` | ファイルI/O依存 |
| `src/report/pdf.ts` | Playwright依存 |
| `src/types.ts` | 型定義のみ |
| `src/scoring/types.ts` | 型定義のみ |
| `src/reinfo/types.ts` | 型定義のみ |

## テストファイル構成

```
tests/
├── errors.test.ts                    # CliError
├── utils.test.ts                     # ユーティリティ関数
├── config/
│   ├── config.test.ts                # 設定読み込み
│   └── datasets.test.ts             # データセットプリセット
├── estat/
│   ├── meta.test.ts                  # メタ情報解析
│   ├── report-data.test.ts           # レポートデータ構築
│   ├── crime-data.test.ts            # 犯罪統計処理
│   ├── inspect.test.ts              # 統計表診断
│   └── merge-crime-scoring.test.ts   # 犯罪指標マージ
├── reinfo/
│   ├── client.test.ts                # APIクライアント
│   ├── cache.test.ts                 # キャッシュ機構
│   ├── price-data.test.ts            # 価格統計
│   ├── stats.test.ts                 # フィルタリング・分位数
│   ├── city-locations.test.ts        # 座標マッピング
│   ├── disaster-client.test.ts       # タイルAPI
│   ├── disaster-data.test.ts         # 災害リスク判定
│   ├── merge-scoring.test.ts         # 価格指標マージ
│   └── merge-disaster-scoring.test.ts # 災害指標マージ
├── scoring/
│   ├── index.test.ts                 # scoreCities()
│   ├── normalize.test.ts             # Min-Max正規化
│   ├── percentile.test.ts            # パーセンタイル
│   ├── composite.test.ts             # 複合スコア
│   ├── confidence.test.ts            # 信頼度評価
│   └── presets.test.ts               # プリセット検証
└── report/
    ├── html.test.ts                  # 基本HTML生成
    └── templates.test.ts             # スコアリング版テンプレート
```
