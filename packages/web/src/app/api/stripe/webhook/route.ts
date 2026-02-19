/**
 * POST /api/stripe/webhook
 * Stripe からのイベントを受信し、プラン情報を更新する。
 * 署名検証で認証（Supabase Auth は不要）。
 */

import { NextResponse } from "next/server";
import type Stripe from "stripe";
import {
  getStripeClient,
  getWebhookSecret,
  resolvePlanFromPriceId,
} from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/** DB 更新失敗を区別するためのエラークラス */
class DatabaseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DatabaseError";
  }
}

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Stripe 署名がありません" },
      { status: 400 },
    );
  }

  const stripe = getStripeClient();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      getWebhookSecret(),
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "署名検証に失敗しました";
    return NextResponse.json(
      { error: `Webhook 署名検証エラー: ${message}` },
      { status: 400 },
    );
  }

  const admin = createAdminClient();

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(
          admin,
          event.data.object as Stripe.Checkout.Session,
          stripe,
        );
        break;

      case "customer.subscription.updated":
        await handleSubscriptionUpdated(
          admin,
          event.data.object as Stripe.Subscription,
        );
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(
          admin,
          event.data.object as Stripe.Subscription,
        );
        break;

      default:
        break;
    }
  } catch (error) {
    // DB エラーは 500 を返して Stripe にリトライさせる
    if (error instanceof DatabaseError) {
      return NextResponse.json(
        { error: "データベース更新に失敗しました" },
        { status: 500 },
      );
    }
    // ビジネスロジックエラー（metadata 欠落等）はリトライしても解決しないため 200
  }

  return NextResponse.json({ received: true });
}

/** Stripe オブジェクトから文字列 ID を安全に取り出す */
function resolveId(value: string | { id: string } | null | undefined): string | null {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "id" in value) return value.id;
  return null;
}

/** checkout.session.completed: Customer ID とプランを設定 */
async function handleCheckoutCompleted(
  admin: ReturnType<typeof createAdminClient>,
  session: Stripe.Checkout.Session,
  stripe: Stripe,
) {
  const userId = session.metadata?.user_id;
  if (!userId) {
    throw new Error("Checkout Session に user_id メタデータがありません");
  }

  const customerId = resolveId(session.customer);
  const subscriptionId = resolveId(session.subscription);

  if (!customerId || !subscriptionId) {
    throw new Error("Checkout Session に customer/subscription がありません");
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const priceId = subscription.items.data[0]?.price.id;
  const plan = priceId ? resolvePlanFromPriceId(priceId) : null;

  if (!plan) {
    throw new Error(`不明な Price ID: ${priceId}`);
  }

  const { error } = await admin
    .from("profiles")
    .update({
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      plan,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (error) {
    throw new DatabaseError(`プロフィール更新失敗: ${error.message}`);
  }
}

/** customer.subscription.updated: プラン変更を反映 */
async function handleSubscriptionUpdated(
  admin: ReturnType<typeof createAdminClient>,
  subscription: Stripe.Subscription,
) {
  const userId = subscription.metadata?.user_id;
  if (!userId) {
    throw new Error("Subscription に user_id メタデータがありません");
  }

  const priceId = subscription.items.data[0]?.price.id;
  const plan = priceId ? resolvePlanFromPriceId(priceId) : null;

  if (!plan) {
    throw new Error(`不明な Price ID: ${priceId}`);
  }

  // active/trialing 以外（past_due, canceled 等）は free に戻す
  const isActive =
    subscription.status === "active" || subscription.status === "trialing";
  const effectivePlan = isActive ? plan : "free";

  const { error } = await admin
    .from("profiles")
    .update({
      plan: effectivePlan,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (error) {
    throw new DatabaseError(`プロフィール更新失敗: ${error.message}`);
  }
}

/** customer.subscription.deleted: プランを free に戻す */
async function handleSubscriptionDeleted(
  admin: ReturnType<typeof createAdminClient>,
  subscription: Stripe.Subscription,
) {
  const userId = subscription.metadata?.user_id;
  if (!userId) {
    throw new Error("Subscription に user_id メタデータがありません");
  }

  const { error } = await admin
    .from("profiles")
    .update({
      plan: "free" as const,
      stripe_subscription_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (error) {
    throw new DatabaseError(`プロフィール更新失敗: ${error.message}`);
  }
}
