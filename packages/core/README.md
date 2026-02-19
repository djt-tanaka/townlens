# @townlens/core

CLI・Web で共有するビジネスロジックパッケージです。

## モジュール構成

```
src/
  estat/        — e-Stat APIクライアント・メタ情報解析・犯罪統計
  reinfo/       — 不動産情報ライブラリAPIクライアント・価格統計・災害リスク
  scoring/      — スコアリングエンジン（正規化・パーセンタイル・重み付き総合・信頼度）
  pipeline/     — レポート生成パイプライン（データ取得→スコアリングの統合フロー）
  narrative/    — 自然言語コメント生成
  charts/       — チャートカラー定義
  normalize/    — ラベル・カナ正規化
  config/       — ビルトインデータセット定義
```

## 主要エクスポート

### スコアリング

- `scoreCities()` — メインのスコアリング関数
- `normalizeWithinCandidates()` — 候補内 Min-Max 正規化（0〜100）
- `calculatePercentile()` — パーセンタイルベースのベースラインスコア
- `calculateCompositeScore()` — 重み付き総合スコア
- `evaluateConfidence()` — データ信頼度評価
- `CHILDCARE_FOCUSED` / `PRICE_FOCUSED` / `SAFETY_FOCUSED` — 重みプリセット

### API クライアント

- `EstatApiClient` — e-Stat API クライアント
- `ReinfoApiClient` — 不動産情報ライブラリ API クライアント

### パイプライン

- `runReportPipeline()` — データ取得→スコアリングを一括実行

### 型定義

- `ReportRow` / `CityIndicators` / `CityScoreResult` — 主要データ型
- `CacheAdapter` — キャッシュアダプタインターフェース

## 利用方法

`@townlens/cli` と `@townlens/web` から `workspace:*` で参照されています。

```typescript
import { scoreCities, EstatApiClient } from "@townlens/core";
```

## 開発コマンド

```bash
pnpm run build           # TypeScript コンパイル
pnpm run test            # テスト（Vitest / watch モード）
pnpm run test:run        # テスト（1回実行）
pnpm run test:coverage   # カバレッジ測定
```
