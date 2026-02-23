import Link from "next/link";
import { CheckCircle2, Heart, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

export function FinalCTASection() {
  return (
    <section className="border-t bg-gradient-to-b from-secondary/30 to-background px-4 py-20 sm:py-24">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="mb-4 text-2xl font-black tracking-tight sm:text-3xl">
          データで選べば、街えらびは変わる。
        </h2>
        <p className="mb-8 text-muted-foreground">
          口コミに頼らない、後悔しない街えらびを今すぐ始めましょう。
          <br />
          無料プランで月3回までレポート生成できます。
        </p>
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Button
            size="lg"
            className="bg-warm-coral text-white hover:bg-warm-coral/90"
            asChild
          >
            <Link href="#top">
              <Search className="mr-2 h-4 w-4" />
              街を比較してみる
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/ranking">
              <Heart className="mr-2 h-4 w-4" />
              ランキングを見る
            </Link>
          </Button>
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
            会員登録不要で比較可能
          </span>
          <span className="flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
            無料プランあり
          </span>
          <span className="flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
            全国1,741市区町村対応
          </span>
        </div>
      </div>
    </section>
  );
}
