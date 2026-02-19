import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";

// ImageResponse のモック - JSX を評価せず Response を返す
const { MockImageResponse } = vi.hoisted(() => {
  class MockImageResponse extends Response {
    constructor(_element: unknown, _options?: unknown) {
      super("mock-png-data", {
        headers: { "Content-Type": "image/png" },
      });
    }
  }
  return { MockImageResponse };
});

vi.mock("next/og", () => ({
  ImageResponse: MockImageResponse,
}));

// createAdminClient のモック
const { mockFrom } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockFrom }),
}));

// Google Fonts fetch のモック
vi.stubGlobal(
  "fetch",
  vi.fn().mockImplementation((url: string | URL | Request) => {
    const urlStr =
      typeof url === "string"
        ? url
        : url instanceof URL
          ? url.toString()
          : url.url;
    if (urlStr.includes("fonts.googleapis.com")) {
      return Promise.resolve({
        text: () =>
          Promise.resolve(
            'src: url(https://fonts.gstatic.com/s/notosansjp/test.woff2) format("woff2");',
          ),
      });
    }
    if (urlStr.includes("fonts.gstatic.com")) {
      return Promise.resolve({
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
      });
    }
    return Promise.reject(new Error(`未対応の URL: ${urlStr}`));
  }),
);

// React をグローバルに設定（JSX の実行に必要）
vi.stubGlobal("React", React);

import { GET } from "@/app/api/og/route";

function mockSupabaseQuery(data: unknown, error: unknown = null) {
  mockFrom.mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data, error }),
      }),
    }),
  });
}

describe("GET /api/og", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // fetch モックを再設定
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockImplementation(
      (url: string | URL | Request) => {
        const urlStr =
          typeof url === "string"
            ? url
            : url instanceof URL
              ? url.toString()
              : url.url;
        if (urlStr.includes("fonts.googleapis.com")) {
          return Promise.resolve({
            text: () =>
              Promise.resolve(
                'src: url(https://fonts.gstatic.com/s/notosansjp/test.woff2) format("woff2");',
              ),
          });
        }
        if (urlStr.includes("fonts.gstatic.com")) {
          return Promise.resolve({
            arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
          });
        }
        return Promise.reject(new Error(`未対応の URL: ${urlStr}`));
      },
    );
  });

  it("id パラメータがない場合にデフォルト OGP 画像を返す", async () => {
    const request = new Request("http://localhost/api/og");
    const response = await GET(request);
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/png");
    expect(response.headers.get("Cache-Control")).toContain("s-maxage=86400");
  });

  it("存在しないレポートに対して 404 を返す", async () => {
    mockSupabaseQuery(null, { message: "not found" });

    const request = new Request("http://localhost/api/og?id=non-existent");
    const response = await GET(request);
    expect(response.status).toBe(404);
  });

  it("有効なレポートに対して画像レスポンスを返す", async () => {
    mockSupabaseQuery({
      cities: ["世田谷区", "渋谷区"],
      preset: "childcare",
      result_json: {
        results: [
          {
            cityName: "世田谷区",
            areaCode: "13112",
            compositeScore: 78.5,
            rank: 1,
            baseline: [],
            choice: [],
            confidence: { level: "high", reason: "" },
            notes: [],
          },
          {
            cityName: "渋谷区",
            areaCode: "13113",
            compositeScore: 65.2,
            rank: 2,
            baseline: [],
            choice: [],
            confidence: { level: "high", reason: "" },
            notes: [],
          },
        ],
        preset: {
          name: "childcare",
          label: "子育て重視",
          weights: {},
        },
      },
    });

    const request = new Request("http://localhost/api/og?id=report-123");
    const response = await GET(request);
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/png");
    expect(response.headers.get("Cache-Control")).toContain("s-maxage=86400");
  });
});
