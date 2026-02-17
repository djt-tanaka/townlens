# Webアプリ化 技術設計書

## エグゼクティブサマリー

estat-city-report のWebアプリ化により、CLIツールの技術的価値（多指標スコアリング・レポート自動生成）をブラウザで利用可能にする。既存コードの約80%を共通パッケージとして再利用し、2ヶ月（8週間）でMVPを完成させる。

**MVPスコープ**（[マネタイズ戦略書](./monetization-strategy.md) Phase 1より）:
- 都市名入力（オートコンプリート）
- 2都市のスコア比較表示（Webレポート）
- ユーザー登録・ログイン
- 月3件の無料利用制限
- 有料プランへのアップグレード導線

**対象外（M3以降）**: PDF生成、メッシュ分析、駅圏分析

---

## 1. システムアーキテクチャ

### 1.1 全体構成図

```
                              [Vercel]
                                 │
                       ┌─────────┴──────────┐
                       │ Next.js 15          │
                       │ App Router          │
                       └─────────┬──────────┘
                                 │
                  ┌──────────────┼──────────────┐
                  │              │              │
           [Route Handlers] [Server        [Client
            /api/*          Components]    Components]
                  │              │              │
                  ▼              │         Recharts
           ┌───────────┐        │         shadcn/ui
           │@estat/core │◀───────┘
           └─────┬─────┘
                 │
        ┌────────┼────────┐
        │        │        │
   ┌────┴───┐┌───┴──┐┌───┴────────┐
   │scoring ││estat ││  reinfo    │
   │engine  ││ API  ││  API       │
   └────────┘└──────┘└────────────┘
                 │
          ┌──────┴──────┐
          │  Supabase   │
          │ Auth + DB   │
          │ + Storage   │
          └─────────────┘
```

### 1.2 処理の実行環境分離

| 処理 | 実行環境 | 理由 |
|------|---------|------|
| e-Stat API 呼び出し | サーバー（Route Handler） | APIキー秘匿、レート制限管理 |
| 不動産情報ライブラリ API 呼び出し | サーバー（Route Handler） | APIキー秘匿 |
| スコアリング計算 | サーバー（Route Handler） | CPU集約型処理 |
| ナラティブ生成 | サーバー（Server Component） | 初期HTML に含めてSEO最適化 |
| チャート描画 | クライアント | インタラクティブ操作（ホバー、ツールチップ） |
| 都市名検索 | クライアント → サーバー | UX応答性 + データ解決 |
| 認証フロー | クライアント + サーバー | Supabase Auth SDK 双方で使用 |
| 決済フロー | クライアント（Checkout） + サーバー（Webhook） | Stripe が処理を分離 |

---

## 2. モノレポ構成

### 2.1 ディレクトリツリー

