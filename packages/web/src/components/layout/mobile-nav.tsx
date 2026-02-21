"use client";

import { useState } from "react";
import Link from "next/link";
import { MenuIcon, XIcon } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/prefecture", label: "都道府県" },
  { href: "/ranking", label: "ランキング" },
  { href: "/pricing", label: "料金プラン" },
] as const;

export function MobileNav({ isLoggedIn }: { isLoggedIn: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Trigger asChild>
        <Button variant="ghost" size="icon-sm" className="md:hidden">
          <MenuIcon className="size-5" />
          <span className="sr-only">メニューを開く</span>
        </Button>
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            "fixed inset-0 z-50 bg-black/50",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
          )}
        />
        <DialogPrimitive.Content
          className={cn(
            "fixed inset-y-0 right-0 z-50 w-3/4 max-w-xs border-l border-border bg-background p-6 shadow-lg outline-none",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right",
            "duration-200"
          )}
        >
          <DialogPrimitive.Title className="sr-only">
            ナビゲーションメニュー
          </DialogPrimitive.Title>
          <div className="flex items-center justify-between">
            <span className="text-lg font-black tracking-tight">
              TownLens
              <span className="ml-0.5 inline-block h-1.5 w-1.5 rounded-full bg-warm-coral align-middle" />
            </span>
            <DialogPrimitive.Close asChild>
              <Button variant="ghost" size="icon-sm">
                <XIcon className="size-5" />
                <span className="sr-only">閉じる</span>
              </Button>
            </DialogPrimitive.Close>
          </div>
          <nav className="mt-8 flex flex-col gap-1">
            {navLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2.5 text-sm font-medium transition-colors hover:bg-accent"
              >
                {label}
              </Link>
            ))}
            {isLoggedIn ? (
              <>
                <Link
                  href="/dashboard"
                  onClick={() => setOpen(false)}
                  className="rounded-md px-3 py-2.5 text-sm font-medium transition-colors hover:bg-accent"
                >
                  ダッシュボード
                </Link>
                <div className="mt-4 border-t border-border pt-4">
                  <form action="/auth/signout" method="post">
                    <Button
                      variant="outline"
                      size="sm"
                      type="submit"
                      className="w-full"
                    >
                      ログアウト
                    </Button>
                  </form>
                </div>
              </>
            ) : (
              <div className="mt-4 border-t border-border pt-4">
                <Button variant="outline" size="sm" asChild className="w-full">
                  <Link href="/auth/login" onClick={() => setOpen(false)}>
                    ログイン
                  </Link>
                </Button>
              </div>
            )}
          </nav>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
