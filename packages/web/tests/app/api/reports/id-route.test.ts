import { describe, it, expect, vi, beforeEach } from "vitest";

// vi.hoisted でモック変数を先に宣言（vi.mock ホイスティング対応）
const { mockFrom, mockSelect, mockEq, mockSingle } = vi.hoisted(() => {
  const mockSingle = vi.fn();
  const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
  const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
  const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });
  return { mockFrom, mockSelect, mockEq, mockSingle };
});

vi.mock("next/server", () => ({
  NextResponse: {
    json: vi.fn((data, init) => ({
      status: init?.status ?? 200,
      json: async () => data,
    })),
  },
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn().mockResolvedValue({
    from: mockFrom,
  }),
}));

import { GET } from "@/app/api/reports/[id]/route";

describe("GET /api/reports/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockReturnValue({ select: mockSelect });
    mockSelect.mockReturnValue({ eq: mockEq });
    mockEq.mockReturnValue({ single: mockSingle });
  });

  const validId = "123e4567-e89b-12d3-a456-426614174000";

  function createRouteParams(id: string) {
    return {
      params: Promise.resolve({ id }),
    };
  }

  it("無効な UUID に対して 400 を返す", async () => {
    const response = await GET(
      new Request("http://localhost/api/reports/invalid"),
      createRouteParams("invalid"),
    );
    expect(response.status).toBe(400);
  });

  it("存在しないレポートに対して 404 を返す", async () => {
    mockSingle.mockResolvedValue({ data: null, error: { message: "not found" } });

    const response = await GET(
      new Request(`http://localhost/api/reports/${validId}`),
      createRouteParams(validId),
    );
    expect(response.status).toBe(404);
  });

  it("processing 状態のレポートに対して 202 を返す", async () => {
    mockSingle.mockResolvedValue({
      data: {
        id: validId,
        status: "processing",
        cities: ["世田谷区", "渋谷区"],
        preset: "childcare",
        result_json: null,
        error_message: null,
        created_at: "2026-01-01T00:00:00Z",
        user_id: "user-1",
      },
      error: null,
    });

    const response = await GET(
      new Request(`http://localhost/api/reports/${validId}`),
      createRouteParams(validId),
    );
    expect(response.status).toBe(202);
    const body = await response.json();
    expect(body.status).toBe("processing");
  });

  it("failed 状態のレポートに対して 500 を返す", async () => {
    mockSingle.mockResolvedValue({
      data: {
        id: validId,
        status: "failed",
        error_message: "パイプラインエラー",
        cities: ["世田谷区", "渋谷区"],
        preset: "childcare",
        result_json: null,
        created_at: "2026-01-01T00:00:00Z",
        user_id: "user-1",
      },
      error: null,
    });

    const response = await GET(
      new Request(`http://localhost/api/reports/${validId}`),
      createRouteParams(validId),
    );
    expect(response.status).toBe(500);
  });

  it("completed 状態のレポートに対して正常なレスポンスを返す", async () => {
    mockSingle.mockResolvedValue({
      data: {
        id: validId,
        status: "completed",
        cities: ["世田谷区", "渋谷区"],
        preset: "childcare",
        result_json: {
          preset: { name: "childcare", label: "子育て重視", weights: {} },
          results: [],
          definitions: [],
          rawRows: [],
          hasPriceData: false,
          hasCrimeData: false,
          hasDisasterData: false,
        },
        error_message: null,
        created_at: "2026-01-01T00:00:00Z",
        user_id: "user-1",
      },
      error: null,
    });

    const response = await GET(
      new Request(`http://localhost/api/reports/${validId}`),
      createRouteParams(validId),
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.report.id).toBe(validId);
    expect(body.report.cities).toEqual(["世田谷区", "渋谷区"]);
  });

  it("completed だが result_json が null の場合に 500 を返す", async () => {
    mockSingle.mockResolvedValue({
      data: {
        id: validId,
        status: "completed",
        cities: ["世田谷区", "渋谷区"],
        preset: "childcare",
        result_json: null,
        error_message: null,
        created_at: "2026-01-01T00:00:00Z",
        user_id: "user-1",
      },
      error: null,
    });

    const response = await GET(
      new Request(`http://localhost/api/reports/${validId}`),
      createRouteParams(validId),
    );
    expect(response.status).toBe(500);
  });

  it("error がなくても data が null の場合に 404 を返す", async () => {
    mockSingle.mockResolvedValue({ data: null, error: null });

    const response = await GET(
      new Request(`http://localhost/api/reports/${validId}`),
      createRouteParams(validId),
    );
    expect(response.status).toBe(404);
  });

  it("failed 状態で error_message が null の場合にデフォルトメッセージを返す", async () => {
    mockSingle.mockResolvedValue({
      data: {
        id: validId,
        status: "failed",
        error_message: null,
        cities: ["世田谷区", "渋谷区"],
        preset: "childcare",
        result_json: null,
        created_at: "2026-01-01T00:00:00Z",
        user_id: "user-1",
      },
      error: null,
    });

    const response = await GET(
      new Request(`http://localhost/api/reports/${validId}`),
      createRouteParams(validId),
    );
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe("レポート生成に失敗しました");
  });
});
