import Link from "next/link";
import { MapPinOff } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
      <MapPinOff className="h-12 w-12 text-muted-foreground" />
      <h1 className="text-4xl font-bold">404</h1>
      <p className="text-center text-muted-foreground">
        お探しのページが見つかりませんでした。
        <br />
        URLをご確認いただくか、トップページからお探しください。
      </p>
      <div className="flex gap-3">
        <Button asChild>
          <Link href="/">トップページに戻る</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/dashboard">ダッシュボード</Link>
        </Button>
      </div>
    </main>
  );
}
