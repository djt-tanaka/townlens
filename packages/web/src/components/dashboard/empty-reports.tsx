import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/** レポートが1件もない場合の空状態表示 */
export function EmptyReports() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
        <p className="text-lg font-medium">まだレポートがありません</p>
        <p className="text-sm text-muted-foreground">
          街を比較して最初のレポートを作成しましょう
        </p>
        <Button asChild className="bg-warm-coral text-white hover:bg-warm-coral/90">
          <Link href="/">街を比べてみる</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
