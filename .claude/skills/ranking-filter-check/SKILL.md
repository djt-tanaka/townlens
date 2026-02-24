---
name: ranking-filter-check
description: >
  This skill should be used when the user asks to
  "ランキングのフィルターを確認", "除外ルールを検証",
  "ランキングに不適切な自治体がないかチェック", "ranking filter check",
  or when modifying ranking-data.ts, generate-rankings.ts,
  or area.ts filter functions.
  Verifies the 7-layer ranking filter consistency across SQL, application, and quality layers.
---

# ランキング除外ルール検証

TownLens のランキングに不適切な自治体（都道府県、政令指定都市の親コード、東京都特別区部等）が含まれていないか、7層フィルターの一貫性を自動検証する。

## 検証対象ファイル

以下のファイルを全て読み取ること:

1. `packages/core/src/estat/meta/area.ts` — フィルター関数定義元
2. `packages/web/src/lib/ranking-data.ts` — 読み取り側フィルター
3. `packages/web/scripts/generate-rankings.ts` — 書き込み側フィルター
4. `packages/core/tests/estat/meta.test.ts` — area.ts のテスト
5. `packages/web/tests/lib/ranking-data.test.ts` — 読み取り側テスト

## 検証手順

### Step 1: フィルター関数の列挙

`area.ts` を読み取り、エクスポートされている全フィルター関数を列挙する:

- `isMunicipalityCode(code)` — 市区町村レベル判定（3〜5桁目が "000" でない）
- `isDesignatedCityCode(code)` — 政令指定都市の親コード判定
- `isTokyoSpecialWardCode(code)` — 東京都特別区部(13100)判定
- `isAggregateAreaCode(code)` — 統合判定（政令指定都市 OR 特別区部）

各関数の判定ロジック（5桁/6桁対応、slice位置）を確認する。

### Step 2: DESIGNATED_CITY_CODES 完全性チェック

`area.ts` の `DESIGNATED_CITY_CODES` セットの要素数を数え、20市であるか確認する。
期待されるコード一覧は `references/filter-layers.md` を参照。

過不足がある場合は警告を出す。

### Step 3: SQL層フィルターの検証

`ranking-data.ts` の `fetchRankingByPresetInternal` 関数を読み取り:

- `.not("area_code", "like", "__000%")` で都道府県コード(XX000)を除外しているか
- `isAggregateAreaCode` で政令指定都市の親コード + 特別区部を除外しているか
- 全国コード(00000) が `__000%` パターンでカバーされるか

### Step 4: バッチ生成側フィルターの検証

`generate-rankings.ts` を読み取り:

- 抽出フィルターの3重チェックが適用されているか:
  - `isMunicipalityCode(code)` — コード判定
  - `isPrefectureName(name)` — 名前ベース判定
  - `!isAggregateAreaCode(code)` — 集約コード判定
- 品質フィルターの閾値を確認:
  - `MIN_REQUIRED_INDICATORS` (期待値: 8)
  - `MIN_REQUIRED_CATEGORIES` (期待値: 4)

### Step 5: 一貫性チェック

書き込み側（generate-rankings.ts）と読み取り側（ranking-data.ts）を突合:

- 書き込み側で除外済みのコードが、読み取り側でも再チェックされているか（冗長性は安全策として許容）
- 書き込み側では除外しているが読み取り側ではカバーされていない穴がないか
- 逆に、読み取り側でしかカバーされていないフィルターがないか

### Step 6: テストカバレッジの確認

- `meta.test.ts` で以下のテストケースが存在するか:
  - `isMunicipalityCode` の正常・異常系
  - `isDesignatedCityCode` の20市テスト
  - `isTokyoSpecialWardCode` のテスト
  - `isAggregateAreaCode` の合成テスト
  - 5桁/6桁コード両対応のテスト
- `ranking-data.test.ts` で政令指定都市除外テストがあるか

### Step 7: レポート出力

以下の形式で結果を報告する:

```markdown
## ランキング除外ルール検証レポート

### フィルター一覧
| # | フィルター層 | 対象 | 適用箇所 | ステータス |
|---|------------|------|---------|----------|
| 1 | コード判定 | 全国(00000) | area.ts / generate-rankings.ts | OK/NG |
| 2 | コード判定 | 都道府県(XX000) | area.ts / ranking-data.ts | OK/NG |
| 3 | 集約判定 | 政令指定都市親(20市) | area.ts / ranking-data.ts / generate-rankings.ts | OK/NG |
| 4 | 集約判定 | 特別区部(13100) | area.ts / ranking-data.ts / generate-rankings.ts | OK/NG |
| 5 | 名前判定 | 都道府県名 | generate-rankings.ts | OK/NG |
| 6 | 品質 | 最低指標数(8/13) | generate-rankings.ts | OK/NG |
| 7 | 品質 | カテゴリ多様性(4/7) | generate-rankings.ts | OK/NG |

### DESIGNATED_CITY_CODES 完全性
- 件数: XX/20
- 過不足: なし / [具体的な不足]

### 一貫性チェック
- SQL層 ↔ アプリ層: OK/NG [詳細]
- 書き込み側 ↔ 読み取り側: OK/NG [詳細]

### テストカバレッジ
- meta.test.ts: XX ケース
- ranking-data.test.ts: XX ケース

### 発見された問題
1. [問題の説明と影響範囲]

### 推奨アクション
1. [改善提案]
```

## 参考リソース

### リファレンスファイル

7層フィルターの各層の詳細仕様は:
- **`references/filter-layers.md`** — 政令指定都市20市コード一覧、SQL層パターン、品質フィルター閾値、テストケース要件
