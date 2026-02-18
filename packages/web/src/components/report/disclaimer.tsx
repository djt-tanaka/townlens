/** レポート末尾の免責事項・データ出典表示 */
export function Disclaimer() {
  return (
    <section className="rounded-lg border border-muted bg-muted/30 p-4">
      <h3 className="mb-2 text-sm font-semibold text-muted-foreground">
        データ出典・免責事項
      </h3>
      <ul className="space-y-1 text-xs text-muted-foreground">
        <li>
          人口・世帯統計:{" "}
          <a
            href="https://www.e-stat.go.jp/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-foreground"
          >
            e-Stat（政府統計総合窓口）
          </a>
        </li>
        <li>
          不動産取引価格・災害リスク:{" "}
          <a
            href="https://www.reinfolib.mlit.go.jp/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-foreground"
          >
            不動産情報ライブラリ（国土交通省）
          </a>
        </li>
      </ul>
      <p className="mt-2 text-xs text-muted-foreground">
        本レポートは統計データに基づく参考情報であり、不動産取引や居住地選択の最終判断を保証するものではありません。
        最新のデータや個別の事情については、各自治体や専門家にご確認ください。
      </p>
    </section>
  );
}
