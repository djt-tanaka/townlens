import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { MobileNav } from "./mobile-nav";

export async function Header() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-3 sm:px-4">
        <Link href="/" className="text-lg font-black tracking-tight">
          TownLens
          <span className="ml-0.5 inline-block h-1.5 w-1.5 rounded-full bg-warm-coral align-middle" />
        </Link>
        {/* Desktop nav */}
        <nav className="hidden items-center gap-2 md:flex">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/prefecture">都道府県</Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/ranking">ランキング</Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/pricing">料金プラン</Link>
          </Button>
          {user ? (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/dashboard">ダッシュボード</Link>
              </Button>
              <form action="/auth/signout" method="post">
                <Button variant="outline" size="sm" type="submit">
                  ログアウト
                </Button>
              </form>
            </>
          ) : (
            <Button variant="outline" size="sm" asChild>
              <Link href="/auth/login">ログイン</Link>
            </Button>
          )}
        </nav>
        {/* Mobile nav */}
        <MobileNav isLoggedIn={!!user} />
      </div>
    </header>
  );
}
