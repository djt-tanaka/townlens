import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: [
        "src/types/**/*.ts",
        "src/app/**/layout.tsx",
        "src/app/**/page.tsx",
        // Supabase クライアント・ミドルウェアは外部依存が強く単体テスト対象外
        "src/lib/supabase/client.ts",
        "src/lib/supabase/server.ts",
        "src/lib/supabase/admin.ts",
        "src/lib/supabase/middleware.ts",
        "src/middleware.ts",
        "src/app/auth/callback/route.ts",
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
