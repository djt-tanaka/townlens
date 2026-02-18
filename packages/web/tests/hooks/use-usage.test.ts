import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useUsage } from "@/hooks/use-usage";

describe("useUsage", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("正常にデータを取得する", async () => {
    const mockUsage = {
      plan: "free" as const,
      currentMonth: { reportsGenerated: 3, reportsLimit: 5 },
    };
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify(mockUsage), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const { result } = renderHook(() => useUsage());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.usage).toEqual(mockUsage);
    expect(result.current.error).toBeNull();
  });

  it("401 の場合は usage を null に設定する", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(null, { status: 401 }),
    );

    const { result } = renderHook(() => useUsage());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.usage).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("500 エラー時にエラーメッセージを設定する", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(null, { status: 500 }),
    );

    const { result } = renderHook(() => useUsage());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe("利用量の取得に失敗しました");
  });

  it("refetch で再取得を実行する", async () => {
    const mockUsage = {
      plan: "free" as const,
      currentMonth: { reportsGenerated: 1, reportsLimit: 5 },
    };
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify(mockUsage), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const { result } = renderHook(() => useUsage());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // 2回目のリクエスト
    const updatedUsage = {
      plan: "free" as const,
      currentMonth: { reportsGenerated: 2, reportsLimit: 5 },
    };
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify(updatedUsage), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    act(() => {
      result.current.refetch();
    });

    await waitFor(() => {
      expect(result.current.usage).toEqual(updatedUsage);
    });
  });
});
