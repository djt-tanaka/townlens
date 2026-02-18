import { describe, it, expect, vi, beforeEach } from "vitest";

const { MockNextResponse, mockGetUser } = vi.hoisted(() => {
  const mockGetUser = vi.fn();

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

  return { MockNextResponse, mockGetUser };
});

vi.mock("next/server", () => ({
  NextResponse: MockNextResponse,
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: mockGetUser,
    },
  }),
}));

import { getAuthUser, requireAuth } from "@/lib/auth";

describe("getAuthUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("認証済みユーザーを返す", async () => {
    const mockUser = { id: "user-123", email: "test@example.com" };
    mockGetUser.mockResolvedValue({ data: { user: mockUser } });

    const user = await getAuthUser();
    expect(user).toEqual(mockUser);
  });

  it("未認証の場合 null を返す", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const user = await getAuthUser();
    expect(user).toBeNull();
  });
});

describe("requireAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("認証済みの場合は user と supabase を返す", async () => {
    const mockUser = { id: "user-123", email: "test@example.com" };
    mockGetUser.mockResolvedValue({ data: { user: mockUser } });

    const result = await requireAuth();
    expect(result).not.toBeInstanceOf(MockNextResponse);
    if (!(result instanceof MockNextResponse)) {
      expect(result.user).toEqual(mockUser);
      expect(result.supabase).toBeDefined();
    }
  });

  it("未認証の場合は 401 レスポンスを返す", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const result = await requireAuth();
    expect(result).toBeInstanceOf(MockNextResponse);
    if (result instanceof MockNextResponse) {
      expect(result.status).toBe(401);
    }
  });
});
