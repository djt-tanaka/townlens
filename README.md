# estat-city-report

e-Stat API から市区町村別の人口データを取得し、比較PDFを出力する CLI ツールです。

## セットアップ

```bash
npm install
npx playwright install chromium
npm run build
```

```bash
estat-report init
# estat.config.json を編集して statsDataId を設定
# .env または環境変数で ESTAT_APP_ID を設定
```

## コマンド

```bash
estat-report init
estat-report search --keyword "人口"
estat-report report --cities "新宿区,横浜市,大阪市" --statsDataId 0003000001 --out ./out/report.pdf
```

### report オプション

- `--cities "市区町村,市区町村,..."` (必須)
- `--statsDataId <ID>`
- `--profile <name>` (`estat.config.json` の profile)
- `--out <path>`
- `--classId <id>` / `--totalCode <code>` / `--kidsCode <code>` (年齢分類を手動指定)
- `--timeCode <code>` (時間軸を手動指定)

## profile 例

```json
{
  "defaultProfile": "population",
  "profiles": {
    "population": {
      "statsDataId": "0003000001",
      "selectors": {
        "classId": "cat01",
        "totalCode": "000",
        "kidsCode": "001"
      }
    }
  }
}
```

## キャッシュ

- `getMetaInfo` の結果を `./.cache/estat/meta_<statsDataId>.json` に保存
- TTL は 7 日

## エラー時の挙動

以下は原因と次アクションを表示して終了します。

- `ESTAT_APP_ID` 未設定
- `statsDataId` 未指定
- 市区町村名未解決/曖昧
- 年齢区分（総数/0〜14）未特定

## 前提/制限

- `docs/estat_mvp_spec.md` がワークツリーに存在しなかったため、実装はタスク指示の要件を仕様として反映。
- e-Stat の統計表によってメタ構造が異なるため、年齢区分の自動判定はヒューリスティックです。失敗時は `--classId/--totalCode/--kidsCode` で手動指定してください。
- 市区町村名が重複する場合は曖昧エラーになります。都道府県を含む正式名称で指定してください。
