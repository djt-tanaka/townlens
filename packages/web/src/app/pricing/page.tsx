/**
 * /pricing - 料金プランページ。
 * 認証不要だが、ログイン済みの場合は現在のプランをハイライトする。
 */

import type { Metadata } from "next";
import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { PlanCard } from "@/components/pricing/plan-card";
import { CheckoutButton } from "@/components/pricing/checkout-button";
import { PLAN_DEFINITIONS, type PlanDefinition } from "@/lib/pricing";

export const metadata: Metadata = {
  title: "料金プラン | TownLens",
  description:
    "TownLens の料金プラン。無料プランから始めて、必要に応じてアップグレード。",
};

export default async function PricingPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let currentPlan: string | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("plan")
      .eq("id", user.id)
      .single();
    currentPlan = profile?.plan ?? "free";
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-16">
      <div className="mb-12 text-center">
        <h1 className="text-3xl font-bold">料金プラン</h1>
        <p className="mt-3 text-muted-foreground">
          無料プランで始めて、必要に応じてアップグレードできます。
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-3">
        {PLAN_DEFINITIONS.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            currentPlan={currentPlan}
            action={renderAction(plan, currentPlan, user !== null)}
          />
        ))}
      </div>
    </main>
  );
}

function renderAction(
  plan: PlanDefinition,
  currentPlan: string | null,
  isLoggedIn: boolean,
): React.ReactNode {
  if (plan.id === "free") {
    if (!isLoggedIn) {
      return (
        <Button variant="outline" className="w-full" asChild>
          <Link href="/auth/login">無料で始める</Link>
        </Button>
      );
    }
    return (
      <Button variant="outline" className="w-full" disabled>
        現在のプラン
      </Button>
    );
  }

  if (!isLoggedIn) {
    return (
      <Button className="w-full" asChild>
        <Link href="/auth/login">ログインして申し込む</Link>
      </Button>
    );
  }

  if (currentPlan === plan.id) {
    return (
      <Button variant="outline" className="w-full" disabled>
        利用中
      </Button>
    );
  }

  // 既に他の有料プランに加入中
  if (currentPlan === "standard" || currentPlan === "premium") {
    return (
      <Button variant="outline" className="w-full" disabled>
        ポータルからプラン変更
      </Button>
    );
  }

  // フリープランからのアップグレード
  const priceId =
    plan.id === "standard"
      ? process.env.STRIPE_PRICE_STANDARD
      : process.env.STRIPE_PRICE_PREMIUM;

  if (!priceId) {
    return (
      <Button className="w-full" disabled>
        近日公開
      </Button>
    );
  }

  return <CheckoutButton priceId={priceId} label={plan.ctaLabel} />;
}
