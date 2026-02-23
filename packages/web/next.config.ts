import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  transpilePackages: ["@townlens/core"],
  serverExternalPackages: ["axios"],
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // ソースマップ: アップロード後に本番ビルドから削除
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },

  // CI 以外ではアップロードログを抑制
  silent: !process.env.CI,
});
