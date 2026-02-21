import type { Metadata } from "next";
import {
  LegalPageLayout,
  LegalSection,
} from "@/components/legal/legal-page-layout";

export const metadata: Metadata = {
  title: "プライバシーポリシー",
  description:
    "TownLens（街えらびレポート）のプライバシーポリシーです。個人情報の取り扱いについて説明します。",
  openGraph: {
    title: "プライバシーポリシー",
    description:
      "TownLens（街えらびレポート）のプライバシーポリシーです。個人情報の取り扱いについて説明します。",
    images: [{ url: "/api/og", width: 1200, height: 630 }],
  },
};

// TODO: contact@example.com を実際のメールアドレスに差し替える
export default function PrivacyPage() {
  return (
    <LegalPageLayout
      title="プライバシーポリシー"
      lastUpdated="2026年2月21日"
    >
      <p>
        TownLens（以下「本サービス」）は、ユーザーの個人情報の保護を重要と考え、以下のとおりプライバシーポリシーを定めます。
      </p>

      <LegalSection title="1. 事業者情報">
        <p>
          サービス名: TownLens（街えらびレポート）
          <br />
          運営者: 田中
          <br />
          お問い合わせ: contact@example.com
        </p>
      </LegalSection>

      <LegalSection title="2. 収集する個人情報">
        <p>本サービスでは、以下の個人情報を収集します。</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>
            <strong>メールアドレス</strong>:
            アカウント認証およびログインに必要です（Supabase
            Auth を使用）
          </li>
          <li>
            <strong>表示名</strong>（任意）:
            サービス内での表示に使用します
          </li>
          <li>
            <strong>決済情報</strong>: Stripe
            を通じて処理されるクレジットカード情報（当方のサーバーにはカード情報を保存しません。Stripe
            の顧客IDおよびサブスクリプションIDのみ保持します）
          </li>
          <li>
            <strong>利用履歴</strong>:
            レポートの生成履歴（比較都市名、プリセット、結果データ）および月間利用回数
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="3. 個人情報の利用目的">
        <p>収集した個人情報は、以下の目的で利用します。</p>
        <ol className="list-decimal space-y-1 pl-6">
          <li>アカウントの認証・ログイン処理</li>
          <li>有料プランの決済処理および契約管理</li>
          <li>
            サービスに関する重要なお知らせの送信（規約変更、メンテナンス通知等）
          </li>
          <li>利用状況の分析およびサービスの改善</li>
          <li>お問い合わせへの対応</li>
          <li>プラン別の利用制限の管理（月間レポート数等）</li>
        </ol>
        <p className="text-xs text-muted-foreground">
          ※
          広告目的のメール送信は行いません。メールアドレスは上記目的以外では使用しません。
        </p>
      </LegalSection>

      <LegalSection title="4. 個人情報の第三者提供">
        <p>
          当方は、以下の場合を除き、ユーザーの個人情報を第三者に提供しません。
        </p>
        <ul className="list-disc space-y-1 pl-6">
          <li>
            <strong>Stripe, Inc.</strong>:
            決済処理のため、メールアドレスおよび決済関連情報を共有します
          </li>
          <li>
            <strong>Supabase, Inc.</strong>:
            認証およびデータ保管のため、メールアドレスおよびアカウント情報を共有します
          </li>
          <li>法令に基づく開示要請があった場合</li>
          <li>ユーザー本人の同意がある場合</li>
        </ul>
      </LegalSection>

      <LegalSection title="5. 個人情報の管理">
        <ol className="list-decimal space-y-1 pl-6">
          <li>
            ユーザーの個人情報は、Supabase（AWS
            インフラ上）で安全に保管されます。
          </li>
          <li>
            通信はすべてSSL/TLSにより暗号化されています。
          </li>
          <li>
            クレジットカード情報は当方のサーバーに保存されず、Stripe
            によって PCI DSS に準拠した形で管理されます。
          </li>
        </ol>
      </LegalSection>

      <LegalSection title="6. Cookieおよびアクセス解析">
        <ol className="list-decimal space-y-1 pl-6">
          <li>
            本サービスでは、認証セッションの管理のために Cookie
            を使用します。
          </li>
          <li>
            サービスの改善を目的として、アクセスログ（IPアドレス、ブラウザ情報、アクセス日時等）を収集する場合があります。
          </li>
        </ol>
      </LegalSection>

      <LegalSection title="7. 個人情報の開示・訂正・削除">
        <ol className="list-decimal space-y-1 pl-6">
          <li>
            ユーザーは、ダッシュボードからご自身のアカウント情報を確認・変更できます。
          </li>
          <li>
            アカウントの削除を希望される場合は、お問い合わせ窓口（contact@example.com）までご連絡ください。アカウント削除時には、関連するすべての個人情報を削除します。
          </li>
        </ol>
      </LegalSection>

      <LegalSection title="8. お問い合わせ窓口">
        <p>
          個人情報の取り扱いに関するお問い合わせは、以下の窓口までご連絡ください。
        </p>
        <p>
          メールアドレス: contact@example.com
        </p>
      </LegalSection>

      <LegalSection title="9. ポリシーの変更">
        <ol className="list-decimal space-y-1 pl-6">
          <li>
            当方は、必要に応じて本ポリシーを変更できるものとします。変更後のポリシーは、本サービス上での掲載をもって効力を生じます。
          </li>
          <li>
            重要な変更がある場合は、登録メールアドレスへの通知またはサービス上での告知を行います。
          </li>
        </ol>
      </LegalSection>
    </LegalPageLayout>
  );
}
