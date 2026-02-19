# TownLens

政府統計（e-Stat）・不動産情報ライブラリ API・災害データを統合し、市区町村の多角的比較スコアリング・PDFレポートを生成するツールです。CLI と Web アプリの両方を提供します。

## プロジェクト構成

pnpm workspaces + Turborepo によるモノレポ構成です。

```
packages/
  core/   — 共通ロジック（APIクライアント・スコアリングエンジン）
  cli/    — CLIツール（@townlens/cli）
  web/    — Webアプリ（Next.js 15）
```

## セットアップ

```bash
pnpm install
```

### CLI

```bash
pnpm run build
cd packages/cli && pnpm link --global   # townlens コマンドをグローバルに登録
npx playwright install chromium          # PDF生成に必要
```

```bash
townlens init
# .env に ESTAT_APP_ID を設定
# 不動産価格・災害リスクも使う場合は REINFOLIB_API_KEY も設定
```

> `townlens init` が生成する `townlens.config.json` にはデフォルトの統計表IDが設定済みです。通常は編集不要です。

### Web

```bash
cd packages/web
cp ../../.env.example .env.local
# .env.local に Supabase / Stripe の環境変数を設定
pnpm dev
```

## 環境変数

`.env.example` を参照してください。

| 変数 | 用途 | 必須 |
|------|------|------|
| `ESTAT_APP_ID` | e-Stat API | CLI / Web |
| `REINFOLIB_API_KEY` | 不動産情報ライブラリ API | 任意 |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase プロジェクトURL | Web |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 匿名キー | Web |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase サービスロールキー | Web |
| `STRIPE_SECRET_KEY` | Stripe シークレットキー | Web |
| `STRIPE_WEBHOOK_SECRET` | Stripe Webhook シークレット | Web |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe 公開キー | Web |
| `STRIPE_PRICE_STANDARD` | Standard プラン Price ID | Web |
| `STRIPE_PRICE_PREMIUM` | Premium プラン Price ID | Web |

## CLI コマンド

### report — 比較レポート生成

3つのモードで比較レポートをPDF出力します。

```bash
# 市区町村モード
townlens report --cities "新宿区,横浜市,大阪市"

# メッシュモード（1km 3次メッシュ）
townlens report --mesh "53394525,53394526"

# 駅圏モード
townlens report --stations "渋谷,新宿" --radius 1000

# インタラクティブモード（ウィザード形式で入力）
townlens report --interactive
```

デフォルトでスコア付きレポート（人口・犯罪統計・不動産価格・災害リスク）を生成します。
不動産価格・災害リスクデータには `REINFOLIB_API_KEY` が必要です（未設定時は警告付きでスキップ）。

### search — 統計表の検索

```bash
townlens search --keyword "人口"
```

### inspect — 統計表の診断

```bash
townlens inspect --statsDataId 0003448299
townlens inspect --statsDataId 0000032962 --json
```

### report の主要オプション

| オプション | 説明 |
|-----------|------|
| `--cities <list>` | 市区町村名をカンマ区切りで指定 |
| `--mesh <codes>` | メッシュコードをカンマ区切りで指定 |
| `--stations <list>` | 駅名をカンマ区切りで指定 |
| `--radius <meters>` | 駅圏の半径（デフォルト: 1000m） |
| `--interactive` | インタラクティブモードで実行 |
| `--out <path>` | PDF出力先 |
| `--preset <name>` | 重みプリセット（childcare/price/safety） |
| `--no-scored` | スコアなし基本レポート |
| `--no-price` | 不動産価格データなし |
| `--no-crime` | 犯罪統計データなし |
| `--no-disaster` | 災害リスクデータなし |
| `--year <YYYY>` | 不動産取引データの年 |
| `--quarter <1-4>` | 四半期 |
| `--property-type <type>` | 物件タイプ（condo/house/land/all） |
| `--budget-limit <万円>` | 予算上限（万円） |

全オプションの詳細は [packages/cli/README.md](packages/cli/README.md) を参照してください。

## Web アプリ

Next.js 15 / React 19 / Supabase / Stripe / Tailwind CSS 4 による Web アプリです。

- トップページ — 都市検索・レポート生成
- ダッシュボード — 生成済みレポート一覧
- レポート表示 — スコア・チャート付き詳細レポート
- 料金プラン — `/pricing` ページを参照

詳細は [packages/web/README.md](packages/web/README.md) を参照してください。

## 開発

```bash
# 全パッケージのビルド
pnpm run build

# CLI 開発実行
pnpm run dev -- report --cities "新宿区,渋谷区"

# Web 開発サーバー
cd packages/web && pnpm dev

# テスト
pnpm run test

# カバレッジ（80%必須）
pnpm run test:coverage
```

## ビルトインデータセット

| データ | 統計表ID | 出典 |
|--------|----------|------|
| 人口（年齢3区分） | `0003448299` | 国勢調査 令和2年 |
| 犯罪統計 | `0000020211` | 社会・人口統計体系 K安全 |

## profile によるカスタマイズ

`townlens.config.json` で独自の統計表IDやセレクタを定義できます。通常は変更不要です。

```json
{
  "defaultProfile": "population",
  "profiles": {
    "population": {
      "statsDataId": "0003448299",
      "selectors": {
        "classId": "cat01"
      }
    }
  }
}
```

`totalCode`/`kidsCode` は自動検出されるため、通常は `classId` のみで十分です。

## キャッシュ

- `getMetaInfo` の結果を `./.cache/estat/meta_<statsDataId>.json` に保存
- TTL は 7 日

## エラー時の挙動

以下は原因と次アクションを表示して終了します。

- `ESTAT_APP_ID` 未設定
- 市区町村名未解決/曖昧
- 年齢区分（総数/0〜14）未特定 — `inspect` コマンドで診断可能

## 前提/制限

- e-Stat の統計表によってメタ構造が異なるため、年齢区分の自動判定はヒューリスティックです。失敗時は `--classId/--totalCode/--kidsCode` で手動指定するか、`inspect` コマンドで診断してください。
- 市区町村名が重複する場合は曖昧エラーになります。都道府県を含む正式名称で指定してください。
