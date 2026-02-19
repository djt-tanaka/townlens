import { describe, it, expect, vi, beforeEach } from "vitest";

// Stripe コンストラクタをモック（new で呼ばれるため class で定義）
vi.mock("stripe", () => {
  const MockStripe = vi.fn().mockImplementation(function () {
    return { mock: true };
  });
  // class として扱えるようプロトタイプを設定
  Object.defineProperty(MockStripe, Symbol.hasInstance, {
    value: () => true,
  });
  return { default: MockStripe };
});

describe("stripe utilities", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  describe("getStripeClient", () => {
    it("STRIPE_SECRET_KEY がない場合はエラーをスローする", async () => {
      vi.stubEnv("STRIPE_SECRET_KEY", "");
      const { getStripeClient } = await import("@/lib/stripe");
      expect(() => getStripeClient()).toThrow("STRIPE_SECRET_KEY");
    });

    it("有効なキーがある場合はクライアントを返す", async () => {
      vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_123");
      const { getStripeClient } = await import("@/lib/stripe");
      const client = getStripeClient();
      expect(client).toBeDefined();
    });

    it("シングルトンとして同一インスタンスを返す", async () => {
      vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_123");
      const { getStripeClient } = await import("@/lib/stripe");
      const first = getStripeClient();
      const second = getStripeClient();
      expect(first).toBe(second);
    });
  });

  describe("getWebhookSecret", () => {
    it("STRIPE_WEBHOOK_SECRET がない場合はエラーをスローする", async () => {
      vi.stubEnv("STRIPE_WEBHOOK_SECRET", "");
      const { getWebhookSecret } = await import("@/lib/stripe");
      expect(() => getWebhookSecret()).toThrow("STRIPE_WEBHOOK_SECRET");
    });

    it("設定済みの場合はシークレットを返す", async () => {
      vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_test");
      const { getWebhookSecret } = await import("@/lib/stripe");
      expect(getWebhookSecret()).toBe("whsec_test");
    });
  });

  describe("getPriceIds", () => {
    it("両方の Price ID がない場合はエラーをスローする", async () => {
      vi.stubEnv("STRIPE_PRICE_STANDARD", "");
      vi.stubEnv("STRIPE_PRICE_PREMIUM", "");
      const { getPriceIds } = await import("@/lib/stripe");
      expect(() => getPriceIds()).toThrow("STRIPE_PRICE_STANDARD");
    });

    it("STANDARD だけ欠けている場合もエラー", async () => {
      vi.stubEnv("STRIPE_PRICE_STANDARD", "");
      vi.stubEnv("STRIPE_PRICE_PREMIUM", "price_premium_123");
      const { getPriceIds } = await import("@/lib/stripe");
      expect(() => getPriceIds()).toThrow("STRIPE_PRICE_STANDARD");
    });

    it("PREMIUM だけ欠けている場合もエラー", async () => {
      vi.stubEnv("STRIPE_PRICE_STANDARD", "price_standard_123");
      vi.stubEnv("STRIPE_PRICE_PREMIUM", "");
      const { getPriceIds } = await import("@/lib/stripe");
      expect(() => getPriceIds()).toThrow("STRIPE_PRICE_STANDARD");
    });

    it("両方設定済みの場合は Price ID を返す", async () => {
      vi.stubEnv("STRIPE_PRICE_STANDARD", "price_std");
      vi.stubEnv("STRIPE_PRICE_PREMIUM", "price_prm");
      const { getPriceIds } = await import("@/lib/stripe");
      expect(getPriceIds()).toEqual({
        standard: "price_std",
        premium: "price_prm",
      });
    });
  });

  describe("resolvePlanFromPriceId", () => {
    it("standard の Price ID を解決する", async () => {
      vi.stubEnv("STRIPE_PRICE_STANDARD", "price_std");
      vi.stubEnv("STRIPE_PRICE_PREMIUM", "price_prm");
      const { resolvePlanFromPriceId } = await import("@/lib/stripe");
      expect(resolvePlanFromPriceId("price_std")).toBe("standard");
    });

    it("premium の Price ID を解決する", async () => {
      vi.stubEnv("STRIPE_PRICE_STANDARD", "price_std");
      vi.stubEnv("STRIPE_PRICE_PREMIUM", "price_prm");
      const { resolvePlanFromPriceId } = await import("@/lib/stripe");
      expect(resolvePlanFromPriceId("price_prm")).toBe("premium");
    });

    it("不明な Price ID は null を返す", async () => {
      vi.stubEnv("STRIPE_PRICE_STANDARD", "price_std");
      vi.stubEnv("STRIPE_PRICE_PREMIUM", "price_prm");
      const { resolvePlanFromPriceId } = await import("@/lib/stripe");
      expect(resolvePlanFromPriceId("price_unknown")).toBeNull();
    });
  });
});
