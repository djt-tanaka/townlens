import { describe, it, expect, vi, beforeEach } from "vitest";

// vi.hoisted でモック変数を先に宣言（vi.mock ホイスティング対応）
const { mockAdminFrom, MockNextResponse } = vi.hoisted(() => {
  const mockAdminFrom = vi.fn();

  // instanceof チェックに対応する NextResponse クラス
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

  return { mockAdminFrom, MockNextResponse };
});

vi.mock("next/server", () => ({
  NextResponse: MockNextResponse,
}));

vi.mock("@/lib/auth", () => ({
  requireAuth: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn().mockReturnValue({
    from: mockAdminFrom,
  }),
}));

vi.mock("@/lib/report-pipeline", () => ({
  runReportPipeline: vi.fn().mockResolvedValue({
    results: [],
    definitions: [],
    rawRows: [],
    hasPriceData: false,
    hasCrimeData: false,
    hasDisasterData: false,
    preset: { name: "childcare", label: "子育て重視", weights: {} },
    timeLabel: "2024年",
    cities: ["世田谷区", "渋谷区"],
  }),
}));

vi.mock("@/lib/api-clients", () => ({
  createEstatClient: vi.fn().mockReturnValue({}),
  createReinfoClient: vi.fn().mockImplementation(() => {
    throw new Error("REINFOLIB_API_KEY 未設定");
  }),
}));

import { POST } from "@/app/api/reports/route";
import { requireAuth } from "@/lib/auth";

describe("POST /api/reports", () => {
  const validBody = {
    cities: ["世田谷区", "渋谷区"],
    preset: "childcare",
  };

  const mockUser = { id: "user-123", email: "test@example.com" };

  function createAuthSupabase() {
    const mockSingle = vi.fn().mockResolvedValue({
      data: { plan: "free" },
      error: null,
    });
    return {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: mockSingle,
          }),
        }),
      }),
    };
  }

  beforeEach(() => {
    vi.clearAllMocks();

    // admin クライアントのデフォルト設定
    mockAdminFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { report_count: 0 },
              error: null,
            }),
          }),
        }),
      }),
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: "report-123" },
            error: null,
          }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
      upsert: vi.fn().mockResolvedValue({ error: null }),
    });
  });

  it("未認証の場合に 401 を返す", async () => {
    vi.mocked(requireAuth).mockResolvedValue(
      MockNextResponse.json({ error: "認証が必要です" }, { status: 401 }) as any,
    );

    const request = new Request("http://localhost/api/reports", {
      method: "POST",
      body: JSON.stringify(validBody),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it("無効なリクエストボディに対して 400 を返す", async () => {
    vi.mocked(requireAuth).mockResolvedValue({
      user: mockUser as any,
      supabase: createAuthSupabase() as any,
    });

    const request = new Request("http://localhost/api/reports", {
      method: "POST",
      body: JSON.stringify({ cities: ["世田谷区"], preset: "childcare" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("有効なリクエストに対して 201 を返す", async () => {
    vi.mocked(requireAuth).mockResolvedValue({
      user: mockUser as any,
      supabase: createAuthSupabase() as any,
    });

    const request = new Request("http://localhost/api/reports", {
      method: "POST",
      body: JSON.stringify(validBody),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.reportId).toBeDefined();
    expect(body.status).toBe("completed");
  });

  it("利用量上限に達している場合に 403 を返す", async () => {
    vi.mocked(requireAuth).mockResolvedValue({
      user: mockUser as any,
      supabase: createAuthSupabase() as any,
    });

    // admin の usage_records クエリを上限到達状態に
    mockAdminFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { report_count: 100 },
              error: null,
            }),
          }),
        }),
      }),
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: "report-123" },
            error: null,
          }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
      upsert: vi.fn().mockResolvedValue({ error: null }),
    });

    const request = new Request("http://localhost/api/reports", {
      method: "POST",
      body: JSON.stringify(validBody),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    expect(response.status).toBe(403);
  });

  it("パイプライン失敗時に 500 と failed ステータスを返す", async () => {
    vi.mocked(requireAuth).mockResolvedValue({
      user: mockUser as any,
      supabase: createAuthSupabase() as any,
    });

    const { runReportPipeline } = await import("@/lib/report-pipeline");
    vi.mocked(runReportPipeline).mockRejectedValueOnce(
      new Error("パイプラインエラー"),
    );

    const request = new Request("http://localhost/api/reports", {
      method: "POST",
      body: JSON.stringify(validBody),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.status).toBe("failed");
    expect(body.error).toBe("パイプラインエラー");
  });

  it("レポートの insert が失敗した場合に 500 を返す", async () => {
    vi.mocked(requireAuth).mockResolvedValue({
      user: mockUser as any,
      supabase: createAuthSupabase() as any,
    });

    mockAdminFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { report_count: 0 },
              error: null,
            }),
          }),
        }),
      }),
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { message: "insert failed" },
          }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
      upsert: vi.fn().mockResolvedValue({ error: null }),
    });

    const request = new Request("http://localhost/api/reports", {
      method: "POST",
      body: JSON.stringify(validBody),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    expect(response.status).toBe(500);
  });
});
