import { describe, it, expect, vi, beforeEach } from "vitest";

// Next.js モック
vi.mock("next/server", async () => {
  const { NextRequest } = await vi.importActual<typeof import("next/server")>(
    "next/server",
  );
  return {
    NextRequest,
    NextResponse: {
      json: vi.fn((data, init) => ({
        status: init?.status ?? 200,
        json: async () => data,
      })),
    },
  };
});

// core モジュールのモック
vi.mock("@townlens/core", () => ({
  extractClassObjects: vi.fn().mockReturnValue({}),
  resolveAreaClass: vi.fn().mockReturnValue([]),
  buildAreaEntries: vi.fn().mockReturnValue([
    { code: "13112", name: "世田谷区" },
    { code: "13113", name: "渋谷区" },
    { code: "13114", name: "中野区" },
    { code: "13115", name: "杉並区" },
  ]),
  normalizeLabel: vi.fn().mockImplementation((s: string) => s),
  katakanaToHiragana: vi.fn().mockImplementation((s: string) => s),
  findByReading: vi.fn().mockReturnValue([]),
  isDesignatedCityCode: vi.fn().mockReturnValue(false),
  DATASETS: {
    population: { statsDataId: "0003411595" },
  },
}));

// API クライアントのモック
vi.mock("@/lib/api-clients", () => ({
  createEstatClient: vi.fn().mockReturnValue({
    getMetaInfo: vi.fn().mockResolvedValue({}),
  }),
}));

// 都道府県のモック
vi.mock("@/lib/prefectures", () => ({
  getPrefectureName: vi.fn().mockReturnValue("東京都"),
}));

import { NextRequest } from "next/server";
import { GET } from "@/app/api/cities/search/route";

describe("GET /api/cities/search", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("2文字未満のクエリに対して 400 を返す", async () => {
    const request = new NextRequest("http://localhost/api/cities/search?q=世");
    const response = await GET(request);
    expect(response.status).toBe(400);
  });

  it("q パラメータなしに対して 400 を返す", async () => {
    const request = new NextRequest("http://localhost/api/cities/search");
    const response = await GET(request);
    expect(response.status).toBe(400);
  });

  it("有効なクエリに対して都市一覧を返す", async () => {
    const request = new NextRequest(
      "http://localhost/api/cities/search?q=世田谷",
    );
    const response = await GET(request);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.cities).toBeDefined();
    expect(Array.isArray(body.cities)).toBe(true);
  });

  it("結果に prefecture フィールドが含まれる", async () => {
    const request = new NextRequest(
      "http://localhost/api/cities/search?q=世田谷",
    );
    const response = await GET(request);
    const body = await response.json();
    if (body.cities.length > 0) {
      expect(body.cities[0].prefecture).toBeDefined();
    }
  });
});
