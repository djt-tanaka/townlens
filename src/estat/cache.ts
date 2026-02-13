import fs from "node:fs/promises";
import path from "node:path";
import { EstatApiClient } from "./client";
import { ensureDir } from "../utils";

const META_CACHE_DIR = path.resolve(".cache", "estat");
const META_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function cachePath(statsDataId: string): string {
  return path.join(META_CACHE_DIR, `meta_${statsDataId}.json`);
}

export async function loadMetaInfoWithCache(client: EstatApiClient, statsDataId: string): Promise<any> {
  await ensureDir(META_CACHE_DIR);
  const filePath = cachePath(statsDataId);

  try {
    const stat = await fs.stat(filePath);
    const age = Date.now() - stat.mtimeMs;
    if (age <= META_TTL_MS) {
      const content = await fs.readFile(filePath, "utf8");
      return JSON.parse(content);
    }
  } catch {
    // ignore and refetch
  }

  const metaInfo = await client.getMetaInfo(statsDataId);
  await fs.writeFile(filePath, `${JSON.stringify(metaInfo, null, 2)}\n`, "utf8");
  return metaInfo;
}
