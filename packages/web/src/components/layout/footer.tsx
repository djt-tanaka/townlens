import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-border bg-secondary/40 py-8">
      <div className="mx-auto max-w-5xl px-4">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
          <p className="text-sm text-muted-foreground">
            TownLens - 政府統計ベースの街えらび比較ツール
          </p>
          <nav className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
            <Link href="/prefecture" className="hover:text-foreground">
              都道府県
            </Link>
            <Link href="/ranking" className="hover:text-foreground">
              ランキング
            </Link>
            <Link href="/pricing" className="hover:text-foreground">
              料金プラン
            </Link>
            <a
              href="https://www.e-stat.go.jp/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground"
            >
              e-Stat
            </a>
            <a
              href="https://www.reinfolib.mlit.go.jp/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground"
            >
              不動産情報ライブラリ
            </a>
          </nav>
        </div>
      </div>
    </footer>
  );
}