```
estat-city-report/
├── packages/
│   ├── core/                      # @estat/core — 共通コアロジック
│   │   ├── src/
│   │   │   ├── scoring/           # ← 現 src/scoring/ をそのまま移行
│   │   │   │   ├── index.ts       # scoreCities()
│   │   │   │   ├── types.ts       # CityScoreResult, CityIndicators 等
│   │   │   │   ├── presets.ts     # ALL_PRESETS, ALL_INDICATORS
│   │   │   │   ├── normalize.ts
│   │   │   │   ├── percentile.ts
│   │   │   │   ├── composite.ts
│   │   │   │   └── confidence.ts
│   │   │   ├── estat/             # ← 現 src/estat/ からAPI通信部分を移行
│   │   │   │   ├── client.ts      # EstatApiClient
│   │   │   │   ├── meta.ts        # resolveCities(), buildAreaEntries()
│   │   │   │   ├── report-data.ts # buildReportData()
│   │   │   │   ├── crime-data.ts  # buildCrimeData()
│   │   │   │   └── merge-crime-scoring.ts
│   │   │   ├── reinfo/            # ← 現 src/reinfo/ から移行
│   │   │   │   ├── client.ts      # ReinfoApiClient
│   │   │   │   ├── types.ts
│   │   │   │   ├── price-data.ts
│   │   │   │   ├── stats.ts
│   │   │   │   ├── disaster-data.ts
│   │   │   │   ├── merge-scoring.ts
│   │   │   │   └── merge-disaster-scoring.ts
│   │   │   ├── narrative/         # ← 現 src/report/narrative.ts
│   │   │   │   └── index.ts       # generateCityNarrative(), generateComparisonNarrative()
│   │   │   ├── charts/            # ← 現 src/report/templates/charts/colors.ts
│   │   │   │   └── colors.ts      # カラーパレット定義（Web/CLI共有）
│   │   │   ├── types.ts           # ← 現 src/types.ts (ReportRow)
│   │   │   ├── errors.ts          # AppError（CliError から拡張）
│   │   │   ├── utils.ts           # 純粋ユーティリティ（fs依存なし）
│   │   │   ├── cache.ts           # CacheAdapter インターフェース定義
│   │   │   └── index.ts           # 公開API re-export
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── vitest.config.ts
│   │
│   ├── cli/                       # CLIアプリ（既存動作を維持）
│   │   ├── src/
│   │   │   ├── cli.ts             # ← 現 src/cli.ts（import先を@estat/coreに変更）
│   │   │   ├── config/            # ← 現 src/config/
│   │   │   ├── cache/             # ファイルベースキャッシュ実装
│   │   │   │   ├── file-cache.ts  # CacheAdapter のファイルシステム実装
│   │   │   │   ├── estat-cache.ts # ← 現 src/estat/cache.ts
│   │   │   │   └── reinfo-cache.ts # ← 現 src/reinfo/cache.ts
│   │   │   ├── report/            # ← 現 src/report/ (HTML/PDF生成)
│   │   │   │   ├── pdf.ts
│   │   │   │   ├── html.ts
│   │   │   │   └── templates/     # SVGチャート含む全テンプレート
│   │   │   ├── mesh/              # ← 現 src/mesh/
│   │   │   ├── station/           # ← 現 src/station/
│   │   │   ├── geo/               # ← 現 src/geo/
│   │   │   ├── normalize/         # ← 現 src/normalize/
│   │   │   └── interactive/       # ← 現 src/interactive/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── vitest.config.ts
│   │
│   └── web/                       # Next.js 15 Webアプリ（新規）
│       ├── src/
│       │   ├── app/               # App Router
│       │   │   ├── layout.tsx
│       │   │   ├── page.tsx                    # トップページ
│       │   │   ├── report/[id]/page.tsx        # レポート表示
│       │   │   ├── dashboard/page.tsx          # ユーザーダッシュボード
│       │   │   ├── pricing/page.tsx            # 料金プラン
│       │   │   ├── auth/
│       │   │   │   ├── login/page.tsx
│       │   │   │   └── callback/route.ts       # OAuth コールバック
│       │   │   └── api/
│       │   │       ├── cities/search/route.ts
│       │   │       ├── reports/route.ts
│       │   │       ├── reports/[id]/route.ts
│       │   │       ├── usage/route.ts
│       │   │       └── stripe/
│       │   │           ├── checkout/route.ts
│       │   │           └── webhook/route.ts
│       │   ├── components/
│       │   │   ├── ui/            # shadcn/ui コンポーネント
│       │   │   ├── report/        # レポート表示コンポーネント
│       │   │   │   ├── score-summary.tsx
│       │   │   │   ├── radar-chart.tsx
│       │   │   │   ├── bar-chart.tsx
│       │   │   │   ├── score-gauge.tsx
│       │   │   │   ├── indicator-dashboard.tsx
│       │   │   │   ├── city-detail.tsx
│       │   │   │   └── narrative-block.tsx
│       │   │   ├── search/
│       │   │   │   └── city-search.tsx
│       │   │   ├── layout/
│       │   │   │   ├── header.tsx
│       │   │   │   └── footer.tsx
│       │   │   └── auth/
│       │   │       ├── login-form.tsx
│       │   │       └── auth-guard.tsx
│       │   ├── lib/
│       │   │   ├── supabase/
│       │   │   │   ├── client.ts       # ブラウザ用 Supabase クライアント
│       │   │   │   ├── server.ts       # Server Component 用
│       │   │   │   └── middleware.ts    # 認証ミドルウェア
│       │   │   ├── stripe.ts           # Stripe ユーティリティ
│       │   │   └── supabase-cache.ts   # CacheAdapter の Supabase 実装
│       │   ├── hooks/
│       │   │   ├── use-city-search.ts
│       │   │   ├── use-report.ts
│       │   │   └── use-usage.ts
│       │   └── types/
│       │       └── index.ts            # Web固有の型定義
│       ├── supabase/
│       │   └── migrations/             # DB マイグレーション SQL
│       ├── public/
│       ├── next.config.ts
│       ├── tailwind.config.ts
│       ├── package.json
│       └── tsconfig.json
│
├── package.json                   # pnpm workspaces ルート
├── pnpm-workspace.yaml
├── turbo.json                     # Turborepo 設定
├── tsconfig.base.json             # 共有 TypeScript 設定
└── .env.example                   # 環境変数テンプレート
```

### 2.2 ツール選定: Turborepo + pnpm workspaces

| 観点 | 判断 |
|------|------|
| ビルドツール | Turborepo（Vercel ネイティブサポート、リモートキャッシュ、設定最小） |
| パッケージマネージャ | pnpm（厳格な依存関係解決、ディスク効率） |
| TypeScript | `tsconfig.base.json` で共有、各パッケージが `extends` |

### 2.3 パッケージ間の依存関係

```
@estat/web ──depends──▶ @estat/core
@estat/cli ──depends──▶ @estat/core
```

