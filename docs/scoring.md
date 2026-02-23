# スコアリングエンジン

スコアリング処理は `packages/core/src/scoring/` モジュールで実装。メイン関数は `scoreCities()` (`packages/core/src/scoring/index.ts`)。

## パイプライン

```
CityIndicators[] (各都市の指標データ)
    │
    ├─→ Choice Score（候補内正規化）  ← normalize.ts
    ├─→ Baseline Score（パーセンタイル）← percentile.ts
    ├─→ Composite Score（重み付き総合）← composite.ts
    └─→ Confidence（信頼度評価）      ← confidence.ts
    │
    ▼
CityScoreResult[] (ランク付き結果)
```

## Choice Score（候補内正規化）

**ファイル**: `packages/core/src/scoring/normalize.ts`

比較対象の候補セット内で Min-Max 正規化を行い、0〜100のスコアに変換。

- `score = (value - min) / (max - min) * 100`
- `direction: "lower_better"` の場合: `score = 100 - rawScore`
- 候補が1つだけの場合: `score = 100`
- `null` 値の都市は結果から除外

## Baseline Score（パーセンタイル）

**ファイル**: `packages/core/src/scoring/percentile.ts`

候補セット内でのパーセンタイルランクを計算。

- `percentile = (below + 0.5 * equal) / total * 100`
- `direction` に応じて反転処理
- 小数第1位で丸め

## Composite Score（複合スコア）

**ファイル**: `packages/core/src/scoring/composite.ts`

カテゴリごとの重み付けで総合スコアを算出。

- `compositeScore = Σ(score × categoryWeight) / Σ(categoryWeight)`
- 欠損指標は除外し、有効指標のみで再正規化
- 小数第1位で丸め

## 重みプリセット

**ファイル**: `packages/core/src/scoring/presets.ts`

| プリセット | childcare | price | safety | disaster | transport | education | healthcare |
|-----------|-----------|-------|--------|----------|-----------|-----------|------------|
| 子育て重視 | 0.25 | 0.15 | 0.15 | 0.05 | 0.05 | 0.15 | 0.20 |
| 価格重視 | 0.10 | 0.45 | 0.10 | 0.05 | 0.10 | 0.10 | 0.10 |
| 安全重視 | 0.10 | 0.10 | 0.30 | 0.15 | 0.05 | 0.10 | 0.20 |

## 信頼度評価

**ファイル**: `packages/core/src/scoring/confidence.ts`

| レベル | データ年 | 欠損率 | サンプル数 |
|--------|---------|--------|-----------|
| High | ≤2年前 | <10% | ≥30 |
| Medium | ≤4年前 | <30% | — |
| Low | 上記以外 | — | — |

## 指標定義一覧

**ファイル**: `packages/core/src/scoring/presets.ts`

| Phase | ID | ラベル | 単位 | direction | category |
|-------|-----|--------|------|-----------|----------|
| 0 | `population_total` | 総人口 | 人 | higher_better | childcare |
| 0 | `kids_ratio` | 0-14歳比率 | % | higher_better | childcare |
| 1 | `condo_price_median` | 中古マンション価格（中央値） | 万円 | lower_better | price |
| 2a | `crime_rate` | 刑法犯認知件数（人口千人当たり） | 件/千人 | lower_better | safety |
| 2b | `flood_risk` | 洪水・土砂災害リスク | リスクスコア | lower_better | disaster |
| 2b | `evacuation_sites` | 避難場所数 | 箇所 | higher_better | disaster |
| 3 | `elementary_schools_per_capita` | 小学校数（人口1万人あたり） | 校/万人 | higher_better | education |
| 3 | `junior_high_schools_per_capita` | 中学校数（人口1万人あたり） | 校/万人 | higher_better | education |
| 4 | `station_count_per_capita` | 鉄道駅数（人口1万人あたり） | 駅/万人 | higher_better | transport |
| 4 | `terminal_access_km` | 最寄りターミナル駅距離 | km | lower_better | transport |
| 5 | `hospitals_per_capita` | 一般病院数（人口10万人あたり） | 施設/10万人 | higher_better | healthcare |
| 5 | `clinics_per_capita` | 一般診療所数（人口10万人あたり） | 施設/10万人 | higher_better | healthcare |
| 5 | `pediatrics_per_capita` | 小児科標榜施設数（人口10万人あたり） | 施設/10万人 | higher_better | healthcare |
