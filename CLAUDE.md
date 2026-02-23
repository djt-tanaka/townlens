# TownLens

政府統計（e-Stat）・不動産情報ライブラリ API・災害データを統合し、市区町村の多角的比較スコアリング・PDFレポートを生成するツール。

## 開発コマンド

```bash
# ルート（Turbo経由で全パッケージ実行）
pnpm build                   # TypeScriptコンパイル
pnpm test                    # 全パッケージのテスト（Vitest）
pnpm test:coverage           # カバレッジ測定（80%必須）

# パッケージ単体
pnpm --filter @townlens/core test:run    # coreのテスト
pnpm --filter @townlens/cli test:run     # CLIのテスト
pnpm --filter @townlens/web test:run     # webのテスト
pnpm --filter @townlens/web dev          # Web開発サーバー
pnpm --filter @townlens/cli dev -- report --cities "世田谷区,渋谷区"  # CLI実行
```

## アーキテクチャ

pnpm + Turbo モノレポ。`packages/core`（共有ロジック）→ `cli`・`web`（Next.js 15）が依存。

## ドキュメント

### 共通

- [API連携](docs/api-integration.md) — e-Stat / 不動産情報ライブラリの仕様・認証・キャッシュ
- [スコアリング](docs/scoring.md) — 正規化・パーセンタイル・重みプリセット・信頼度評価
- [テスト](docs/testing.md) — テスト構成・カバレッジ要件・除外ファイル
- [型定義](docs/types.md) — ReportRow / CityIndicators / CityScoreResult 等の主要型

### CLI

- [アーキテクチャ](docs/cli/architecture.md) — ディレクトリ構成・モジュール構成・データフロー
- [レポートテンプレート](docs/cli/report-templates.md) — HTML→PDF変換・テンプレート構成・スタイル

### Web

- [Webアプリ設計書](docs/web/architecture.md) — モノレポ構成・Next.js 15移行・DB設計
  - §5: DBスキーマ（テーブル定義・RLS・マイグレーション）
  - §13: 実装ノート（Turboの注意点・設計変更・知見）
- [マネタイズ戦略](docs/web/monetization-strategy.md) — フリーミアム・B2B SaaS・プラットフォーム展開

## 注意事項

- 政令指定都市の親コード（横浜市等）はランキング・検索から除外する
- 浜松市は2024年の区再編対応済み — 特殊マッピングあり（packages/core/src/estat/）
- 新モジュール追加時は `packages/core/src/index.ts` のバレルエクスポート更新を忘れないこと
