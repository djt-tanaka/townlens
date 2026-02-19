import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface DisclaimerProps {
  readonly hasPriceData?: boolean;
  readonly hasCrimeData?: boolean;
  readonly hasDisasterData?: boolean;
  readonly timeLabel?: string;
}

/** レポート末尾の免責事項・データ出典・データ定義表示 */
export function Disclaimer({
  hasPriceData,
  hasCrimeData,
  hasDisasterData,
  timeLabel,
}: DisclaimerProps) {
  return (
    <section className="space-y-4 rounded-lg border border-muted bg-muted/30 p-4">
      <h3 className="text-sm font-semibold text-muted-foreground">
        データ出典・免責事項
      </h3>

      {/* 免責事項 */}
      <ul className="list-inside list-disc space-y-1 text-xs text-muted-foreground">
        <li>
          スコアは候補セット内での相対比較値（0-100）であり、全国順位ではありません。候補を変えるとスコアも変動します。
        </li>
        <li>
          信頼度はデータの鮮度・欠損率・サンプル数に基づく参考指標です。
        </li>
        <li>
          本レポートは統計データに基づく参考情報であり、不動産取引や居住地選択の最終判断を保証するものではありません。最新のデータや個別の事情については、各自治体や専門家にご確認ください。
        </li>
      </ul>

      {/* データソーステーブル */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[180px]">データソース</TableHead>
            <TableHead>内容</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell className="text-xs">
              <a
                href="https://www.e-stat.go.jp/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-foreground"
              >
                e-Stat（政府統計総合窓口）
              </a>
            </TableCell>
            <TableCell className="text-xs">
              人口・世帯統計（総人口、年少人口比率）
              {timeLabel && (
                <span className="text-muted-foreground">
                  {" "}
                  — 時点: {timeLabel}
                </span>
              )}
            </TableCell>
          </TableRow>
          {(hasPriceData || hasCrimeData || hasDisasterData) && (
            <TableRow>
              <TableCell className="text-xs">
                <a
                  href="https://www.reinfolib.mlit.go.jp/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-foreground"
                >
                  不動産情報ライブラリ（国土交通省）
                </a>
              </TableCell>
              <TableCell className="text-xs">
                {[
                  hasPriceData && "不動産取引価格",
                  hasCrimeData && "刑法犯認知件数",
                  hasDisasterData && "災害リスク・避難場所",
                ]
                  .filter(Boolean)
                  .join("、")}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {/* データ定義テーブル */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[140px]">指標</TableHead>
            <TableHead className="w-[60px]">単位</TableHead>
            <TableHead>算出方法</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell className="text-xs">総人口</TableCell>
            <TableCell className="text-xs">人</TableCell>
            <TableCell className="text-xs">
              国勢調査ベースの総人口
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="text-xs">年少人口比率</TableCell>
            <TableCell className="text-xs">%</TableCell>
            <TableCell className="text-xs">
              15歳未満人口 / 総人口 × 100
            </TableCell>
          </TableRow>
          {hasPriceData && (
            <TableRow>
              <TableCell className="text-xs">取引価格中央値</TableCell>
              <TableCell className="text-xs">万円</TableCell>
              <TableCell className="text-xs">
                直近の不動産取引価格の中央値
              </TableCell>
            </TableRow>
          )}
          {hasCrimeData && (
            <TableRow>
              <TableCell className="text-xs">犯罪率</TableCell>
              <TableCell className="text-xs">件/千人</TableCell>
              <TableCell className="text-xs">
                刑法犯認知件数 / 人口(千人)
              </TableCell>
            </TableRow>
          )}
          {hasDisasterData && (
            <>
              <TableRow>
                <TableCell className="text-xs">災害リスク</TableCell>
                <TableCell className="text-xs">スコア</TableCell>
                <TableCell className="text-xs">
                  洪水浸水・土砂災害リスクの複合スコア
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="text-xs">避難場所数</TableCell>
                <TableCell className="text-xs">箇所</TableCell>
                <TableCell className="text-xs">
                  指定緊急避難場所の登録数
                </TableCell>
              </TableRow>
            </>
          )}
        </TableBody>
      </Table>
    </section>
  );
}
