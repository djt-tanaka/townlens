# スコアリングエンジン

スコアリング処理は `src/scoring/` モジュールで実装。メイン関数は `scoreCities()` (`src/scoring/index.ts`)。

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

**ファイル**: `src/scoring/normalize.ts`

比較対象の候補セット内で Min-Max 正規化を行い、0〜100のスコアに変換。

- `score = (value - min) / (max - min) * 100`
- `direction: "lower_better"` の場合: `score = 100 - rawScore`
- 候補が1つだけの場合: `score = 100`
- `null` 値の都市は結果から除外

## Baseline Score（パーセンタイル）

**ファイル**: `src/scoring/percentile.ts`

候補セット内でのパーセンタイルランクを計算。

- `percentile = (below + 0.5 * equal) / total * 100`
- `direction` に応じて反転処理
- 小数第1位で丸め

## Composite Score（複合スコア）

**ファイル**: `src/scoring/composite.ts`

カテゴリごとの重み付けで総合スコアを算出。

- `compositeScore = Σ(score × categoryWeight) / Σ(categoryWeight)`
- 欠損指標は除外し、有効指標のみで再正規化
- 小数第1位で丸め

## 重みプリセット

**ファイル**: `src/scoring/presets.ts`

| プリセット | childcare | price | safety | disaster | transport |
|-----------|-----------|-------|--------|----------|-----------|
| 子育て重視 | 0.50 | 0.25 | 0.15 | 0.05 | 0.05 |
| 価格重視 | 0.15 | 0.50 | 0.15 | 0.10 | 0.10 |
| 安全重視 | 0.20 | 0.15 | 0.35 | 0.20 | 0.10 |

## 信頼度評価

**ファイル**: `src/scoring/confidence.ts`

| レベル | データ年 | 欠損率 | サンプル数 |
|--------|---------|--------|-----------|
| High | ≤2年前 | <10% | ≥30 |
| Medium | ≤4年前 | <30% | — |
| Low | 上記以外 | — | — |

## 指標定義一覧

**ファイル**: `src/scoring/presets.ts`

| Phase | ID | ラベル | 単位 | direction | category |
|-------|-----|--------|------|-----------|----------|
| 0 | `population_total` | 総人口 | 人 | higher_better | childcare |
| 0 | `kids_ratio` | 0-14歳比率 | % | higher_better | childcare |
| 1 | `condo_price_median` | 中古マンション価格（中央値） | 万円 | lower_better | price |
| 2a | `crime_rate` | 刑法犯認知件数（人口千人当たり） | 件/千人 | lower_better | safety |
| 2b | `flood_risk` | 洪水・土砂災害リスク | リスクスコア | lower_better | disaster |
| 2b | `evacuation_sites` | 避難場所数 | 箇所 | higher_better | disaster |