`turbo.json` 設定:
```jsonc
{
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**"]
    },
    "test": {
      "dependsOn": ["^build"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

---

## 3. 技術選定と根拠

### 3.1 フロントエンド: Next.js 15 App Router

| 観点 | 判断理由 |
|------|---------|
| SSR/ISR | レポートページを ISR（24時間）で配信。SEO に必須 |
| Server Components | e-Stat/不動産 API 呼び出しをサーバー側で完結。APIキー漏洩リスクゼロ |
| Route Handlers | 専用バックエンドサーバー不要。Vercel Functions で自動スケール |
| SEO | `generateMetadata` + `@vercel/og` で動的OGP |
| デプロイ | Vercel にゼロ設定デプロイ |

**トレードオフ**: Supabase + Vercel へのプラットフォーム依存が発生するが、標準技術（PostgreSQL, JWT, REST）に準拠しており移行パスは確保される。

### 3.2 UI: shadcn/ui + Tailwind CSS v4

**MVPで必要な shadcn/ui コンポーネント**:
- `Command` — 都市名オートコンプリート（cmdk ベース）
- `Card` — スコアカード、ランキングカード
- `Table` — 指標一覧
- `Badge` — 信頼度バッジ（High/Medium/Low）、カテゴリバッジ
- `Button`, `Input`, `Dialog`, `Tabs`, `Skeleton`

### 3.3 チャート: Recharts

既存の SVG 文字列生成チャート（`src/report/templates/charts/`）を Recharts コンポーネントに置換する。

| 既存チャート | Web版 | 理由 |
|------------|-------|------|
| `radar.ts` (SVG文字列) | Recharts `<RadarChart>` | ホバーでスコア表示、アニメーション |
| `bar.ts` (SVG文字列) | Recharts `<BarChart>` | インタラクティブ比較 |
| `gauge.ts` (SVG文字列) | カスタム SVG React コンポーネント | Recharts にゲージがないため自作 |
| `colors.ts` (カラー定義) | **@estat/core で共有** | Web/CLI 両方で利用 |

既存SVGチャートは CLI の PDF 生成で引き続き使用する。

### 3.4 認証: Supabase Auth

- `@supabase/ssr` パッケージで Next.js App Router 公式サポート
- ソーシャルログイン（Google）+ メール認証
- Row Level Security (RLS) で DB 層アクセス制御
- 無料枠: 月 50,000 MAU

### 3.5 データベース: Supabase PostgreSQL

- Auth/Storage と同一プラットフォーム
- RLS で認証ユーザーのデータ分離
- JSONB 型でスコアリング結果を柔軟に保存

### 3.6 決済: Stripe Checkout

- ホスト型決済ページ（PCI DSS 準拠、実装最小）
- 日本円サブスクリプション対応
- Customer Portal でプラン変更・解約をセルフサービス化
- Webhook で `profiles` テーブルのプラン情報を自動更新

### 3.7 デプロイ: Vercel

- Next.js の最適環境（Edge Functions, ISR, Image Optimization）
- Turborepo リモートキャッシュ対応
- プレビューデプロイ（PR ごとに自動生成）

---

## 4. API設計

### 4.1 エンドポイント一覧

| エンドポイント | メソッド | 認証 | 説明 |
|-------------|--------|------|------|
| `/api/cities/search?q={query}` | GET | 不要 | 都市名オートコンプリート |
| `/api/reports` | POST | 必須 | レポート生成 |
| `/api/reports/[id]` | GET | 不要 | レポート取得（共有可能） |
| `/api/usage` | GET | 必須 | 利用量確認 |
| `/api/stripe/checkout` | POST | 必須 | Checkout Session 作成 |
| `/api/stripe/webhook` | POST | Stripe署名検証 | イベント受信 |

### 4.2 都市名検索 API

**`GET /api/cities/search?q={query}`**

既存の `src/estat/meta.ts` にある `buildAreaEntries()` のロジックを活用する。e-Stat メタ情報から構築した地域コード一覧をキャッシュし、前方一致検索を行う。

```typescript
// リクエスト
interface CitySearchParams {
  readonly q: string;  // 検索クエリ（2文字以上）
}

// レスポンス
interface CitySearchResponse {
  readonly cities: ReadonlyArray<{
    readonly code: string;       // 地域コード（例: "13112"）
    readonly name: string;       // 市区町村名（例: "世田谷区"）
    readonly prefecture: string; // 都道府県名（例: "東京都"）
  }>;
}
```

**実装方針**:
- クライアント側: `useDebounce`（300ms）でリクエスト頻度を制御
- サーバー側: `api_cache` テーブルにキャッシュ済みの地域コード一覧で前方一致検索
- 結果上限: 20件

### 4.3 レポート生成 API

**`POST /api/reports`**

既存 CLI の `report` コマンドのデータ取得パイプライン（Phase 0 → 1 → 2a → 2b → スコアリング）をそのまま再利用する。

```typescript
// リクエスト
interface CreateReportRequest {
  readonly cities: ReadonlyArray<string>;  // 都市名（2〜5件）
  readonly preset: string;                  // "childcare" | "price" | "safety"
  readonly options?: {
    readonly includePrice?: boolean;        // デフォルト: true
    readonly includeCrime?: boolean;        // デフォルト: true
    readonly includeDisaster?: boolean;     // デフォルト: true
  };
}

// レスポンス
interface CreateReportResponse {
  readonly reportId: string;
  readonly status: "completed" | "failed";
  readonly error?: string;
}
```

**実装方針**:
- MVPでは同期処理。API呼び出し合計3〜8秒で Vercel Functions タイムアウト内に収まる
- Vercel Pro プラン（60秒タイムアウト）を推奨
- 利用量チェック: `usage_records` テーブルで月次カウントを確認し、無料プランは月3件でブロック
- 結果は `reports` テーブルに JSONB として保存

**データフロー（既存CLIと同一）**:
```
都市名入力
  │
  ▼
Phase 0: 人口統計取得
  └─ @estat/core: buildReportData() → ReportRow[]
  │
  ▼
