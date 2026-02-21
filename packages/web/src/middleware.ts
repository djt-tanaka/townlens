import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // 認証が必要なルートのみでセッションリフレッシュを実行。
    // ISR 公開ページ（/, /prefecture, /city, /ranking, /pricing）は除外し、
    // CDN キャッシュが Set-Cookie で無効化されるのを防ぐ。
    "/dashboard/:path*",
    "/report/:path*",
    "/auth/:path*",
    "/api/((?!og).*)",
  ],
};
