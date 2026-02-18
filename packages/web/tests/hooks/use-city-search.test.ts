import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useCitySearch } from "@/hooks/use-city-search";

/**
 * useCitySearch のテスト。
 * useDebounce の内部では setTimeout を使っているが、
 * useState の初期値として query がそのまま渡されるため、
 * 初回レンダリングでは debouncedQuery === query となる。
 * よって fake timers は使わず、real timers + waitFor で検証する。
 */
describe("useCitySearch", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("初期状態は空の結果を返す", () => {
    const { result } = renderHook(() => useCitySearch(""));
    expect(result.current.results).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("2文字未満のクエリでは API を呼び出さない", async () => {
    renderHook(() => useCitySearch("世"));

    // 少し待っても fetch が呼ばれないことを確認
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(fetch).not.toHaveBeenCalled();
  });

  it("2文字以上のクエリで API を呼び出す", async () => {
    const mockCities = {
      cities: [
        { code: "13112", name: "世田谷区", prefecture: "東京都" },
      ],
    };
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify(mockCities), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const { result } = renderHook(() => useCitySearch("世田"));

    await waitFor(() => {
      expect(result.current.results).toHaveLength(1);
    });

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(result.current.results[0].name).toBe("世田谷区");
    expect(result.current.isLoading).toBe(false);
  });

  it("API エラー時にエラーメッセージを設定する", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(null, { status: 500 }),
    );

    const { result } = renderHook(() => useCitySearch("世田"));

    await waitFor(() => {
      expect(result.current.error).toBe("検索に失敗しました");
    });

    expect(result.current.results).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });

  it("クエリが空に戻ると結果をクリアする", async () => {
    const mockCities = {
      cities: [
        { code: "13112", name: "世田谷区", prefecture: "東京都" },
      ],
    };
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify(mockCities), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const { result, rerender } = renderHook(
      ({ query }) => useCitySearch(query),
      { initialProps: { query: "世田" } },
    );

    await waitFor(() => {
      expect(result.current.results).toHaveLength(1);
    });

    // クエリを空にする → debouncedQuery が "世田" のまましばらく残るが、
    // 初期値は "世田" で useState に保持されているため、
    // rerender で query="" が渡されると、次の useDebounce の useEffect で
    // setTimeout 後に "" に変わり、useCitySearch の useEffect がクリアを実行
    rerender({ query: "" });

    await waitFor(() => {
      expect(result.current.results).toEqual([]);
    });
  });
});
