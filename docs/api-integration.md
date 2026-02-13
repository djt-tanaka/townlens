# API連携

## 環境変数

| 変数名 | 用途 | 必須 |
|--------|------|------|
| `ESTAT_APP_ID` | e-Stat API のアプリケーションID | レポート生成時に必須 |
| `REINFOLIB_API_KEY` | 不動産情報ライブラリ API キー | 価格・災害データ取得時に必須（`--no-price` で省略可） |

`.env` ファイルに設定し、`dotenv` で読み込む。テンプレートは `.env.example` を参照。

## e-Stat API

**クライアント**: `src/estat/client.ts` — `EstatApiClient`

### エンドポイント

ベースURL: `https://api.e-stat.go.jp/rest/3.0/app/json/`

| メソッド | API | 用途 |
|---------|-----|------|
| `getStatsList(keyword, limit)` | `getStatsList` | 統計表検索 |
| `getMetaInfo(statsDataId)` | `getMetaInfo` | メタ情報取得 |
| `getStatsData(params)` | `getStatsData` | 統計データ取得 |

### ビルトインデータセット

| データ | 統計表ID | 出典 |
|--------|----------|------|
| 人口（年齢3区分） | `0003448299` | 国勢調査 令和2年 |
| 犯罪統計 | `0000020211` | 社会・人口統計体系 K安全 |

定義は `src/config/datasets.ts` で管理。

### リトライ機構

- 最大3回リトライ
- 指数バックオフ: 1秒 → 2秒 → 4秒
- HTTP 429/500/502/503 でリトライ

### キャッシュ

- 保存先: `.cache/estat/meta_<statsDataId>.json`
- TTL: 7日間
- メタ情報のみキャッシュ対象（統計データ本体はキャッシュしない）

## 不動産情報ライブラリ API

**クライアント**: `src/reinfo/client.ts` — `ReinfoApiClient`

### エンドポイント

ベースURL: `https://www.reinfolib.mlit.go.jp/ex-api/external/`

| API | 用途 |
|-----|------|
| `XIT001` | 不動産取引価格情報 |
| `XIT002` | 都道府県内市区町村一覧 |

### 災害タイルAPI

| API | 用途 | データ形式 |
|-----|------|----------|
| `XKT026` | 洪水浸水想定区域 | GeoJSON |
| `XKT029` | 土砂災害警戒区域 | GeoJSON |
| `XGT001` | 指定緊急避難場所 | GeoJSON |

タイル座標はレベル14（約1km²）で、市区町村の代表座標から算出。代表座標は `src/reinfo/city-locations.ts` で定義。

### レート制限対策

| 対象 | ディレイ |
|------|---------|
| 都市間リクエスト（取引価格） | 200ms |
| タイル間リクエスト（災害情報） | 300ms |

### キャッシュ

- 保存先: `.cache/reinfo/`
- TTL: 7日間
- 取引データをキャッシュ対象
