import type { Metadata } from "next";
import {
  LegalPageLayout,
  LegalSection,
} from "@/components/legal/legal-page-layout";

export const metadata: Metadata = {
  title: "利用規約",
  description: "TownLens（街えらびレポート）のサービス利用規約です。",
  openGraph: {
    title: "利用規約",
    description: "TownLens（街えらびレポート）のサービス利用規約です。",
    images: [{ url: "/api/og", width: 1200, height: 630 }],
  },
};

export default function TermsPage() {
  return (
    <LegalPageLayout title="利用規約" lastUpdated="2026年2月21日">
      <p>
        この利用規約（以下「本規約」）は、TownLens（以下「本サービス」）の利用に関する条件を、本サービスを提供する運営者（以下「当方」）とユーザーの間で定めるものです。本サービスをご利用いただく際には、本規約に同意いただいたものとみなします。
      </p>

      <LegalSection title="第1条（適用）">
        <p>
          本規約は、ユーザーと当方との間の本サービスの利用に関わる一切の関係に適用されます。当方が本サービス上で掲載する個別の利用条件は、本規約の一部を構成するものとします。
        </p>
      </LegalSection>

      <LegalSection title="第2条（定義）">
        <p>本規約において、以下の用語は次の意味で使用します。</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>
            「本サービス」: 当方が提供する TownLens
            （政府統計ベースの都市比較レポートサービス）
          </li>
          <li>「ユーザー」: 本サービスを利用するすべての方</li>
          <li>
            「有料プラン」:
            スタンダードプランおよびプレミアムプランを指します
          </li>
          <li>
            「レポート」:
            本サービスが生成する都市比較スコアリング結果を指します
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="第3条（アカウント登録）">
        <ol className="list-decimal space-y-1 pl-6">
          <li>
            ユーザーは、メールアドレスとパスワードを登録することでアカウントを作成できます。
          </li>
          <li>
            ユーザーは、正確かつ最新の情報を提供する義務を負います。
          </li>
          <li>
            アカウントの管理責任はユーザー自身にあり、第三者への貸与・譲渡はできません。
          </li>
          <li>
            当方は、ユーザーが本規約に違反した場合、事前の通知なくアカウントを停止または削除できるものとします。
          </li>
        </ol>
      </LegalSection>

      <LegalSection title="第4条（料金・支払い）">
        <ol className="list-decimal space-y-1 pl-6">
          <li>
            本サービスには、フリープラン（無料）、スタンダードプラン（月額
            980円・税込）、プレミアムプラン（月額 2,980円・税込）があります。
          </li>
          <li>
            有料プランの決済は、Stripe
            を通じたクレジットカード払いで行われます。
          </li>
          <li>
            料金は申込時に初回決済が行われ、以降は毎月自動的に課金されます。
          </li>
          <li>
            各プランの機能や制限事項は、料金プランページに記載のとおりとします。
          </li>
        </ol>
      </LegalSection>

      <LegalSection title="第5条（返金ポリシー）">
        <ol className="list-decimal space-y-1 pl-6">
          <li>
            有料プランの返金を希望される場合は、Stripe Customer
            Portal（マイページからアクセス可能）より手続きを行ってください。
          </li>
          <li>原則として、日割りでの返金は行いません。</li>
          <li>
            解約手続き後も、当該請求期間の末日までは有料プランの機能をご利用いただけます。
          </li>
          <li>
            解約後は自動的にフリープランにダウングレードされます。
          </li>
        </ol>
      </LegalSection>

      <LegalSection title="第6条（解約）">
        <ol className="list-decimal space-y-1 pl-6">
          <li>
            ユーザーは、いつでも有料プランを解約することができます。解約は
            Stripe Customer Portal より行ってください。
          </li>
          <li>
            アカウント自体の削除を希望される場合は、お問い合わせ窓口までご連絡ください。
          </li>
        </ol>
      </LegalSection>

      <LegalSection title="第7条（禁止事項）">
        <p>
          ユーザーは、本サービスの利用にあたり、以下の行為をしてはなりません。
        </p>
        <ul className="list-disc space-y-1 pl-6">
          <li>法令または公序良俗に違反する行為</li>
          <li>
            本サービスのサーバーやネットワークに過度な負荷をかける行為（スクレイピング等を含む）
          </li>
          <li>本サービスへの不正アクセスまたはその試み</li>
          <li>レポートの無断転載、二次販売、商業目的での再配布</li>
          <li>他のユーザーまたは第三者の権利を侵害する行為</li>
          <li>その他、当方が不適切と判断する行為</li>
        </ul>
      </LegalSection>

      <LegalSection title="第8条（知的財産権）">
        <ol className="list-decimal space-y-1 pl-6">
          <li>
            本サービスで使用する統計データは、政府統計（e-Stat）および不動産情報ライブラリ等の公開データに基づいています。各データの著作権は原著作者に帰属します。
          </li>
          <li>
            本サービスのUI、デザイン、スコアリングアルゴリズムに関する知的財産権は当方に帰属します。
          </li>
          <li>
            ユーザーは、個人的な利用の範囲内でレポートを自由にご利用いただけます。
          </li>
        </ol>
      </LegalSection>

      <LegalSection title="第9条（免責事項）">
        <ol className="list-decimal space-y-1 pl-6">
          <li>
            当方は、本サービスで提供するレポートおよびスコアリング結果の正確性、完全性、最新性を保証するものではありません。
          </li>
          <li>
            ユーザーが本サービスの情報に基づいて行った判断や行動について、当方は一切の責任を負いません。
          </li>
          <li>
            天災、システム障害、第三者による攻撃等の不可抗力によるサービスの中断について、当方は責任を負いません。
          </li>
        </ol>
      </LegalSection>

      <LegalSection title="第10条（サービスの変更・中断・終了）">
        <ol className="list-decimal space-y-1 pl-6">
          <li>
            当方は、ユーザーへの事前通知により、本サービスの内容を変更、中断、または終了することができるものとします。
          </li>
          <li>
            緊急の場合は、事前通知なくサービスを中断できるものとします。
          </li>
        </ol>
      </LegalSection>

      <LegalSection title="第11条（規約の変更）">
        <ol className="list-decimal space-y-1 pl-6">
          <li>
            当方は、必要に応じて本規約を変更できるものとします。変更後の規約は、本サービス上での掲載をもって効力を生じます。
          </li>
          <li>
            重要な変更がある場合は、登録メールアドレスへの通知またはサービス上での告知を行います。
          </li>
        </ol>
      </LegalSection>

      <LegalSection title="第12条（準拠法・管轄裁判所）">
        <ol className="list-decimal space-y-1 pl-6">
          <li>本規約の解釈は、日本法に準拠するものとします。</li>
          <li>
            本サービスに関して紛争が生じた場合、東京地方裁判所を第一審の専属的合意管轄裁判所とします。
          </li>
        </ol>
      </LegalSection>
    </LegalPageLayout>
  );
}
