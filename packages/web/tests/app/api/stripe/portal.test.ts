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

const mockPortalCreate = vi.fn();

vi.mock("@/lib/stripe", () => ({
  getStripeClient: () => ({
    billingPortal: { sessions: { create: mockPortalCreate } },
  }),
}));

const mockAdminFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: mockAdminFrom,
  }),
}));

import { POST } from "@/app/api/stripe/portal/route";
import { requireAuth } from "@/lib/auth";

describe("POST /api/stripe/portal", () => {
  const mockUser = { id: "user-123", email: "test@example.com" };

  function createRequest() {
    return new Request("http://localhost:3000/api/stripe/portal", {
      method: "POST",
    });
  }

  function setupAdminMock(stripeCustomerId: string | null) {
    mockAdminFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: stripeCustomerId
              ? { stripe_customer_id: stripeCustomerId }
              : null,
            error: stripeCustomerId ? null : { message: "not found" },
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

    const response = await POST(createRequest());
    expect(response.status).toBe(401);
  });

  it("stripe_customer_id がない場合に 400 を返す", async () => {
    vi.mocked(requireAuth).mockResolvedValue({
      user: mockUser as any,
      supabase: {} as any,
    });
    setupAdminMock(null);

    const response = await POST(createRequest());
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("Stripe カスタマー情報");
  });

  it("正常系: Portal URL を返す", async () => {
    vi.mocked(requireAuth).mockResolvedValue({
      user: mockUser as any,
      supabase: {} as any,
    });
    setupAdminMock("cus_123");
    mockPortalCreate.mockResolvedValue({
      url: "https://billing.stripe.com/portal_123",
    });

    const response = await POST(createRequest());
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.url).toBe("https://billing.stripe.com/portal_123");
  });
});
