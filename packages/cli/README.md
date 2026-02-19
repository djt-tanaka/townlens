# @townlens/cli

TownLens のコマンドラインツールです。市区町村・メッシュ・駅圏の比較レポートをPDFで出力します。

## セットアップ

```bash
pnpm install
pnpm run build
pnpm link --global          # townlens コマンドをグローバルに登録
npx playwright install chromium  # PDF生成に必要
```

```bash
townlens init
# .env に ESTAT_APP_ID を設定
# 不動産価格・災害リスクも使う場合は REINFOLIB_API_KEY も設定
```

## コマンド

### report — 比較レポート生成

3つのモードでレポートを生成します。`--cities`、`--mesh`、`--stations` のいずれか1つを指定してください。

#### 市区町村モード

```bash
townlens report --cities "新宿区,横浜市,大阪市"
townlens report --cities "新宿区,横浜市" --preset safety --out ./report.pdf
```

#### メッシュモード

```bash
townlens report --mesh "53394525,53394526"
townlens report --mesh "53394525,53394526" --mesh-stats-id <id>
```

#### 駅圏モード

```bash
townlens report --stations "渋谷,新宿"
townlens report --stations "渋谷,新宿" --radius 500
```

#### インタラクティブモード

```bash
townlens report --interactive
```

ウィザード形式でモード選択・対象入力・プリセット選択を対話的に行います。

### search — 統計表の検索

```bash
townlens search --keyword "人口"
```

### inspect — 統計表の診断

```bash
townlens inspect --statsDataId 0003448299
townlens inspect --statsDataId 0000032962 --json
```

### init — 設定ファイル生成

```bash
townlens init
```

`townlens.config.json` を生成します。デフォルトの統計表IDが設定済みのため、通常は編集不要です。

## report 全オプション

### モード選択（いずれか1つ必須）

| オプション | 説明 |
|-----------|------|
| `--cities <list>` | 市区町村名をカンマ区切り |
| `--mesh <codes>` | メッシュコードをカンマ区切り（8桁=3次メッシュ） |
| `--stations <list>` | 駅名をカンマ区切り |
| `--interactive` | インタラクティブモード |

### 出力・表示

| オプション | 説明 | デフォルト |
|-----------|------|-----------|
| `--out <path>` | PDF出力先 | `./townlens-report.pdf` |
| `--no-scored` | スコアなし基本レポート | スコアあり |
| `--preset <name>` | 重みプリセット（childcare/price/safety） | `childcare` |

### 駅圏モード

| オプション | 説明 | デフォルト |
|-----------|------|-----------|
| `--radius <meters>` | 駅圏の半径（メートル） | `1000` |

### 不動産データ

| オプション | 説明 | デフォルト |
|-----------|------|-----------|
| `--no-price` | 不動産価格データなし | 有効 |
| `--year <YYYY>` | 取引データの年 | 前年 |
| `--quarter <1-4>` | 四半期 | — |
| `--property-type <type>` | 物件タイプ（condo/house/land/all） | `condo` |
| `--budget-limit <万円>` | 予算上限（万円） | — |

### 統計データ

| オプション | 説明 |
|-----------|------|
| `--statsDataId <id>` | 統計表ID（省略時はビルトインデフォルト） |
| `--profile <name>` | profile名（townlens.config.json） |
| `--no-crime` | 犯罪統計データなし |
| `--crime-stats-id <id>` | 犯罪統計の統計表IDを上書き |
| `--no-disaster` | 災害リスクデータなし |
| `--mesh-stats-id <id>` | メッシュ統計の statsDataId |

### 年齢分類（手動指定）

| オプション | 説明 |
|-----------|------|
| `--classId <id>` | 年齢区分の分類ID（例: cat01） |
| `--totalCode <code>` | 総数の分類コード |
| `--kidsCode <code>` | 0〜14歳の分類コード |
| `--timeCode <code>` | 時間コード |

## ソース構成

```
src/
  commands/      — CLI コマンド定義（report, search, inspect, init）
  report/        — HTML テンプレート・PDF 変換
  interactive/   — インタラクティブモード（fuzzy search・プロンプト）
  mesh/          — メッシュデータ処理
  station/       — 駅圏データ・ジオコーディング
  geo/           — 地理情報リゾルバ
  cache/         — ファイルベースキャッシュ
  config/        — 設定ファイル読み込み
  estat/         — inspect コマンド用ロジック
```

## 開発コマンド

```bash
pnpm run dev -- report --cities "新宿区,渋谷区"   # tsx で直接実行
pnpm run build                                     # TypeScript コンパイル
pnpm run test                                      # テスト（watch モード）
pnpm run test:run                                  # テスト（1回実行）
pnpm run test:coverage                             # カバレッジ測定
```
