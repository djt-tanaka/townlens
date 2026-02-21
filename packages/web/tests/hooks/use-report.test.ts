import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useReport } from "@/hooks/use-report";
import type { CreateReportRequest } from "@/types";

describe("useReport", () => {
  const mockRequest: CreateReportRequest = {
    cities: ["世田谷区", "渋谷区"],
    preset: "childcare",
  };

  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("初期状態は isLoading: false, error: null", () => {
    const { result } = renderHook(() => useReport());
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("レポート生成成功時にレスポンスを返す", async () => {
    const mockResponse = { reportId: "test-id", status: "completed" as const };
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify(mockResponse), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const { result } = renderHook(() => useReport());

    let response: Awaited<ReturnType<typeof result.current.createReport>>;
    await act(async () => {
      response = await result.current.createReport(mockRequest);
    });

    expect(response!.reportId).toBe("test-id");
    expect(response!.status).toBe("completed");
    // 成功時はローディング維持（画面遷移でアンマウントされるため）
    expect(result.current.isLoading).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it("API エラー時にエラーメッセージを設定する", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ error: "利用上限に達しました" }), {
        status: 429,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const { result } = renderHook(() => useReport());

    await act(async () => {
      try {
        await result.current.createReport(mockRequest);
      } catch {
        // エラーは期待通り
      }
    });

    await waitFor(() => {
      expect(result.current.error).toBe("利用上限に達しました");
    });
    expect(result.current.isLoading).toBe(false);
  });

  it("ネットワークエラー時にエラーメッセージを設定する", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useReport());

    await act(async () => {
      try {
        await result.current.createReport(mockRequest);
      } catch {
        // エラーは期待通り
      }
    });

    await waitFor(() => {
      expect(result.current.error).toBe("Network error");
    });
    expect(result.current.isLoading).toBe(false);
  });

  it("JSON パース失敗時はデフォルトメッセージを使用する", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response("invalid", { status: 500 }),
    );

    const { result } = renderHook(() => useReport());

    await act(async () => {
      try {
        await result.current.createReport(mockRequest);
      } catch {
        // エラーは期待通り
      }
    });

    await waitFor(() => {
      expect(result.current.error).toBe("レポート生成に失敗しました");
    });
  });
});
