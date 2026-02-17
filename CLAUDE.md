# estat-city-report

e-Stat API と不動産情報ライブラリ API から市区町村データを取得し、比較PDFレポートを生成する CLI ツール。

## 開発コマンド

```bash
npm run dev -- report --cities "世田谷区,渋谷区"  # 開発実行
npm run build                                      # TypeScriptコンパイル
npm test                                           # テスト実行（Vitest）
npm run test:coverage                              # カバレッジ測定（80%必須）
```

## ドキュメント

### 共通

- [API連携](docs/api-integration.md) — e-Stat / 不動産情報ライブラリの仕様・認証・キャッシュ
- [スコアリング](docs/scoring.md) — 正規化・パーセンタイル・重みプリセット・信頼度評価
- [テスト](docs/testing.md) — テスト構成・カバレッジ要件・除外ファイル
- [型定義](docs/types.md) — ReportRow / CityIndicators / CityScoreResult 等の主要型

### CLI

- [アーキテクチャ](docs/cli/architecture.md) — ディレクトリ構成・モジュール構成・データフロー
- [レポートテンプレート](docs/cli/report-templates.md) — HTML→PDF変換・テンプレート構成・スタイル
- [MVP仕様（初期）](docs/cli/estat-mvp-spec.md) — Phase 0 の初期仕様書

### Web

- [Webアプリ設計書](docs/web/architecture.md) — モノレポ構成・Next.js 15移行・DB設計
- [マネタイズ戦略](docs/web/monetization-strategy.md) — フリーミアム・B2B SaaS・プラットフォーム展開
