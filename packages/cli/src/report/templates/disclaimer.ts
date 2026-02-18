import { escapeHtml } from "@townlens/core";

export interface DisclaimerModel {
  readonly statsDataId: string;
  readonly timeLabel: string;
  readonly generatedAt: string;
  /** Phase 1: 不動産価格データが含まれるか */
  readonly hasPriceData?: boolean;
  /** Phase 2a: 犯罪統計データが含まれるか */
  readonly hasCrimeData?: boolean;
  /** Phase 2b: 災害リスクデータが含まれるか */
  readonly hasDisasterData?: boolean;
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
            <tr><td>レポート生成日時</td><td>${escapeHtml(model.generatedAt)}</td></tr>${model.hasPriceData ? `
            <tr><td>不動産価格データ</td><td>国土交通省 不動産情報ライブラリ API (XIT001)</td></tr>` : ""}${model.hasCrimeData ? `
            <tr><td>犯罪統計データ</td><td>e-Stat 社会・人口統計体系</td></tr>` : ""}${model.hasDisasterData ? `
            <tr><td>災害リスクデータ</td><td>国土交通省 不動産情報ライブラリ API (XKT026/XKT029/XGT001)</td></tr>` : ""}
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
            <tr><td>0-14歳比率</td><td>(0-14歳人口 / 総人口) × 100</td><td>%</td></tr>${model.hasPriceData ? `
            <tr><td>中古マンション価格</td><td>不動産情報ライブラリ「中古マンション等」取引価格の中央値</td><td>万円</td></tr>
            <tr><td>価格レンジ</td><td>第1四分位(Q25)〜第3四分位(Q75)</td><td>万円</td></tr>` : ""}${model.hasCrimeData ? `
            <tr><td>刑法犯認知件数</td><td>人口千人当たりの刑法犯認知件数</td><td>件/千人</td></tr>` : ""}${model.hasDisasterData ? `
            <tr><td>洪水・土砂災害リスク</td><td>代表地点（市役所位置）での洪水浸水想定区域・土砂災害警戒区域の有無（0=なし, 1=一方, 2=両方）</td><td>リスクスコア</td></tr>
            <tr><td>避難場所数</td><td>代表地点周辺の指定緊急避難場所数</td><td>箇所</td></tr>` : ""}
            <tr><td>候補内スコア</td><td>候補セット内 min-max 正規化</td><td>0-100</td></tr>
            <tr><td>パーセンタイル</td><td>候補セット内での相対位置</td><td>%</td></tr>
          </tbody>
        </table>
      </div>
    </section>`;
}
