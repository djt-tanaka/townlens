import { describe, it, expect, vi, beforeEach } from "vitest";

// vi.hoisted でモック変数を先に宣言（vi.mock ホイスティング対応）
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

import { GET } from "@/app/api/usage/route";
import { requireAuth } from "@/lib/auth";

describe("GET /api/usage", () => {
  const mockUser = { id: "user-123", email: "test@example.com" };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  function createMockSupabase(profilePlan: string, reportCount: number | null) {
    let queryCount = 0;
    const mockSingle = vi.fn().mockImplementation(() => {
      queryCount++;
      if (queryCount === 1) {
        return Promise.resolve({
          data: { plan: profilePlan },
          error: null,
        });
      }
      if (reportCount === null) {
        return Promise.resolve({
          data: null,
          error: { message: "not found" },
        });
      }
      return Promise.resolve({
        data: { report_count: reportCount },
        error: null,
      });
    });

    return {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({ single: mockSingle }),
            single: mockSingle,
          }),
        }),
      }),
    };
  }

  it("未認証の場合に 401 を返す", async () => {
    vi.mocked(requireAuth).mockResolvedValue(
      MockNextResponse.json({ error: "認証が必要です" }, { status: 401 }) as any,
    );

    const response = await GET();
    expect(response.status).toBe(401);
  });

  it("認証済みユーザーの利用量を返す", async () => {
    vi.mocked(requireAuth).mockResolvedValue({
      user: mockUser as any,
      supabase: createMockSupabase("free", 2) as any,
    });

    const response = await GET();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.plan).toBe("free");
    expect(body.currentMonth.reportsGenerated).toBe(2);
    expect(body.currentMonth.reportsLimit).toBe(100);
  });

  it("利用量レコードがない場合は 0 件を返す", async () => {
    vi.mocked(requireAuth).mockResolvedValue({
      user: mockUser as any,
      supabase: createMockSupabase("standard", null) as any,
    });

    const response = await GET();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.plan).toBe("standard");
    expect(body.currentMonth.reportsGenerated).toBe(0);
    expect(body.currentMonth.reportsLimit).toBeNull();
  });
});
