"use client";

/**
 * Stripe Customer Portal リダイレクトボタン。
 * ダッシュボードの利用量カードに表示。
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function PortalButton() {
  const [isLoading, setIsLoading] = useState(false);

  async function handlePortal() {
    setIsLoading(true);

    try {
      const response = await fetch("/api/stripe/portal", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("ポータルの作成に失敗しました");
      }

      const data = await response.json();
      window.location.href = data.url;
    } catch {
      setIsLoading(false);
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="w-full"
      disabled={isLoading}
      onClick={handlePortal}
    >
      {isLoading ? "読み込み中..." : "プラン管理"}
    </Button>
  );
}
