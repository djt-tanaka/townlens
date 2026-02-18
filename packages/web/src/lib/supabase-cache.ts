/**
 * CacheAdapter の Supabase 実装。
 * api_cache テーブルに JSONB でデータを保存し、expires_at で TTL を管理する。
 * admin クライアント（service_role）を使用して RLS をバイパスする。
 *
 * 参照: packages/cli/src/cache/file-cache.ts（CLI 用の FileCacheAdapter）
 */

import type { CacheAdapter } from "@townlens/core";
import { createAdminClient } from "./supabase/admin";

export class SupabaseCacheAdapter implements CacheAdapter {
  async get<T>(key: string): Promise<T | null> {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("api_cache")
      .select("data, expires_at")
      .eq("cache_key", key)
      .single();

    if (error || !data) return null;

    // 期限切れチェック
    if (new Date(data.expires_at) < new Date()) {
      // 期限切れデータを非同期で削除（レスポンスを待たない）
      void supabase.from("api_cache").delete().eq("cache_key", key);
      return null;
    }

    return data.data as T;
  }

  async set<T>(key: string, value: T, ttlMs: number): Promise<void> {
    const supabase = createAdminClient();
    const expiresAt = new Date(Date.now() + ttlMs).toISOString();

    const { error } = await supabase.from("api_cache").upsert({
      cache_key: key,
      data: JSON.parse(JSON.stringify(value)),
      expires_at: expiresAt,
      created_at: new Date().toISOString(),
    });

    if (error) {
      // キャッシュ書き込み失敗はログのみ（致命的でない）
      console.error("キャッシュ書き込みエラー:", error.message);
    }
  }
}
