"use client";

import { useEffect, useState } from "react";

/** ラベルテキストを表示用の複数行に分割する */
export function splitLabel(text: string, maxLen = 7): string[] {
  if (text.length <= maxLen) return [text];
  // 「（」で自然に分割（常に括弧の前で切る）
  const parenIdx = text.indexOf("（");
  if (parenIdx > 0) {
    return [text.slice(0, parenIdx), text.slice(parenIdx)];
  }
  // 「・」で分割
  const dotIdx = text.indexOf("・");
  if (dotIdx > 0) {
    return [text.slice(0, dotIdx + 1), text.slice(dotIdx + 1)];
  }
  // 長すぎる場合は中間で分割
  const mid = Math.ceil(text.length / 2);
  return [text.slice(0, mid), text.slice(mid)];
}

interface RadarTickProps {
  readonly x?: number;
  readonly y?: number;
  readonly cx?: number;
  readonly cy?: number;
  readonly payload?: { readonly value: string };
  readonly textAnchor?: "inherit" | "start" | "middle" | "end";
}

/** モバイル対応のレーダーチャート軸ラベル */
export function RadarTick({ x = 0, y = 0, cx = 0, cy = 0, payload, textAnchor }: RadarTickProps) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  if (!payload) return null;

  const fontSize = isMobile ? 9 : 11;
  const lines = splitLabel(payload.value, isMobile ? 6 : 8);
  const lineHeight = fontSize + 2;

  // ラベルの位置をチャート中心からの方向に基づいて微調整
  const dx = x > cx ? 4 : x < cx ? -4 : 0;
  const dy = y > cy ? 6 : y < cy ? -6 : 0;

  // 複数行の場合、中心に寄せるためのオフセット
  const startDy = -(((lines.length - 1) * lineHeight) / 2);

  return (
    <text
      x={x + dx}
      y={y + dy}
      textAnchor={textAnchor}
      fontSize={fontSize}
      fill="var(--muted-foreground)"
    >
      {lines.map((line, i) => (
        <tspan
          key={line}
          x={x + dx}
          dy={i === 0 ? startDy : lineHeight}
        >
          {line}
        </tspan>
      ))}
    </text>
  );
}
