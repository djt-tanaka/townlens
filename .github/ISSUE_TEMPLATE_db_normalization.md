---
title: "DB正規化: 都市属性をmunicipalitiesに集約し、city_rankingsをランキング専用にする"
---

## 概要

`city_rankings` テーブルに都市属性データ（`city_name`, `prefecture`, `population`, `kids_ratio`）がランキングデータと一緒に格納されており、`municipalities` テーブルと重複している。正規化してそれぞれの責務を明確にする。

## 現状の問題

```
city_rankings (プリセット×都市 = ~5,700行)
├── id, preset, area_code, rank, star_rating, indicator_stars  ← ランキング固有
├── city_name, prefecture  ← municipalitiesと重複
├── population, kids_ratio  ← 都市属性（本来municipalitiesに属する）
└── generated_at
```

- 3プリセット × ~1,900都市 = ~5,700行に `city_name`, `prefecture`, `population`, `kids_ratio` が全て重複保存されている
- 都市名や人口が変わった場合に複数行を更新する必要がある
- #122 で `kids_ratio` を `city_rankings` に追加したが、本来ここに足すべきではなかった

## あるべき姿

```
municipalities (都市マスター, ~1,900行)
├── area_code (PK)
├── city_name, prefecture
├── population, kids_ratio  ← 都市属性はここに集約
└── generated_at

city_rankings (ランキング専用, ~5,700行)
├── preset, area_code (UNIQUE)  ← FK → municipalities.area_code
├── rank, star_rating, indicator_stars
└── generated_at
```

## 変更内容

### マイグレーション
- `municipalities` テーブルに `population`, `kids_ratio` カラムを追加
- `city_rankings` テーブルから `city_name`, `prefecture`, `population`, `kids_ratio` カラムを削除
- `city_rankings.area_code` → `municipalities.area_code` の外部キー制約を追加

### generate-rankings スクリプト
- `municipalities` upsert 時に `population`, `kids_ratio` も保存
- `city_rankings` upsert からは `city_name`, `prefecture`, `population`, `kids_ratio` を除去

### データ取得層
- `ranking-data.ts`: `city_rankings JOIN municipalities` または2クエリ+アプリ側マージに変更
- `prefecture-data.ts`: 同上
- `database.ts`: 型定義を更新

### テスト
- `prefecture-data.test.ts`, `ranking-data` 関連テストを更新

## 関連
- #122 で都道府県ページのパフォーマンス改善時に `kids_ratio` を `city_rankings` に追加した経緯あり
