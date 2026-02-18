/**
 * ファイルシステムベースのキャッシュアダプタ。
 * `.cache/` ディレクトリにJSONファイルとして保存し、TTLで鮮度を管理する。
 */

import fs from "node:fs/promises";
import path from "node:path";
import type { CacheAdapter } from "@townlens/core";

const CACHE_ROOT = path.resolve(".cache");

/** エンベロープ形式でTTL情報も保存 */
interface CacheEnvelope<T> {
  readonly data: T;
  readonly expiresAt: number;
}

export class FileCacheAdapter implements CacheAdapter {
  async get<T>(key: string): Promise<T | null> {
    const filePath = this.keyToPath(key);
    try {
      const content = await fs.readFile(filePath, "utf8");
      const envelope = JSON.parse(content) as CacheEnvelope<T>;
      if (Date.now() > envelope.expiresAt) {
        return null;
      }
      return envelope.data;
    } catch {
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlMs: number): Promise<void> {
    const filePath = this.keyToPath(key);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    const envelope: CacheEnvelope<T> = {
      data: value,
      expiresAt: Date.now() + ttlMs,
    };
    await fs.writeFile(filePath, `${JSON.stringify(envelope, null, 2)}\n`, "utf8");
  }

  private keyToPath(key: string): string {
    // "estat:meta:0000010001" → ".cache/estat/meta_0000010001.json"
    const sanitized = key.replace(/:/g, "/").replace(/\//g, path.sep);
    const parts = sanitized.split(path.sep);
    const filename = parts.pop() ?? "unknown";
    const dir = parts.join(path.sep);
    return path.join(CACHE_ROOT, dir, `${filename}.json`);
  }
}
