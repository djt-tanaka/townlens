/**
 * 法的ページ（利用規約・プライバシーポリシー・特商法表記）の共通レイアウト。
 * タイトル + 最終更新日 + 長文コンテンツの構成。
 */

interface LegalPageLayoutProps {
  readonly title: string;
  readonly lastUpdated: string;
  readonly children: React.ReactNode;
}

export function LegalPageLayout({
  title,
  lastUpdated,
  children,
}: LegalPageLayoutProps) {
  return (
    <main className="mx-auto min-h-screen max-w-3xl px-4 py-8">
      <section className="space-y-2">
        <h1 className="text-3xl font-black tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground">
          最終更新日: {lastUpdated}
        </p>
      </section>
      <div className="mt-8 space-y-8 text-sm leading-relaxed text-foreground/90">
        {children}
      </div>
    </main>
  );
}

/** 法的文書のセクション（見出し + 本文） */
export function LegalSection({
  title,
  children,
}: {
  readonly title: string;
  readonly children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="border-b border-border pb-2 text-lg font-bold">
        {title}
      </h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}
