/**
 * Route Handler 用の認証ヘルパー関数。
 */

import { NextResponse } from "next/server";
import type { User, SupabaseClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

interface AuthResult {
  readonly user: User;
  readonly supabase: SupabaseClient<Database>;
}

/**
 * 認証ユーザーを取得する。未認証なら null を返す。
 */
export async function getAuthUser(): Promise<User | null> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/**
 * 認証を必須とする Route Handler で使用する。
 * 未認証の場合は 401 レスポンスを返す。
 * 認証済みの場合は user と supabase クライアントを返す。
 */
export async function requireAuth(): Promise<AuthResult | NextResponse> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "認証が必要です" },
      { status: 401 },
    );
  }

  return { user, supabase };
}
