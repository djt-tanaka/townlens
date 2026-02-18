import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDebounce } from "@/hooks/use-debounce";

describe("useDebounce", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("初期値をそのまま返す", () => {
    const { result } = renderHook(() => useDebounce("hello", 300));
    expect(result.current).toBe("hello");
  });

  it("delay 経過前は古い値を保持する", () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: "a", delay: 300 } },
    );

    rerender({ value: "ab", delay: 300 });
    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(result.current).toBe("a");
    vi.useRealTimers();
  });

  it("delay 経過後に新しい値に更新される", () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: "a", delay: 300 } },
    );

    rerender({ value: "ab", delay: 300 });
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current).toBe("ab");
    vi.useRealTimers();
  });

  it("連続した変更は最後の値のみ反映する", () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: "a", delay: 300 } },
    );

    rerender({ value: "ab", delay: 300 });
    act(() => {
      vi.advanceTimersByTime(100);
    });
    rerender({ value: "abc", delay: 300 });
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current).toBe("abc");
    vi.useRealTimers();
  });

  it("数値型でも動作する", () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 0, delay: 200 } },
    );

    rerender({ value: 42, delay: 200 });
    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(result.current).toBe(42);
    vi.useRealTimers();
  });
});
