/**
 * POST /api/stripe/portal
 * Stripe Customer Portal のセッションを作成し、URL を返す。
 * 認証必須。有料プランユーザーのみ。
 */

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripeClient } from "@/lib/stripe";
import { errorResponse, handleApiError } from "@/lib/api-utils";
import type { PortalResponse } from "@/types";

export async function POST(request: Request) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const { user } = authResult;

    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single();

    if (!profile?.stripe_customer_id) {
      return errorResponse(
        "Stripe カスタマー情報が見つかりません。まず有料プランに加入してください。",
        400,
      );
    }

    const stripe = getStripeClient();
    const { origin } = new URL(request.url);

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${origin}/dashboard`,
    });

    const response: PortalResponse = { url: portalSession.url };
    return NextResponse.json(response);
  } catch (error) {
    return handleApiError(error);
  }
}
