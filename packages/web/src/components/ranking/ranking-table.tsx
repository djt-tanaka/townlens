import Link from "next/link";
import type { RankingEntry } from "@/lib/ranking-data";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const MEDAL = ["", "\u{1F947}", "\u{1F948}", "\u{1F949}"] as const;

function renderStars(rating: number): string {
  const full = Math.round(rating);
  return "\u2605".repeat(full) + "\u2606".repeat(5 - full);
}

function formatPopulation(pop: number | null): string {
  if (pop === null) return "-";
  return new Intl.NumberFormat("ja-JP").format(pop);
}

interface RankingTableProps {
  readonly entries: ReadonlyArray<RankingEntry>;
}

/** TOP 30 ランキングテーブル */
export function RankingTable({ entries }: RankingTableProps) {
  if (entries.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        ランキングデータがまだ生成されていません
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-16 text-center">順位</TableHead>
          <TableHead>都市名</TableHead>
          <TableHead className="hidden sm:table-cell">都道府県</TableHead>
          <TableHead className="text-center">総合評価</TableHead>
          <TableHead className="hidden sm:table-cell text-right">
            人口
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {entries.map((entry) => (
          <TableRow key={entry.areaCode}>
            <TableCell className="text-center font-medium">
              {MEDAL[entry.rank] ?? entry.rank}
            </TableCell>
            <TableCell>
              <Link
                href={`/city/${encodeURIComponent(entry.cityName)}`}
                className="font-medium hover:underline"
              >
                {entry.cityName}
              </Link>
              <span className="ml-1 text-xs text-muted-foreground sm:hidden">
                {entry.prefecture}
              </span>
            </TableCell>
            <TableCell className="hidden sm:table-cell">
              <Badge variant="outline">{entry.prefecture}</Badge>
            </TableCell>
            <TableCell className="text-center">
              <span className="text-amber-500">
                {renderStars(entry.starRating)}
              </span>
              <span className="ml-1 text-xs text-muted-foreground">
                {entry.starRating.toFixed(1)}
              </span>
            </TableCell>
            <TableCell className="hidden sm:table-cell text-right tabular-nums">
              {formatPopulation(entry.population)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
