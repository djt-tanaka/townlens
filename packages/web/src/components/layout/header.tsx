import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";

export async function Header() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="border-b border-border bg-background">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-2 sm:px-4">
        <Link href="/" className="text-lg font-bold tracking-tight">
          TownLens
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2">
          <Button variant="ghost" size="sm" asChild className="px-2 text-xs sm:px-3 sm:text-sm">
            <Link href="/pricing">料金プラン</Link>
          </Button>
          {user ? (
            <>
              <Button variant="ghost" size="sm" asChild className="px-2 text-xs sm:px-3 sm:text-sm">
                <Link href="/dashboard">ダッシュボード</Link>
              </Button>
              <form action="/auth/signout" method="post">
                <Button variant="outline" size="sm" type="submit" className="px-2 text-xs sm:px-3 sm:text-sm">
                  ログアウト
                </Button>
              </form>
            </>
          ) : (
            <Button variant="outline" size="sm" asChild className="px-2 text-xs sm:px-3 sm:text-sm">
              <Link href="/auth/login">ログイン</Link>
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
