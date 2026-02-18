# TownLens

政府統計（e-Stat）・不動産情報ライブラリ API・災害データを統合し、市区町村の多角的比較スコアリング・PDFレポートを生成する CLI ツールです。

## セットアップ

```bash
npm install
npx playwright install chromium
npm run build
npm link          # townlens コマンドをグローバルに登録
```

```bash
townlens init
# .env または環境変数で ESTAT_APP_ID を設定
# 不動産価格・災害リスクデータも使う場合は REINFOLIB_API_KEY も設定
```

> `townlens init` が生成する `townlens.config.json` にはデフォルトの統計表IDが設定済みです。通常は編集不要です。

## コマンド

### report — 比較レポート生成

```bash
townlens report --cities "新宿区,横浜市,大阪市"
townlens report --cities "新宿区,横浜市,大阪市" --out ./out/report.pdf
townlens report --cities "新宿区,横浜市,大阪市" --no-scored  # スコアなし基本レポート
```

デフォルトでスコア付きレポート（人口・犯罪統計・不動産価格・災害リスク）を生成します。
人口データ・犯罪統計のデータセットはビルトインで定義済みのため、`--statsDataId` の指定は不要です。
不動産価格・災害リスクデータには `REINFOLIB_API_KEY` が必要です（未設定時は警告付きでスキップ）。

### search — 統計表の検索

```bash
townlens search --keyword "人口"
```

### inspect — 統計表の診断

任意の統計表IDが自動検出に対応しているか診断します。

```bash
townlens inspect --statsDataId 0003448299
townlens inspect --statsDataId 0000032962 --json
```

`npm link` を使わない場合は `npx` 経由でも実行できます。

```bash
npx townlens report --cities "新宿区,横浜市,大阪市"

# 開発中は tsx で直接実行も可能
npm run dev -- report --cities "新宿区,横浜市,大阪市"
```

### report オプション

- `--cities "市区町村,市区町村,..."` (必須)
- `--statsDataId <ID>` (省略時はビルトインデフォルトを使用)
- `--profile <name>` (`townlens.config.json` の profile)
- `--out <path>`
- `--no-scored` (スコアなし基本レポートで生成)
- `--no-price` (不動産価格データなしで実行)
- `--no-crime` (犯罪統計データなしで実行)
- `--no-disaster` (災害リスクデータなしで実行)
- `--classId <id>` / `--totalCode <code>` / `--kidsCode <code>` (年齢分類を手動指定)
- `--timeCode <code>` (時間軸を手動指定)
- `--crimeStatsId <ID>` (犯罪統計の統計表IDを上書き)

## ビルトインデータセット

以下のデータセットがデフォルトで使用されます。

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
