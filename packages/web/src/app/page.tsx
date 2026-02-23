import type { Metadata } from "next";
import {
  HeroSection,
  SocialProofBar,
  PainPointSection,
  HowItWorksSection,
  CategorySection,
  ComparisonSection,
  UseCaseSection,
  DataTrustSection,
  PrefectureSection,
  FinalCTASection,
} from "@/components/home";

export const metadata: Metadata = {
  title: { absolute: "TownLens - 政府統計で街を比較。データで選ぶ、後悔しない街えらび。" },
  description:
    "口コミや主観ではなく、e-Stat政府統計・不動産情報ライブラリの客観データで全国1,741市区町村を7カテゴリでスコアリング。子育て・安全・価格・災害リスク・教育・交通・医療を数値で比較し、あなたに合った街が見つかります。",
  openGraph: {
    title: "TownLens - 政府統計で街を比較。データで選ぶ、後悔しない街えらび。",
    description:
      "口コミや主観ではなく、e-Stat政府統計・不動産情報ライブラリの客観データで全国1,741市区町村を7カテゴリでスコアリング。",
    images: [{ url: "/api/og", width: 1200, height: 630 }],
  },
};

export default function Home() {
  return (
    <main className="flex flex-1 flex-col">
      <HeroSection />
      <SocialProofBar />
      <PainPointSection />
      <HowItWorksSection />
      <CategorySection />
      <ComparisonSection />
      <UseCaseSection />
      <DataTrustSection />
      <PrefectureSection />
      <FinalCTASection />
    </main>
  );
}
