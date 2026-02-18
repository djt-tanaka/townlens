"use client";

import { useState, useEffect } from "react";

/** 値のデバウンスフック。入力後 delay ミリ秒経過するまで値の更新を遅延する */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}