Phase 1: 不動産価格取得（オプション）
  └─ @estat/core: buildPriceData() → mergePriceIntoScoringInput()
  │
  ▼
Phase 2a: 犯罪統計取得（オプション）
  └─ @estat/core: buildCrimeData() → mergeCrimeIntoScoringInput()
  │
  ▼
Phase 2b: 災害リスク取得（オプション）
  └─ @estat/core: buildDisasterData() → mergeDisasterIntoScoringInput()
  │
  ▼
スコアリング
  └─ @estat/core: scoreCities(cities, ALL_INDICATORS, preset) → CityScoreResult[]
  │
  ▼
DB保存 → レスポンス返却
```

### 4.4 レポート取得 API

**`GET /api/reports/[id]`**

```typescript
// レスポンス
interface ReportResponse {
  readonly report: {
    readonly id: string;
    readonly cities: ReadonlyArray<string>;
    readonly preset: WeightPreset;           // @estat/core の型
    readonly createdAt: string;
    readonly results: ReadonlyArray<CityScoreResult>;
    readonly definitions: ReadonlyArray<IndicatorDefinition>;
    readonly rawRows: ReadonlyArray<ReportRow>;
    readonly hasPriceData: boolean;
    readonly hasCrimeData: boolean;
    readonly hasDisasterData: boolean;
  };
}
```

認証不要（URLを知っていれば誰でも閲覧可能）。レポートの共有・SNSシェアを促進する設計。

### 4.5 利用量確認 API

**`GET /api/usage`**

```typescript
interface UsageResponse {
  readonly plan: "free" | "standard" | "premium";
  readonly currentMonth: {
    readonly reportsGenerated: number;
    readonly reportsLimit: number | null;  // free: 3, standard/premium: null（無制限）
  };
}
```

### 4.6 Stripe 連携

**`POST /api/stripe/checkout`** — Stripe Checkout Session を作成し、URLを返却。

```typescript
// リクエスト
interface CheckoutRequest {
  readonly priceId: string;  // Stripe Price ID（standard or premium）
}

// レスポンス
interface CheckoutResponse {
  readonly url: string;  // Stripe Checkout ページURL
}
```

**`POST /api/stripe/webhook`** — Stripe からのイベントを受信。

処理対象イベント:
| イベント | 処理 |
|---------|------|
| `checkout.session.completed` | `profiles.stripe_customer_id` 設定、プラン更新 |
| `customer.subscription.updated` | プラン変更を反映 |
| `customer.subscription.deleted` | プランを `free` に戻す |

---

## 5. データベーススキーマ

### 5.1 テーブル定義

```sql
-- ユーザープロファイル（Supabase Auth の auth.users と連携）
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  plan TEXT NOT NULL DEFAULT 'free'
    CHECK (plan IN ('free', 'standard', 'premium')),
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 月次利用量追跡
CREATE TABLE usage_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  month TEXT NOT NULL,                 -- 'YYYY-MM' 形式
  report_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, month)
);

