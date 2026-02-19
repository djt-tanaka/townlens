# @townlens/web

TownLens の Web アプリケーションです。ブラウザから都市比較レポートを生成・閲覧できます。

## 技術スタック

- **Next.js 15**（App Router）
- **React 19**
- **Supabase**（認証 + データベース）
- **Stripe**（決済）
- **Tailwind CSS 4**
- **Recharts**（データ可視化）
- **Radix UI**（UIコンポーネント）

## セットアップ

### 1. 環境変数の設定

```bash
cp ../../.env.example .env.local
```

`.env.local` に以下を設定してください。

```bash
# 必須
ESTAT_APP_ID=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Stripe（決済機能を使う場合）
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_PRICE_STANDARD=
STRIPE_PRICE_PREMIUM=

# 任意
REINFOLIB_API_KEY=
```

### 2. 開発サーバーの起動

```bash
pnpm dev
```

`http://localhost:3000` でアクセスできます。

## ページ構成

| パス | 説明 |
|------|------|
| `/` | トップページ（都市検索） |
| `/auth/login` | ログイン |
| `/dashboard` | ダッシュボード（レポート一覧） |
| `/pricing` | 料金プラン |
| `/report/[id]` | レポート表示 |

## API Routes

| エンドポイント | メソッド | 説明 |
|---------------|---------|------|
| `/api/reports` | POST | レポート生成 |
| `/api/reports/[id]` | GET | レポート取得 |
| `/api/cities/search` | GET | 都市名検索（オートコンプリート） |
| `/api/usage` | GET | 利用状況の確認 |
| `/api/stripe/checkout` | POST | Stripe 決済セッション作成 |
| `/api/stripe/portal` | POST | Stripe カスタマーポータル |
| `/api/stripe/webhook` | POST | Stripe Webhook 受信 |

## 開発コマンド

```bash
pnpm dev              # 開発サーバー起動
pnpm build            # プロダクションビルド
pnpm start            # プロダクション起動
pnpm lint             # ESLint
pnpm test             # テスト（watch モード）
pnpm test:run         # テスト（1回実行）
pnpm test:coverage    # カバレッジ測定
```
