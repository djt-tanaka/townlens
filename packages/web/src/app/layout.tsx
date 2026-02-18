import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TownLens - 街えらびレポート",
  description: "子育て世帯のための街えらび比較ツール",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="antialiased">{children}</body>
    </html>
  );
}