-- 生成レポート
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  cities TEXT[] NOT NULL,              -- 比較対象の都市名配列
  preset TEXT NOT NULL,                -- プリセット名
  status TEXT NOT NULL DEFAULT 'processing'
    CHECK (status IN ('processing', 'completed', 'failed')),
  result_json JSONB,                   -- CityScoreResult[] + メタ情報
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- API キャッシュ（ファイルベースキャッシュの移行先）
CREATE TABLE api_cache (
  cache_key TEXT PRIMARY KEY,          -- 例: 'estat:meta:0003448299'
  data JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 5.2 Row Level Security (RLS)

```sql
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- profiles: 自分のデータのみ参照・更新可
CREATE POLICY "profiles_select_own"
  ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE USING (auth.uid() = id);

-- usage_records: 自分の利用量のみ参照可
CREATE POLICY "usage_select_own"
  ON usage_records FOR SELECT USING (auth.uid() = user_id);

-- reports: 自分のレポートは作成・参照可、他人のレポートはIDで参照可（共有用）
CREATE POLICY "reports_insert_own"
  ON reports FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "reports_select_all"
  ON reports FOR SELECT USING (true);  -- レポートURLを知っていれば誰でも閲覧可

-- api_cache: サービスロール（サーバーサイド）のみアクセス
-- RLSはデフォルトで全拒否。Route Handlers は supabase.admin クライアントを使用
```

### 5.3 インデックス

```sql
CREATE INDEX idx_reports_user_id ON reports(user_id);
CREATE INDEX idx_reports_created_at ON reports(created_at DESC);
CREATE INDEX idx_usage_user_month ON usage_records(user_id, month);
CREATE INDEX idx_api_cache_expires ON api_cache(expires_at);
```

### 5.4 トリガー: プロファイル自動作成

```sql
-- Supabase Auth でユーザー作成時に profiles レコードを自動生成
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

---

## 6. キャッシュ戦略

### 6.1 CacheAdapter インターフェース

既存のファイルベースキャッシュ（`src/estat/cache.ts`, `src/reinfo/cache.ts`）を抽象化し、CLI/Web で実装を差し替える。

```typescript
// @estat/core/src/cache.ts

/** キャッシュアダプタのインターフェース */
export interface CacheAdapter {
  /** キャッシュからデータを取得。期限切れ or 未存在は null */
  get<T>(key: string): Promise<T | null>;
  /** キャッシュにデータを保存 */
  set<T>(key: string, value: T, ttlMs: number): Promise<void>;
}

/** デフォルトTTL: 7日間 */
export const DEFAULT_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
```

### 6.2 実装の使い分け

| 環境 | 実装 | ファイル |
|------|------|---------|
| CLI | ファイルベース（`.cache/` ディレクトリ） | `cli/src/cache/file-cache.ts` |
| Web | Supabase `api_cache` テーブル | `web/src/lib/supabase-cache.ts` |

### 6.3 キャッシュキー規則

```
estat:meta:{statsDataId}                    # e-Stat メタ情報
estat:data:{statsDataId}:{cdArea}:{cdTime}  # e-Stat 統計データ
reinfo:trade:{city}:{year}                  # 不動産取引データ
reinfo:cities:{area}                        # 市区町村マスタ
```

### 6.4 API クライアントへの注入

```typescript
// @estat/core/src/estat/client.ts（変更イメージ）
export class EstatApiClient {
  constructor(
    private readonly appId: string,
    private readonly cache?: CacheAdapter  // オプショナルで注入
  ) {}

  async getMetaInfo(statsDataId: string): Promise<MetaInfo> {
    if (this.cache) {
      const cached = await this.cache.get<MetaInfo>(`estat:meta:${statsDataId}`);
      if (cached) return cached;
    }
    const result = await this.fetchMetaInfo(statsDataId);
    if (this.cache) {
      await this.cache.set(`estat:meta:${statsDataId}`, result, DEFAULT_CACHE_TTL_MS);
    }
    return result;
  }
}
```

---

## 7. フロントエンド画面設計

### 7.1 画面一覧

| 画面 | パス | 認証 | レンダリング | 主要コンポーネント |
|------|------|------|------------|-----------------|
| トップ | `/` | 不要 | SSR | CitySearch, Hero |
| レポート | `/report/[id]` | 不要 | ISR (24h) | ScoreSummary, RadarChart, BarChart, CityDetail |
| ログイン | `/auth/login` | 不要 | CSR | LoginForm (Supabase Auth UI) |
| ダッシュボード | `/dashboard` | 必須 | SSR | ReportHistory, UsageBar |
| 料金プラン | `/pricing` | 不要 | SSG | PricingTable, CheckoutButton |

### 7.2 トップページ (`/`)

```
┌──────────────────────────────────────────┐
│  Header（ロゴ / ログイン / ダッシュボード）    │
├──────────────────────────────────────────┤
│                                          │
│  街を比較して、暮らしやすさを見つけよう      │
│                                          │
│  ┌─────────────────────────────────────┐ │
│  │ 🔍 市区町村名を入力...               │ │
│  │   [世田谷区]  [渋谷区]  [+ 追加]    │ │
│  │                                     │ │
│  │   プリセット: [子育て重視 ▼]          │ │
│  │                                     │ │
│  │         [ 比較する ]                 │ │
│  └─────────────────────────────────────┘ │
│                                          │
│  ── 特徴 ──────────────────────────────   │
│  📊 政府統計ベース  🔬 多指標スコアリング    │
│  ⚖️ 中立的・客観的分析                     │
│                                          │
├──────────────────────────────────────────┤
│  Footer（利用規約 / プライバシー / 出典）    │
└──────────────────────────────────────────┘
```

**CitySearch コンポーネント**:
- shadcn/ui の `Command`（cmdk ベース）を使用
- 2文字以上の入力で `/api/cities/search` を呼び出し
- `useDebounce(300ms)` でリクエスト制御
- 選択済み都市はタグ表示（最大5件、無料プランは2件）

### 7.3 レポート表示ページ (`/report/[id]`)

既存テンプレート（`compose.ts`）の `ScoredReportModel` をデータモデルとして使用し、各セクションを React コンポーネントに変換する。

```
┌──────────────────────────────────────────┐
│  Header                                   │
├──────────────────────────────────────────┤
│                                          │
│  世田谷区 vs 渋谷区 比較レポート            │
│  プリセット: 子育て重視 / 2026-02-18       │
│  [シェア🔗]  [新しい比較を作成]             │
│                                          │
│  ── サマリー ─────────────────────────     │
│  ┌────────────┐  ┌──────────────────┐    │
│  │ 🥇 世田谷区 │  │                  │    │
│  │  78.5点     │  │   RadarChart     │    │
│  │ 🥈 渋谷区  │  │   (Recharts)     │    │
│  │  65.2点     │  │                  │    │
│  └────────────┘  └──────────────────┘    │
│                                          │
│  比較ナラティブ:                           │
│  「世田谷区が総合1位（78.5点）で...」       │
│                                          │
│  ── 指標ダッシュボード ───────────────     │
│  ┌──────────────────────────────────┐    │
│  │  BarChart（指標別比較）             │    │
│  │  総人口 ████████████ 80           │    │
│  │         █████████ 65              │    │
│  │  0-14歳 ███████████ 75            │    │
│  │         ██████ 50                 │    │
│  │  ...                              │    │
│  └──────────────────────────────────┘    │
│                                          │
│  ── 都市詳細 ─────────────────────────    │
│  [世田谷区] [渋谷区]  ← タブ切り替え       │
│  ┌──────────────────────────────────┐    │
│  │  ScoreGauge (78.5)               │    │
│  │  カテゴリ別スコアカード              │    │
│  │  ナラティブ                        │    │
│  └──────────────────────────────────┘    │
│                                          │
│  ── 免責事項 ─────────────────────────    │
│  データ出典: e-Stat / 不動産情報ライブラリ   │
│                                          │
├──────────────────────────────────────────┤
│  Footer                                   │
└──────────────────────────────────────────┘
```

**CLIテンプレートからの変換マッピング**:

| CLIテンプレート (`report/templates/`) | React コンポーネント (`components/report/`) | 変更点 |
|--------------------------------------|-------------------------------------------|-------|
| `cover.ts` | ページヘッダーに統合 | 全画面カバーは不要。メタ情報をコンパクトに |
| `summary.ts` | `<ScoreSummary>` + `<RadarChart>` | Recharts でインタラクティブ化 |
| `dashboard.ts` | `<IndicatorDashboard>` + `<BarChart>` | ホバーで詳細表示 |
| `city-detail.ts` | `<CityDetail>` + `<ScoreGauge>` | タブ切り替えUI |
| `disclaimer.ts` | `<Disclaimer>` | ページ下部に固定表示 |
| `narrative.ts` | `<NarrativeBlock>` | 既存ロジック（core）をそのまま呼び出し |

### 7.4 ダッシュボード (`/dashboard`)

認証必須。Server Component で Supabase からデータ取得。

- **利用量表示**: 今月のレポート生成数 / 上限（プログレスバー）
- **レポート履歴**: 過去のレポート一覧（日時、対象都市、プリセット、リンク）
- **プラン情報**: 現在のプラン + アップグレード導線

### 7.5 料金プランページ (`/pricing`)

SSG（静的生成）。3プラン比較表:

| | Free | Standard (¥980/月) | Premium (¥2,980/月) |
|---|---|---|---|
| 月間レポート | 3件 | 無制限 | 無制限 |
| 比較都市数 | 2都市 | 5都市 | 5都市 |
| 指標詳細 | 総合スコアのみ | 全指標 | 全指標 |
| プリセット | 固定 | 全プリセット | カスタム重み |
| PDF ダウンロード | - | M3以降 | M3以降 |

---

## 8. 既存コード移行マップ

### 8.1 移行対象と再利用率

#### core パッケージへ移行（再利用率約80%）

| 現在のパス | 移行先 | 再利用率 | 変更点 |
|-----------|--------|---------|-------|
| `src/scoring/` (7ファイル, 全約500行) | `core/src/scoring/` | **100%** | 変更なし |
| `src/types.ts` | `core/src/types.ts` | **100%** | 変更なし |
| `src/errors.ts` | `core/src/errors.ts` | **90%** | `CliError` → `AppError` にリネーム。`exitCode` を optional化 |
| `src/utils.ts` | `core/src/utils.ts` | **80%** | `fs` 依存関数（`ensureDir`, `resolveOutPath`）をCLI側に残す |
| `src/estat/client.ts` | `core/src/estat/client.ts` | **95%** | `CliError` → `AppError`、キャッシュを `CacheAdapter` 注入に変更 |
| `src/estat/meta.ts` | `core/src/estat/meta.ts` | **100%** | 変更なし |
| `src/estat/report-data.ts` | `core/src/estat/report-data.ts` | **90%** | ファイル出力関連を除去 |
| `src/estat/crime-data.ts` | `core/src/estat/crime-data.ts` | **100%** | 変更なし |
| `src/estat/merge-crime-scoring.ts` | `core/src/estat/merge-crime-scoring.ts` | **100%** | 変更なし |
| `src/reinfo/client.ts` | `core/src/reinfo/client.ts` | **95%** | `CliError` → `AppError`、キャッシュ注入 |
| `src/reinfo/types.ts` | `core/src/reinfo/types.ts` | **100%** | 変更なし |
| `src/reinfo/price-data.ts` | `core/src/reinfo/price-data.ts` | **100%** | 変更なし |
| `src/reinfo/stats.ts` | `core/src/reinfo/stats.ts` | **100%** | 変更なし |
| `src/reinfo/disaster-data.ts` | `core/src/reinfo/disaster-data.ts` | **100%** | 変更なし |
| `src/reinfo/merge-scoring.ts` | `core/src/reinfo/merge-scoring.ts` | **100%** | 変更なし |
| `src/reinfo/merge-disaster-scoring.ts` | `core/src/reinfo/merge-disaster-scoring.ts` | **100%** | 変更なし |
| `src/report/narrative.ts` | `core/src/narrative/index.ts` | **100%** | 変更なし |
| `src/report/templates/charts/colors.ts` | `core/src/charts/colors.ts` | **100%** | 変更なし |

#### CLI パッケージに残す

| 現在のパス | 移行先 | 理由 |
|-----------|--------|------|
| `src/cli.ts` | `cli/src/cli.ts` | CLI 固有のコマンド定義 |
| `src/config/` | `cli/src/config/` | CLI ローカル設定（`estat.config.json`） |
| `src/estat/cache.ts` | `cli/src/cache/estat-cache.ts` | ファイルベースキャッシュ（CLI専用） |
| `src/reinfo/cache.ts` | `cli/src/cache/reinfo-cache.ts` | ファイルベースキャッシュ（CLI専用） |
| `src/report/pdf.ts` | `cli/src/report/pdf.ts` | Playwright PDF生成（CLI/M3以降Web） |
| `src/report/html.ts` | `cli/src/report/html.ts` | 基本レポートHTML |
| `src/report/templates/` | `cli/src/report/templates/` | SVGチャート含む全テンプレート |
| `src/mesh/` | `cli/src/mesh/` | メッシュ統計（M3以降Web化） |
| `src/station/` | `cli/src/station/` | 駅圏分析（M3以降Web化） |
| `src/geo/` | `cli/src/geo/` | 地理情報 |
| `src/normalize/` | `cli/src/normalize/` | カナ・ラベル正規化 |
| `src/interactive/` | `cli/src/interactive/` | TTY依存のインタラクティブUI |

### 8.2 移行の原則

1. **importパス変更のみ**: ロジック改変は最小限（`CliError` → `AppError` 程度）
2. **テスト同時移行**: テストファイルも対応パッケージに移動し、カバレッジ80%を維持
3. **CLIの動作保証**: モノレポ化後に `npm run dev -- report --cities "世田谷区"` が同一動作することを確認

---

## 9. 非機能要件

### 9.1 SEO最適化

**ISR + 動的メタデータ**:
```typescript
// app/report/[id]/page.tsx
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const report = await getReport(params.id);
  const cities = report.cities.join(" vs ");
  return {
    title: `${cities} 比較レポート | 街比較`,
    description: `${cities}の住みやすさを政府統計ベースで多角的に比較。`,
    openGraph: {
      images: [`/api/og?cities=${encodeURIComponent(cities)}`],
    },
  };
}

