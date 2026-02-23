import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // 開発環境では無効化
  enabled: process.env.NODE_ENV === "production",

  environment: process.env.NODE_ENV,

  tracesSampleRate: 0.1,

  // PII を送信しない
  sendDefaultPii: false,
});
