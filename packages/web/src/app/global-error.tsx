"use client";

import { useEffect } from "react";

interface GlobalErrorProps {
  readonly error: Error & { digest?: string };
  readonly reset: () => void;
}

/**
 * root layout 自体が壊れた場合の最終セーフティネット。
 * layout.tsx が使えないため html/body を自前で含める。
 * 依存を最小限にし、外部コンポーネントをインポートしない。
 */
export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error("致命的エラー:", error);
  }, [error]);

  return (
    <html lang="ja">
      <body
        style={{
          fontFamily: "system-ui, sans-serif",
          display: "flex",
          minHeight: "100vh",
          alignItems: "center",
          justifyContent: "center",
          margin: 0,
          padding: "2rem",
        }}
      >
        <div style={{ textAlign: "center", maxWidth: "400px" }}>
          <h1
            style={{
              fontSize: "1.25rem",
              fontWeight: 600,
              color: "#dc2626",
              marginBottom: "0.5rem",
            }}
          >
            予期しないエラーが発生しました
          </h1>
          <p
            style={{
              color: "#6b7280",
              fontSize: "0.875rem",
              marginBottom: "1.5rem",
            }}
          >
            ページを再読み込みしてください。
          </p>
          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center" }}>
            <button
              type="button"
              onClick={reset}
              style={{
                padding: "0.5rem 1rem",
                fontSize: "0.875rem",
                fontWeight: 500,
                color: "#fff",
                backgroundColor: "#18181b",
                border: "none",
                borderRadius: "0.375rem",
                cursor: "pointer",
              }}
            >
              再試行
            </button>
            <a
              href="/"
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "0.5rem 1rem",
                fontSize: "0.875rem",
                fontWeight: 500,
                color: "#18181b",
                border: "1px solid #e5e7eb",
                borderRadius: "0.375rem",
                textDecoration: "none",
              }}
            >
              トップページに戻る
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