export const revalidate = 86400; // 24時間 ISR
```

**OGP画像自動生成**:
- `@vercel/og`（Satori）でレーダーチャート + ランキングの OGP 画像を動的生成
- 既存 `colors.ts` のカラーパレットを使用して一貫したブランディング

**sitemap.xml**:
- `app/sitemap.ts` で生成済みレポートの URL を自動列挙

### 9.2 パフォーマンス目標

| 指標 | 目標値 |
|------|--------|
| LCP (Largest Contentful Paint) | < 2.5秒 |
| FID (First Input Delay) | < 100ms |
| CLS (Cumulative Layout Shift) | < 0.1 |
| レポート生成 API 応答時間 | < 10秒 |
| 都市名検索 API 応答時間 | < 300ms |

### 9.3 セキュリティ

| 項目 | 対策 |
|------|------|
| APIキー管理 | Vercel 環境変数（`ESTAT_APP_ID`, `REINFO_API_KEY`）。クライアントに露出しない |
| 認証 | Supabase Auth + RLS。Route Handlers で `auth.uid()` を検証 |
| CORS | Next.js デフォルト（同一オリジン） |
| レート制限 | アプリ層で `usage_records` による利用量チェック |
| SQLインジェクション | Supabase クライアントのパラメタライズドクエリ |
| XSS | React のデフォルトエスケープ + CSP ヘッダー |
| CSRF | SameSite=Lax Cookie（Supabase Auth デフォルト） |
| Stripe Webhook | `stripe.webhooks.constructEvent()` で署名検証 |

### 9.4 監視・ログ

**MVP段階**:
- Vercel Analytics（Core Web Vitals 自動計測）
- Vercel Logs（API 応答時間、エラー率）
- Sentry（JavaScript エラー監視、無料プラン）

### 9.5 環境変数

```bash
# .env.example
# e-Stat API
ESTAT_APP_ID=

