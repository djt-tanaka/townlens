/**
 * API クライアント生成関数。
 * SupabaseCacheAdapter を DI で注入し、core の API クライアントを生成する。
 */

import { EstatApiClient, ReinfoApiClient } from "@townlens/core";
import { SupabaseCacheAdapter } from "./supabase-cache";

const cache = new SupabaseCacheAdapter();

export function createEstatClient(): EstatApiClient {
  const appId = process.env.ESTAT_APP_ID;
  if (!appId) {
    throw new Error("ESTAT_APP_ID が未設定です");
  }
  return new EstatApiClient(appId, { cache });
}

export function createReinfoClient(): ReinfoApiClient {
  const apiKey = process.env.REINFOLIB_API_KEY;
  if (!apiKey) {
    throw new Error("REINFOLIB_API_KEY が未設定です");
  }
  return new ReinfoApiClient(apiKey, { cache });
}
