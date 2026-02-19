import type { Metadata } from "next";
import { Noto_Sans_JP } from "next/font/google";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import "./globals.css";

const notoSansJP = Noto_Sans_JP({
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://townlens.jp",
  ),
  title: {
    default: "TownLens - 街えらびレポート",
    template: "%s | TownLens",
  },
  description:
    "政府統計ベースの都市比較ツール。子育て世帯のための街えらびを支援します。",
  openGraph: {
    type: "website",
    locale: "ja_JP",
    siteName: "TownLens",
    title: "TownLens - 街えらびレポート",
    description:
      "政府統計ベースの都市比較ツール。子育て世帯のための街えらびを支援します。",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`flex min-h-screen flex-col antialiased ${notoSansJP.className}`}
      >
        <Header />
        <div className="flex-1">{children}</div>
        <Footer />
      </body>
    </html>
  );
}
