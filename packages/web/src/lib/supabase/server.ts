/**
 * Server Component / Route Handler 用 Supabase クライアント。
 * Next.js 15 では cookies() が async のため、この関数も async。
 */

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Server Components では setAll が呼ばれると例外が発生する。
            // ミドルウェアでセッションリフレッシュを処理するため無視して問題ない。
          }
        },
      },
    },
  );
}
