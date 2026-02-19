import { describe, it, expect, vi, beforeEach } from "vitest";

const { MockNextResponse } = vi.hoisted(() => {
  class MockNextResponse {
    status: number;
    _data: unknown;
    constructor(data: unknown, status: number) {
      this._data = data;
      this.status = status;
    }
    async json() {
      return this._data;
    }
    static json(data: unknown, init?: { status?: number }) {
      return new MockNextResponse(data, init?.status ?? 200);
    }
  }
  return { MockNextResponse };
});

vi.mock("next/server", () => ({
  NextResponse: MockNextResponse,
}));

const mockConstructEvent = vi.fn();
const mockSubscriptionsRetrieve = vi.fn();

vi.mock("@/lib/stripe", () => ({
  getStripeClient: () => ({
    webhooks: { constructEvent: mockConstructEvent },
    subscriptions: { retrieve: mockSubscriptionsRetrieve },
  }),
  getWebhookSecret: () => "whsec_test",
  resolvePlanFromPriceId: (priceId: string) => {
    if (priceId === "price_standard") return "standard";
    if (priceId === "price_premium") return "premium";
    return null;
  },
}));

const mockEq = vi.fn().mockResolvedValue({ data: null, error: null });
const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: vi.fn().mockReturnValue({
      update: mockUpdate,
    }),
  }),
}));

import { POST } from "@/app/api/stripe/webhook/route";

describe("POST /api/stripe/webhook", () => {
  function createRequest(body: string, signature: string | null) {
    const headers: Record<string, string> = {};
    if (signature) {
      headers["stripe-signature"] = signature;
    }
    return new Request("http://localhost:3000/api/stripe/webhook", {
      method: "POST",
      headers,
      body,
    });
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("署名がない場合に 400 を返す", async () => {
    const response = await POST(createRequest("{}", null));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("署名");
  });

  it("署名検証に失敗した場合に 400 を返す", async () => {
    mockConstructEvent.mockImplementation(() => {
      throw new Error("Invalid signature");
    });

    const response = await POST(createRequest("{}", "sig_invalid"));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("署名検証エラー");
  });

  it("checkout.session.completed でプランを更新する", async () => {
    mockConstructEvent.mockReturnValue({
      type: "checkout.session.completed",
      data: {
        object: {
          metadata: { user_id: "user-123" },
          customer: "cus_123",
          subscription: "sub_123",
        },
      },
    });
    mockSubscriptionsRetrieve.mockResolvedValue({
      items: { data: [{ price: { id: "price_standard" } }] },
    });

    const response = await POST(createRequest("{}", "sig_valid"));
    expect(response.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        stripe_customer_id: "cus_123",
        stripe_subscription_id: "sub_123",
        plan: "standard",
      }),
    );
  });

  it("customer.subscription.updated で active なプランを反映する", async () => {
    mockConstructEvent.mockReturnValue({
      type: "customer.subscription.updated",
      data: {
        object: {
          metadata: { user_id: "user-123" },
          status: "active",
          items: { data: [{ price: { id: "price_premium" } }] },
        },
      },
    });

    const response = await POST(createRequest("{}", "sig_valid"));
    expect(response.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ plan: "premium" }),
    );
  });

  it("customer.subscription.updated で active でない場合は free に戻す", async () => {
    mockConstructEvent.mockReturnValue({
      type: "customer.subscription.updated",
      data: {
        object: {
          metadata: { user_id: "user-123" },
          status: "past_due",
          items: { data: [{ price: { id: "price_standard" } }] },
        },
      },
    });

    const response = await POST(createRequest("{}", "sig_valid"));
    expect(response.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ plan: "free" }),
    );
  });

  it("customer.subscription.deleted で free に戻す", async () => {
    mockConstructEvent.mockReturnValue({
      type: "customer.subscription.deleted",
      data: {
        object: {
          metadata: { user_id: "user-123" },
          items: { data: [{ price: { id: "price_standard" } }] },
        },
      },
    });

    const response = await POST(createRequest("{}", "sig_valid"));
    expect(response.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        plan: "free",
        stripe_subscription_id: null,
      }),
    );
  });

  it("未対応イベントでも 200 を返す", async () => {
    mockConstructEvent.mockReturnValue({
      type: "invoice.payment_succeeded",
      data: { object: {} },
    });

    const response = await POST(createRequest("{}", "sig_valid"));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.received).toBe(true);
  });

  it("customer.subscription.updated で trialing を active として扱う", async () => {
    mockConstructEvent.mockReturnValue({
      type: "customer.subscription.updated",
      data: {
        object: {
          metadata: { user_id: "user-123" },
          status: "trialing",
          items: { data: [{ price: { id: "price_premium" } }] },
        },
      },
    });

    const response = await POST(createRequest("{}", "sig_valid"));
    expect(response.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ plan: "premium" }),
    );
  });

  it("ビジネスロジックエラー（metadata 欠落）でも 200 を返す", async () => {
    mockConstructEvent.mockReturnValue({
      type: "checkout.session.completed",
      data: {
        object: {
          metadata: {},
          customer: "cus_123",
          subscription: "sub_123",
        },
      },
    });

    const response = await POST(createRequest("{}", "sig_valid"));
    expect(response.status).toBe(200);
  });

  it("DB 更新エラーの場合は 500 を返す", async () => {
    mockConstructEvent.mockReturnValue({
      type: "checkout.session.completed",
      data: {
        object: {
          metadata: { user_id: "user-123" },
          customer: "cus_123",
          subscription: "sub_123",
        },
      },
    });
    mockSubscriptionsRetrieve.mockResolvedValue({
      items: { data: [{ price: { id: "price_standard" } }] },
    });
    mockEq.mockResolvedValueOnce({
      data: null,
      error: { message: "DB connection lost" },
    });

    const response = await POST(createRequest("{}", "sig_valid"));
    expect(response.status).toBe(500);
  });
});
