"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CompareCtaProps {
  readonly cityName: string;
}

/** 「この街と比較する」CTAボタン */
export function CompareCta({ cityName }: CompareCtaProps) {
  const href = `/?compare=${encodeURIComponent(cityName)}`;

  return (
    <section className="rounded-2xl border border-border/50 bg-secondary/30 p-6 text-center">
      <h2 className="mb-2 text-lg font-bold">
        {cityName}と他の街を比較してみましょう
      </h2>
      <p className="mb-4 text-sm text-muted-foreground">
        気になる街を追加して、政府統計データに基づく比較レポートを作成できます。
      </p>
      <Button
        asChild
        size="lg"
        className="bg-warm-coral text-white hover:bg-warm-coral/90"
      >
        <Link href={href}>
          この街と比較する
          <ArrowRight className="ml-2 h-4 w-4" />
        </Link>
      </Button>
    </section>
  );
}
