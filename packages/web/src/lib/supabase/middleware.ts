/**
 * Next.js ミドルウェアでのセッションリフレッシュ処理。
 * リクエスト/レスポンス双方にクッキーを設定することで、
 * Supabase Auth のトークンリフレッシュを正しく動作させる。
 */

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // リクエストのクッキーを更新（下流の Server Components が新しいトークンを参照できるように）
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          // レスポンスを再生成してクッキーを含める
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // getUser() を呼ぶことでトークンリフレッシュが発動する。
  // getSession() ではリフレッシュされないため必ず getUser() を使用する。
  await supabase.auth.getUser();

  return supabaseResponse;
}
