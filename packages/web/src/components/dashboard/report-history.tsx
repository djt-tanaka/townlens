import Link from "next/link";
import { findPreset } from "@townlens/core";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface ReportHistoryProps {
  readonly reports: ReadonlyArray<{
    readonly id: string;
    readonly cities: readonly string[];
    readonly preset: string;
    readonly status: "processing" | "completed" | "failed";
    readonly created_at: string;
  }>;
}

/** ISO 8601 日時文字列を "YYYY/MM/DD HH:mm" にフォーマット */
function formatDate(isoString: string): string {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(isoString));
}

/** プリセット名をラベルに変換（見つからない場合は生の名前を返す） */
function getPresetLabel(presetName: string): string {
  return findPreset(presetName)?.label ?? presetName;
}

const STATUS_CONFIG = {
  completed: { label: "完了", variant: "default" as const },
  processing: { label: "生成中", variant: "secondary" as const },
  failed: { label: "失敗", variant: "destructive" as const },
};

/** レポート履歴テーブル */
export function ReportHistory({ reports }: ReportHistoryProps) {
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">レポート履歴</h2>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>作成日時</TableHead>
              <TableHead>対象都市</TableHead>
              <TableHead>プリセット</TableHead>
              <TableHead className="text-center">ステータス</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reports.map((report) => {
              const statusConfig = STATUS_CONFIG[report.status];
              const cityLabel = report.cities.join("・");
              const isCompleted = report.status === "completed";

              return (
                <TableRow key={report.id}>
                  <TableCell className="whitespace-nowrap text-sm">
                    {formatDate(report.created_at)}
                  </TableCell>
                  <TableCell className="text-sm">
                    {isCompleted ? (
                      <Link
                        href={`/report/${report.id}`}
                        className="text-primary underline-offset-4 hover:underline"
                      >
                        {cityLabel}
                      </Link>
                    ) : (
                      cityLabel
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {getPresetLabel(report.preset)}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={statusConfig.variant}>
                      {statusConfig.label}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
