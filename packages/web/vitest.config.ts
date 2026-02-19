import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    include: ["tests/**/*.test.{ts,tsx}"],
    environment: "jsdom",
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/types/**/*.ts",
        "src/app/**/layout.tsx",
        "src/app/**/page.tsx",
        "src/app/**/loading.tsx",
        "src/app/**/error.tsx",
        "src/app/**/global-error.tsx",
        "src/app/**/not-found.tsx",
        // エラー表示共通コンポーネント（error.tsx から利用、E2E で検証）
        "src/components/error/**/*.tsx",
        // Supabase クライアント・ミドルウェアは外部依存が強く単体テスト対象外
        "src/lib/supabase/client.ts",
        "src/lib/supabase/server.ts",
        "src/lib/supabase/admin.ts",
        "src/lib/supabase/middleware.ts",
        "src/middleware.ts",
        "src/app/auth/callback/route.ts",
        // Recharts ラッパーコンポーネントは描画テスト困難
        "src/components/report/radar-chart.tsx",
        "src/components/report/bar-chart.tsx",
        // shadcn/ui 自動生成コンポーネント
        "src/components/ui/**/*.tsx",
        // Client Components（認証フォーム、検索UI等）は E2E テストで検証
        "src/components/auth/**/*.tsx",
        "src/components/search/**/*.tsx",
        "src/components/report/city-detail.tsx",
        // 表示専用 Server Components（ロジックなし、E2E で検証）
        "src/components/layout/**/*.tsx",
        "src/components/dashboard/*.tsx",
        "src/components/report/narrative-block.tsx",
        "src/components/report/disclaimer.tsx",
        "src/components/report/score-summary.tsx",
        "src/components/report/indicator-dashboard.tsx",
      ],
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
    },
  },
});
