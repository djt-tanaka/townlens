import Link from "next/link";
import { Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface EmptyPrefectureProps {
  readonly prefectureName: string;
}

/** データ未登録の都道府県用プレースホルダー */
export function EmptyPrefecture({ prefectureName }: EmptyPrefectureProps) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
        <Search className="h-10 w-10 text-muted-foreground" />
        <div className="space-y-2">
          <p className="text-lg font-medium">
            {prefectureName}のデータは準備中です
          </p>
          <p className="text-sm text-muted-foreground">
            順次対応エリアを拡大しています。トップページの検索から他の都市を探すこともできます。
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/"
            className="text-sm text-primary underline-offset-4 hover:underline"
          >
            トップページへ
          </Link>
          <Link
            href="/prefecture"
            className="text-sm text-primary underline-offset-4 hover:underline"
          >
            都道府県一覧へ戻る
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
