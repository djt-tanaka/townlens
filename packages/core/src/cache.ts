/** キャッシュアダプタのインターフェース */
export interface CacheAdapter {
  /** キャッシュからデータを取得。期限切れ or 未存在は null */
  get<T>(key: string): Promise<T | null>;
  /** キャッシュにデータを保存 */
  set<T>(key: string, value: T, ttlMs: number): Promise<void>;
}

/** デフォルトTTL: 7日間 */
export const DEFAULT_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
