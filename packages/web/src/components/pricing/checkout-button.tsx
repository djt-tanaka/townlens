"use client";

/**
 * Stripe Checkout へのリダイレクトボタン。
 * POST /api/stripe/checkout を呼び出し、返却された URL にリダイレクトする。
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface CheckoutButtonProps {
  readonly priceId: string;
  readonly label: string;
  readonly disabled?: boolean;
}

export function CheckoutButton({
  priceId,
  label,
  disabled = false,
}: CheckoutButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCheckout() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error ?? "チェックアウトの作成に失敗しました",
        );
      }

      const data = await response.json();
      window.location.href = data.url;
    } catch (err) {
      setIsLoading(false);
      const message =
        err instanceof Error ? err.message : "エラーが発生しました";
      setError(message);
    }
  }

  return (
    <div className="w-full space-y-1">
      <Button
        className="w-full"
        disabled={disabled || isLoading}
        onClick={handleCheckout}
      >
        {isLoading ? "処理中..." : label}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
