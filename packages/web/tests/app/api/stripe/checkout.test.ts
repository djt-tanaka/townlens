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

vi.mock("@/lib/auth", () => ({
  requireAuth: vi.fn(),
}));

const mockCheckoutCreate = vi.fn();

vi.mock("@/lib/stripe", () => ({
  getStripeClient: () => ({
    checkout: { sessions: { create: mockCheckoutCreate } },
  }),
  resolvePlanFromPriceId: (priceId: string) => {
    if (priceId === "price_standard") return "standard";
    if (priceId === "price_premium") return "premium";
    return null;
  },
}));

const mockAdminFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: mockAdminFrom,
  }),
}));

import { POST } from "@/app/api/stripe/checkout/route";
import { requireAuth } from "@/lib/auth";

describe("POST /api/stripe/checkout", () => {
  const mockUser = { id: "user-123", email: "test@example.com" };

  function createRequest(body: unknown) {
    return new Request("http://localhost:3000/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  function setupAdminMock(profile: { stripe_customer_id: string | null; plan: string } | null) {
    mockAdminFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: profile,
            error: profile ? null : { message: "not found" },
          }),
        }),
      }),
    });
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("未認証の場合に 401 を返す", async () => {
    vi.mocked(requireAuth).mockResolvedValue(
      MockNextResponse.json({ error: "認証が必要です" }, { status: 401 }) as any,
    );

    const response = await POST(createRequest({ priceId: "price_standard" }));
    expect(response.status).toBe(401);
  });

  it("priceId が空の場合に 400 を返す", async () => {
    vi.mocked(requireAuth).mockResolvedValue({
      user: mockUser as any,
      supabase: {} as any,
    });

    const response = await POST(createRequest({ priceId: "" }));
    expect(response.status).toBe(400);
  });

  it("無効な priceId の場合に 400 を返す", async () => {
    vi.mocked(requireAuth).mockResolvedValue({
      user: mockUser as any,
      supabase: {} as any,
    });

    const response = await POST(createRequest({ priceId: "price_invalid" }));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("無効な Price ID");
  });

  it("既に有料プランの場合に 400 を返す", async () => {
    vi.mocked(requireAuth).mockResolvedValue({
      user: mockUser as any,
      supabase: {} as any,
    });
    setupAdminMock({ stripe_customer_id: "cus_123", plan: "standard" });

    const response = await POST(createRequest({ priceId: "price_standard" }));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("有料プランに加入済み");
  });

  it("正常系: Checkout Session URL を返す", async () => {
    vi.mocked(requireAuth).mockResolvedValue({
      user: mockUser as any,
      supabase: {} as any,
    });
    setupAdminMock({ stripe_customer_id: null, plan: "free" });
    mockCheckoutCreate.mockResolvedValue({
      url: "https://checkout.stripe.com/session_123",
    });

    const response = await POST(createRequest({ priceId: "price_standard" }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.url).toBe("https://checkout.stripe.com/session_123");
  });

  it("既存の stripe_customer_id がある場合は customer パラメータを使用する", async () => {
    vi.mocked(requireAuth).mockResolvedValue({
      user: mockUser as any,
      supabase: {} as any,
    });
    setupAdminMock({ stripe_customer_id: "cus_existing", plan: "free" });
    mockCheckoutCreate.mockResolvedValue({
      url: "https://checkout.stripe.com/session_456",
    });

    await POST(createRequest({ priceId: "price_standard" }));

    expect(mockCheckoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({ customer: "cus_existing" }),
    );
  });
});
