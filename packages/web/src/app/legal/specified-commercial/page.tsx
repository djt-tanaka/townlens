import type { Metadata } from "next";
import { LegalPageLayout } from "@/components/legal/legal-page-layout";

export const metadata: Metadata = {
  title: "特定商取引法に基づく表記",
  description:
    "TownLens（街えらびレポート）の特定商取引法に基づく表記です。",
  openGraph: {
    title: "特定商取引法に基づく表記",
    description:
      "TownLens（街えらびレポート）の特定商取引法に基づく表記です。",
    images: [{ url: "/api/og", width: 1200, height: 630 }],
  },
};

// TODO: contact@example.com を実際のメールアドレスに差し替える
const COMMERCIAL_ITEMS = [
  { label: "販売業者", value: "田中" },
  { label: "代表者", value: "田中" },
  {
    label: "所在地",
    value: "請求があった場合に遅滞なく開示いたします",
  },
  {
    label: "電話番号",
    value: "請求があった場合に遅滞なく開示いたします",
  },
  { label: "メールアドレス", value: "contact@example.com" },
  { label: "サービスURL", value: "https://townlens.jp" },
  {
    label: "販売価格",
    value:
      "フリープラン: 無料 / スタンダードプラン: 月額 980円（税込）/ プレミアムプラン: 月額 2,980円（税込）",
  },
  {
    label: "支払方法",
    value: "クレジットカード（Stripe 経由）",
  },
  {
    label: "支払時期",
    value: "申込時に初回決済、以降毎月自動課金",
  },
  {
    label: "サービス提供時期",
    value: "決済完了後、即時ご利用いただけます",
  },
  {
    label: "返品・キャンセル",
    value:
      "デジタルサービスのため返品はお受けできません。解約は Stripe Customer Portal（マイページ）より随時可能です。解約月末までサービスをご利用いただけます。",
  },
  {
    label: "動作環境",
    value:
      "モダンブラウザ（Chrome、Firefox、Safari、Edge の最新版）",
  },
] as const;

export default function SpecifiedCommercialPage() {
  return (
    <LegalPageLayout
      title="特定商取引法に基づく表記"
      lastUpdated="2026年2月21日"
    >
      <dl className="divide-y divide-border">
        {COMMERCIAL_ITEMS.map((item) => (
          <div
            key={item.label}
            className="grid grid-cols-1 gap-1 py-4 sm:grid-cols-[160px_1fr] sm:gap-4"
          >
            <dt className="text-sm font-medium">{item.label}</dt>
            <dd className="text-sm text-foreground/80">{item.value}</dd>
          </div>
        ))}
      </dl>
    </LegalPageLayout>
  );
}
