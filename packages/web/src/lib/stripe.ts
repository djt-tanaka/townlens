/**
 * Stripe サーバーサイドユーティリティ。
 * Route Handlers でのみ使用すること。
 */

import Stripe from "stripe";

/** Stripe クライアントのシングルトン */
let stripeInstance: Stripe | null = null;

export function getStripeClient(): Stripe {
  if (stripeInstance) return stripeInstance;

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY の設定が必要です");
  }

  stripeInstance = new Stripe(secretKey, {
    typescript: true,
  });

  return stripeInstance;
}

/** Stripe Webhook シークレット取得 */
export function getWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error("STRIPE_WEBHOOK_SECRET の設定が必要です");
  }
  return secret;
}

/** Price ID の一覧（環境変数から取得） */
export function getPriceIds(): {
  readonly standard: string;
  readonly premium: string;
} {
  const standard = process.env.STRIPE_PRICE_STANDARD;
  const premium = process.env.STRIPE_PRICE_PREMIUM;

  if (!standard || !premium) {
    throw new Error(
      "STRIPE_PRICE_STANDARD と STRIPE_PRICE_PREMIUM の設定が必要です",
    );
  }

  return { standard, premium };
}

/** Price ID からプラン名を逆引き */
export function resolvePlanFromPriceId(
  priceId: string,
): "standard" | "premium" | null {
  const prices = getPriceIds();
  if (priceId === prices.standard) return "standard";
  if (priceId === prices.premium) return "premium";
  return null;
}