# 不動産情報ライブラリ API
REINFO_API_KEY=

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# Standard プラン Price ID
STRIPE_PRICE_STANDARD=

# Premium プラン Price ID
STRIPE_PRICE_PREMIUM=
```

---

## 10. 実装ロードマップ（8週間）

### Week 1: モノレポ基盤

- [ ] Turborepo + pnpm workspaces 初期設定
- [ ] `tsconfig.base.json` 共有設定
- [ ] `@estat/core` パッケージ骨格作成
- [ ] `scoring/` (7ファイル) の移行 + テスト通過確認
- [ ] `types.ts`, `errors.ts`, `utils.ts` の移行

### Week 2: core完成 + Next.js骨格

- [ ] `estat/`, `reinfo/` の core 移行
- [ ] `narrative/`, `charts/colors.ts` の core 移行
- [ ] `CacheAdapter` インターフェース定義 + CLI のファイルベース実装
- [ ] CLI パッケージの import 先変更 + **全テスト通過確認**
- [ ] Next.js 15 プロジェクト作成
- [ ] shadcn/ui + Tailwind CSS v4 セットアップ
- [ ] Supabase プロジェクト作成 + DB マイグレーション

### Week 3: API + 認証

- [ ] `GET /api/cities/search` 実装
- [ ] `POST /api/reports` 実装（core パイプライン呼び出し）
- [ ] `GET /api/reports/[id]` 実装
- [ ] `GET /api/usage` 実装
- [ ] Supabase Auth 統合（ログイン/ログアウト/セッション管理）
- [ ] 認証ミドルウェア実装
- [ ] Supabase キャッシュアダプタ実装

### Week 4: フロントエンド - メイン画面

- [ ] トップページ: CitySearch（オートコンプリート）
- [ ] Recharts コンポーネント: RadarChart, BarChart
- [ ] ScoreGauge（カスタム SVG）
- [ ] レポート表示ページ: ScoreSummary, IndicatorDashboard, CityDetail
- [ ] NarrativeBlock（core の `generateComparisonNarrative` 呼び出し）
- [ ] Disclaimer

### Week 5: 決済 + 利用量管理

- [ ] Stripe 統合: Checkout Session 作成 API
- [ ] Stripe Webhook: subscription イベント処理
- [ ] 利用量追跡: `usage_records` インクリメント
- [ ] 無料プラン制限（月3件）のガード実装
- [ ] 料金プランページ
- [ ] Stripe Customer Portal 連携

### Week 6: ダッシュボード + 仕上げ

- [ ] ユーザーダッシュボード（利用履歴、プラン情報）
- [ ] レスポンシブ対応
- [ ] エラーハンドリング（API失敗時のフォールバック表示）
- [ ] ローディング状態（Skeleton コンポーネント）
- [ ] 404 / エラーページ

### Week 7: SEO + テスト

- [ ] `generateMetadata` 実装（全ページ）
- [ ] OGP 画像生成（`@vercel/og`）
- [ ] `sitemap.xml` 自動生成
- [ ] E2E テスト（Playwright）: レポート生成フロー、認証フロー
- [ ] API テスト（Vitest）: 全 Route Handler
- [ ] core パッケージテスト: カバレッジ80%確認

### Week 8: QA + デプロイ

- [ ] クロスブラウザテスト（Chrome, Safari, Firefox）
- [ ] パフォーマンスチューニング（Core Web Vitals）
- [ ] Vercel デプロイ設定（環境変数、ドメイン）
- [ ] Supabase 本番設定
- [ ] Sentry 統合
- [ ] ドキュメント更新

---

## 11. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|---------|------|
| Vercel Functions タイムアウト（Free: 10秒） | 高 | 中 | Vercel Pro（60秒）を使用。5都市比較は非同期化を検討 |
| e-Stat API レート制限 | 中 | 中 | 既存のリトライ・バックオフを継続活用。キャッシュ層で呼び出し回数削減 |
| モノレポ移行時のテスト破損 | 高 | 低 | Week 1-2 で全テスト通過を確認してから Web 実装に着手 |
| Supabase 無料枠超過 | 低 | 低 | MVP規模では十分（50K MAU, 500MB DB） |
| 不動産情報ライブラリ API の商用利用可否 | 高 | 中 | **MVP開始前に利用規約確認 + 問い合わせ必須** |
| API応答遅延（複数Phase直列実行） | 中 | 中 | Phase間の並列化を検討。ただしMVPでは直列で十分な速度 |

---

## 付録A: 主要な型定義（@estat/core からの re-export）

Web API のレスポンス型は `@estat/core` の型をそのまま使用する。

```typescript
// @estat/core/src/scoring/types.ts より

