import { escapeHtml } from "../../utils";

export interface DisclaimerModel {
  readonly statsDataId: string;
  readonly timeLabel: string;
  readonly generatedAt: string;
}

export function renderDisclaimer(model: DisclaimerModel): string {
  return `
    <section class="page">
      <h2>免責事項・出典・データ定義</h2>

      <h3>免責事項</h3>
      <div class="note" style="margin-bottom:16px;">
        <ul style="padding-left:16px;">
          <li>本レポートは公的データをもとにした参考情報であり、特定の不動産取引・投資判断・災害安全性を保証するものではありません。</li>
          <li>データには更新時点・欠損・定義差があり、個別事情によって実態と異なる場合があります。</li>
          <li>スコアは候補セット内の相対比較値であり、絶対的な評価ではありません。</li>
        </ul>
      </div>

      <h3>出典</h3>
      <div class="note" style="margin-bottom:16px;">
        <table>
          <thead>
            <tr><th>項目</th><th>内容</th></tr>
          </thead>
          <tbody>
            <tr><td>データソース</td><td>政府統計の総合窓口（e-Stat） API</td></tr>
            <tr><td>統計表ID</td><td>${escapeHtml(model.statsDataId)}</td></tr>
            <tr><td>対象時点</td><td>${escapeHtml(model.timeLabel)}</td></tr>
            <tr><td>レポート生成日時</td><td>${escapeHtml(model.generatedAt)}</td></tr>
          </tbody>
        </table>
      </div>

      <h3>データ定義</h3>
      <div class="note">
        <table>
          <thead>
            <tr><th>指標</th><th>定義</th><th>単位</th></tr>
          </thead>
          <tbody>
            <tr><td>総人口</td><td>e-Stat 人口統計の「総数」カテゴリ</td><td>人</td></tr>
            <tr><td>0-14歳比率</td><td>(0-14歳人口 / 総人口) × 100</td><td>%</td></tr>
            <tr><td>候補内スコア</td><td>候補セット内 min-max 正規化</td><td>0-100</td></tr>
            <tr><td>パーセンタイル</td><td>候補セット内での相対位置</td><td>%</td></tr>
          </tbody>
        </table>
      </div>
    </section>`;
}
