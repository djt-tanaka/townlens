import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getCurrentMonth,
  getReportLimit,
  jsonResponse,
  errorResponse,
  handleApiError,
} from "@/lib/api-utils";

vi.mock("next/server", () => ({
  NextResponse: {
    json: vi.fn((data, init) => ({
      status: init?.status ?? 200,
      json: async () => data,
    })),
  },
}));

vi.mock("@townlens/core", () => {
  class AppError extends Error {
    hints?: string[];
    constructor(message: string, hints?: string[]) {
      super(message);
      this.name = "AppError";
      this.hints = hints;
    }
  }
  return { AppError };
});

describe("getCurrentMonth", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("YYYY-MM 形式で現在月を返す", () => {
    vi.setSystemTime(new Date("2026-02-15"));
    expect(getCurrentMonth()).toBe("2026-02");
  });

  it("1月のゼロパディング", () => {
    vi.setSystemTime(new Date("2026-01-01"));
    expect(getCurrentMonth()).toBe("2026-01");
  });

  it("12月のフォーマット", () => {
    vi.setSystemTime(new Date("2025-12-31"));
    expect(getCurrentMonth()).toBe("2025-12");
  });
});

describe("getReportLimit", () => {
  it("free プランは 100 件", () => {
    expect(getReportLimit("free")).toBe(100);
  });

  it("standard プランは無制限（null）", () => {
    expect(getReportLimit("standard")).toBeNull();
  });

  it("premium プランは無制限（null）", () => {
    expect(getReportLimit("premium")).toBeNull();
  });

  it("不明なプランは free と同じ上限", () => {
    expect(getReportLimit("unknown")).toBe(100);
  });
});

describe("jsonResponse", () => {
  it("デフォルトで 200 ステータスを返す", () => {
    const res = jsonResponse({ data: "test" });
    expect(res.status).toBe(200);
  });

  it("カスタムステータスコードを返す", () => {
    const res = jsonResponse({ data: "test" }, 201);
    expect(res.status).toBe(201);
  });
});

describe("errorResponse", () => {
  it("エラーメッセージとステータスを返す", async () => {
    const res = errorResponse("エラー", 400);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("エラー");
  });

  it("詳細情報を含めることができる", async () => {
    const res = errorResponse("エラー", 400, "詳細");
    const body = await res.json();
    expect(body.details).toBe("詳細");
  });
});

describe("handleApiError", () => {
  it("AppError をハンドリングする", async () => {
    const { AppError } = await import("@townlens/core");
    const err = new AppError("テストエラー", ["ヒント1"]);
    const res = handleApiError(err);
    expect(res.status).toBe(400);
  });

  it("一般的な Error をハンドリングする", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = handleApiError(new Error("一般エラー"));
    expect(res.status).toBe(500);
    consoleSpy.mockRestore();
  });

  it("文字列以外のエラーをハンドリングする", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = handleApiError("文字列エラー");
    expect(res.status).toBe(500);
    consoleSpy.mockRestore();
  });
});
