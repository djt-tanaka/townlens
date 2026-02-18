import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-4xl font-bold">404</h1>
      <p className="text-muted-foreground">
        お探しのページが見つかりませんでした。
      </p>
      <Button asChild>
        <Link href="/">トップページに戻る</Link>
      </Button>
    </main>
  );
}
