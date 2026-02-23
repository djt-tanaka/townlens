import * as Sentry from "@sentry/nextjs";

// ページ遷移のパフォーマンストレースを有効化
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // 開発環境では無効化
  enabled: process.env.NODE_ENV === "production",

  environment: process.env.NODE_ENV,

  // パフォーマンスモニタリング: 本番は10%サンプリング
  tracesSampleRate: 0.1,

  // Session Replay: エラー発生時のみキャプチャ（コスト抑制）
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 1.0,

  integrations: [
    Sentry.replayIntegration({
      // PII をマスク（Supabase Auth のメールアドレス等を保護）
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  // PII を送信しない
  sendDefaultPii: false,

  beforeSend(event) {
    // ユーザーの個人情報を除去
    if (event.user) {
      return {
        ...event,
        user: { ...event.user, email: undefined, ip_address: undefined },
      };
    }
    return event;
  },
});