/** 都市ごとの全指標データ（API入力） */
interface CityIndicators {
  readonly cityName: string;
  readonly areaCode: string;
  readonly indicators: ReadonlyArray<IndicatorValue>;
}

/** 都市ごとの総合スコア結果（APIレスポンス） */
interface CityScoreResult {
  readonly cityName: string;
  readonly areaCode: string;
  readonly baseline: ReadonlyArray<BaselineScore>;
  readonly choice: ReadonlyArray<ChoiceScore>;
  readonly compositeScore: number;
  readonly confidence: ConfidenceResult;
  readonly rank: number;
  readonly notes: ReadonlyArray<string>;
}

/** 指標のメタ定義 */
interface IndicatorDefinition {
  readonly id: string;
  readonly label: string;
  readonly unit: string;
  readonly direction: "higher_better" | "lower_better";
  readonly category: IndicatorCategory;
  readonly precision: number;
}

/** 重みプリセット */
interface WeightPreset {
  readonly name: string;
  readonly label: string;
  readonly weights: Readonly<Record<IndicatorCategory, number>>;
}
```

## 付録B: ScoredReportModel（CLIとの共通データモデル）

```typescript
// 既存 src/report/templates/compose.ts の ScoredReportModel をWeb版でも使用

interface ScoredReportModel {
  readonly title: string;
  readonly generatedAt: string;
  readonly cities: ReadonlyArray<string>;
  readonly statsDataId: string;
  readonly timeLabel: string;
  readonly preset: WeightPreset;
  readonly results: ReadonlyArray<CityScoreResult>;
  readonly definitions: ReadonlyArray<IndicatorDefinition>;
  readonly rawRows: ReadonlyArray<ReportRow>;
  readonly hasPriceData?: boolean;
  readonly propertyTypeLabel?: string;
  readonly budgetLimit?: number;
  readonly hasCrimeData?: boolean;
  readonly hasDisasterData?: boolean;
}
```

このモデルは `reports` テーブルの `result_json` カラムに保存され、レポート表示ページの Props として使用される。
