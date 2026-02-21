import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-border bg-secondary/40 py-8">
      <div className="mx-auto max-w-5xl px-4">
        <div className="flex flex-col gap-8 sm:flex-row sm:justify-between">
          {/* ブランド */}
          <div className="space-y-1">
            <p className="text-sm font-bold">TownLens</p>
            <p className="text-xs text-muted-foreground">
              政府統計ベースの街えらび比較ツール
            </p>
          </div>

          {/* サービス */}
          <div className="space-y-2">
            <p className="text-xs font-bold text-muted-foreground">
              サービス
            </p>
            <nav aria-label="サービスリンク" className="flex flex-col gap-1.5 text-sm text-muted-foreground">
              <Link href="/prefecture" className="hover:text-foreground">
                都道府県
              </Link>
              <Link href="/ranking" className="hover:text-foreground">
                ランキング
              </Link>
              <Link href="/pricing" className="hover:text-foreground">
                料金プラン
              </Link>
            </nav>
          </div>

          {/* 法的情報 */}
          <div className="space-y-2">
            <p className="text-xs font-bold text-muted-foreground">
              法的情報
            </p>
            <nav aria-label="法的情報リンク" className="flex flex-col gap-1.5 text-sm text-muted-foreground">
              <Link href="/terms" className="hover:text-foreground">
                利用規約
              </Link>
              <Link href="/privacy" className="hover:text-foreground">
                プライバシーポリシー
              </Link>
              <Link
                href="/legal/specified-commercial"
                className="hover:text-foreground"
              >
                特定商取引法に基づく表記
              </Link>
            </nav>
          </div>

          {/* データソース */}
          <div className="space-y-2">
            <p className="text-xs font-bold text-muted-foreground">
              データソース
            </p>
            <nav aria-label="データソースリンク" className="flex flex-col gap-1.5 text-sm text-muted-foreground">
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

        <div className="mt-8 border-t border-border pt-4 text-center text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} TownLens
        </div>
      </div>
    </footer>
  );
}
