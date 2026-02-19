/**
 * POST /api/stripe/checkout
 * Stripe Checkout Session を作成し、リダイレクト URL を返す。
 * 認証必須。
 */

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripeClient, resolvePlanFromPriceId } from "@/lib/stripe";
import { checkoutSchema } from "@/lib/validations";
import { errorResponse, handleApiError } from "@/lib/api-utils";
import type { CheckoutResponse } from "@/types";

export async function POST(request: Request) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const { user } = authResult;

    const body = await request.json();
    const parsed = checkoutSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(
        parsed.error.issues[0]?.message ?? "バリデーションエラー",
        400,
      );
    }

    const { priceId } = parsed.data;

    // Price ID の妥当性チェック
    const plan = resolvePlanFromPriceId(priceId);
    if (!plan) {
      return errorResponse("無効な Price ID です", 400);
    }

    // プロファイル取得（既存 stripe_customer_id の確認）
    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("stripe_customer_id, plan")
      .eq("id", user.id)
      .single();

    // 既に有料プランの場合はブロック（Customer Portal で管理）
    if (profile?.plan === "standard" || profile?.plan === "premium") {
      return errorResponse(
        "既に有料プランに加入済みです。プラン変更は管理ポータルから行ってください。",
        400,
      );
    }

    const stripe = getStripeClient();
    const { origin } = new URL(request.url);

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      ...(profile?.stripe_customer_id
        ? { customer: profile.stripe_customer_id }
        : { customer_email: user.email ?? undefined }),
      metadata: { user_id: user.id },
      subscription_data: {
        metadata: { user_id: user.id },
      },
      success_url: `${origin}/dashboard?checkout=success`,
      cancel_url: `${origin}/pricing?checkout=cancelled`,
    });

    if (!session.url) {
      return errorResponse("Checkout セッションの作成に失敗しました", 500);
    }

    const response: CheckoutResponse = { url: session.url };
    return NextResponse.json(response);
  } catch (error) {
    return handleApiError(error);
  }
}
