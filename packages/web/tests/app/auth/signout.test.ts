import { describe, it, expect, vi, beforeEach } from "vitest";

// vi.hoisted でモック変数を先に宣言（vi.mock ホイスティング対応）
const { mockSignOut, MockNextResponse } = vi.hoisted(() => {
  const mockSignOut = vi.fn();

  class MockNextResponse {
    status: number;
    headers: Map<string, string>;
    constructor(url: string, status: number) {
      this.status = status;
      this.headers = new Map([["location", url]]);
    }
    static redirect(url: string | URL) {
      return new MockNextResponse(String(url), 302);
    }
  }

  return { mockSignOut, MockNextResponse };
});

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn().mockResolvedValue({
    auth: { signOut: mockSignOut },
  }),
}));

vi.mock("next/server", () => ({
  NextResponse: MockNextResponse,
}));

import { POST } from "@/app/auth/signout/route";

describe("POST /auth/signout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSignOut.mockResolvedValue({ error: null });
  });

  it("supabase.auth.signOut() を呼び出す", async () => {
    const request = new Request("http://localhost:3000/auth/signout", {
      method: "POST",
    });

    await POST(request);

    expect(mockSignOut).toHaveBeenCalledOnce();
  });

  it("signout 後にトップページへリダイレクトする", async () => {
    const request = new Request("http://localhost:3000/auth/signout", {
      method: "POST",
    });

    const response = await POST(request);

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("http://localhost:3000/");
  });
});
