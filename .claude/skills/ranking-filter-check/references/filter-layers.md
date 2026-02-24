# ランキング7層フィルター詳細仕様

## 政令指定都市20市の期待コード一覧

area.ts の `DESIGNATED_CITY_CODES` に含まれるべき20市:

| # | コード | 都市名 |
|---|--------|--------|
| 1 | 01100 | 札幌市 |
| 2 | 04100 | 仙台市 |
| 3 | 11100 | さいたま市 |
| 4 | 12100 | 千葉市 |
| 5 | 14100 | 横浜市 |
| 6 | 14130 | 川崎市 |
| 7 | 14150 | 相模原市 |
| 8 | 15100 | 新潟市 |
| 9 | 22100 | 静岡市 |
| 10 | 22130 | 浜松市 |
| 11 | 23100 | 名古屋市 |
| 12 | 26100 | 京都市 |
| 13 | 27100 | 大阪市 |
| 14 | 27140 | 堺市 |
| 15 | 28100 | 神戸市 |
| 16 | 33100 | 岡山市 |
| 17 | 34100 | 広島市 |
| 18 | 40100 | 北九州市 |
| 19 | 40130 | 福岡市 |
| 20 | 43100 | 熊本市 |

追加の除外コード:
- `13100` — 東京都特別区部（23区の集約値）

## フィルター層の詳細

### Layer 1-2: コード判定（isMunicipalityCode）

```typescript
// 判定ロジック: 3〜5桁目が "000" なら都道府県、それ以外なら市区町村
code.slice(2, 5) !== "000"
```

- "00000" → slice(2,5) = "000" → false（全国、除外）
- "13000" → slice(2,5) = "000" → false（東京都、除外）
- "13104" → slice(2,5) = "104" → true（新宿区、対象）
- 5桁・6桁どちらでも slice(2,5) で同一結果

### Layer 3: 政令指定都市親コード（isDesignatedCityCode）

```typescript
// 先頭5桁で DESIGNATED_CITY_CODES セットを照合
DESIGNATED_CITY_CODES.has(code.slice(0, 5))
```

- "14100" → true（横浜市、除外）
- "141003" → slice(0,5) = "14100" → true（6桁でも対応）
- "14101" → false（横浜市鶴見区、対象）

### Layer 4: 東京都特別区部（isTokyoSpecialWardCode）

```typescript
code.slice(0, 5) === "13100"
```

- "13100" → true（特別区部、除外）
- "13101" → false（千代田区、対象）

### Layer 5: 名前ベース都道府県チェック（isPrefectureName）

generate-rankings.ts でのみ使用。コード判定を補完するバックアップ。

```typescript
const PREFECTURE_NAMES = new Set(PREFECTURE_MAP.values());
function isPrefectureName(name: string): boolean {
  return PREFECTURE_NAMES.has(name);
}
```

### Layer 6-7: 品質フィルター

generate-rankings.ts でのみ適用:

```typescript
const MIN_REQUIRED_INDICATORS = 8;   // 全13指標中8個以上の有効値
const MIN_REQUIRED_CATEGORIES = 4;   // 全7カテゴリ中4カテゴリ以上
```

目的: データ不足の自治体がランキングに入ることを防止。

## SQL層パターン

ranking-data.ts で使用:

```typescript
.not("area_code", "like", "__000%")
```

- `__000%` は SQL LIKE パターン。`_` は任意の1文字。
- "01000" → マッチ → 除外（北海道）
- "00000" → マッチ → 除外（全国）
- "14100" → マッチしない → 通過（別途 isAggregateAreaCode でフィルター）

## 多層フィルタリングのデータフロー

```
e-Stat データソース
  ↓
[Layer 1-2] isMunicipalityCode   ← generate-rankings.ts
[Layer 3-4] isAggregateAreaCode  ← generate-rankings.ts
[Layer 5]   isPrefectureName     ← generate-rankings.ts
[Layer 6-7] 品質フィルター       ← generate-rankings.ts
  ↓
city_rankings テーブル（Supabase）
  ↓
[SQL] .not("area_code", "like", "__000%")  ← ranking-data.ts
[App] isAggregateAreaCode                  ← ranking-data.ts
  ↓
ランキング表示
```

## テストケース要件

### meta.test.ts で必要なケース

**isMunicipalityCode:**
- 市区町村コード（複数パターン） → true
- 都道府県コード（複数パターン） → false
- 全国コード "00000" → false
- 5桁・6桁混在対応

**isDesignatedCityCode:**
- 政令指定都市親コード（全20市） → true
- 政令指定都市の区コード → false
- 一般市区町村コード → false
- 6桁チェックディジット対応

**isTokyoSpecialWardCode:**
- "13100" → true
- "131002"（6桁版）→ true
- 個別区コード（13101〜13123）→ false

**isAggregateAreaCode:**
- 政令指定都市親コード → true
- 特別区部集約コード → true
- 個別区・一般市コード → false

### ranking-data.test.ts で必要なケース

- 政令指定都市親コードが結果から除外されること
- 連番再付与が正しいこと（除外後に rank が 1 から振り直し）
- municipalities が null の場合のフォールバック
- Supabase エラー時の例外処理

## 特殊考慮事項

### 浜松市（22130）

2024年の区再編により、浜松市の区構成が変更された。
`DESIGNATED_CITY_CODES` に "22130" が含まれていることを確認する。
区再編対応の詳細は `packages/core/src/estat/meta/ward-reorganization.ts` を参照。

### 将来の除外対象追加時

新しい除外対象が発見された場合:
1. `area.ts` のフィルター関数を更新
2. `generate-rankings.ts` と `ranking-data.ts` の両方で除外が適用されるか確認
3. テストを追加
4. このスキルを再実行して一貫性を検証
