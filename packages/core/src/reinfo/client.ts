import axios, { AxiosInstance } from "axios";
import { AppError } from "../errors";
import { ReinfoTradeRecord, ReinfoTradeResponse, ReinfoCityRecord } from "./types";
import type { TileCoord, GeoJsonFeatureCollection } from "./disaster-client";
import type { CacheAdapter } from "../cache";
import { DEFAULT_CACHE_TTL_MS } from "../cache";

const MAX_RETRIES = 3;
const INITIAL_DELAY_MS = 1000;

function isRetryableError(error: unknown): boolean {
  if (!axios.isAxiosError(error)) {
    return false;
  }
  if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
    return true;
  }
  const status = error.response?.status;
  if (status === 429 || (status !== undefined && status >= 500)) {
    return true;
  }
  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class ReinfoApiClient {
  private readonly http: AxiosInstance;
  private readonly cache?: CacheAdapter;

  constructor(
    private readonly apiKey: string,
    options?: { cache?: CacheAdapter },
  ) {
    if (!apiKey) {
      throw new AppError("不動産情報ライブラリのAPIキーが空です", [
        "REINFOLIB_API_KEY を設定してください。",
      ]);
    }

    this.cache = options?.cache;
    this.http = axios.create({
      baseURL: "https://www.reinfolib.mlit.go.jp/ex-api/external/",
      timeout: 30000,
      headers: {
        "Ocp-Apim-Subscription-Key": apiKey,
      },
    });
  }

  private async request<T>(endpoint: string, params: Record<string, string | undefined>): Promise<T> {
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([, v]) => v !== undefined)
    );
    let lastError: unknown;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const response = await this.http.get(endpoint, { params: cleanParams });
        return response.data as T;
      } catch (error) {
        lastError = error;

        if (!isRetryableError(error) || attempt >= MAX_RETRIES - 1) {
          break;
        }

        const delayMs = INITIAL_DELAY_MS * Math.pow(2, attempt);
        await sleep(delayMs);
      }
    }

    if (axios.isAxiosError(lastError)) {
      const status = lastError.response?.status;
      if (status === 401) {
        throw new AppError("不動産情報ライブラリAPIの認証に失敗しました", [
          "REINFOLIB_API_KEY が正しいか確認してください。",
          "APIキー申請: https://www.reinfolib.mlit.go.jp/api/request/",
        ]);
      }
      throw new AppError("不動産情報ライブラリAPIへの通信に失敗しました", [
        `HTTPエラー: ${lastError.message}`,
        `${MAX_RETRIES}回リトライしましたが成功しませんでした。`,
      ]);
    }

    throw lastError;
  }

  /** XIT001: 不動産価格情報取得 */
  async fetchTrades(params: {
    year: string;
    city: string;
    quarter?: string;
    priceClassification?: string;
  }): Promise<ReadonlyArray<ReinfoTradeRecord>> {
    const cacheKey = `reinfo:trades:${params.city}:${params.year}:${params.quarter ?? ""}`;
    if (this.cache) {
      const cached = await this.cache.get<ReadonlyArray<ReinfoTradeRecord>>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const response = await this.request<ReinfoTradeResponse>("XIT001", {
      year: params.year,
      city: params.city,
      quarter: params.quarter,
      priceClassification: params.priceClassification,
    });
    const result = response.data ?? [];

    if (this.cache) {
      await this.cache.set(cacheKey, result, DEFAULT_CACHE_TTL_MS);
    }

    return result;
  }

  /** XIT002: 都道府県内市区町村一覧 */
  async fetchCities(area: string): Promise<ReadonlyArray<ReinfoCityRecord>> {
    const cacheKey = `reinfo:cities:${area}`;
    if (this.cache) {
      const cached = await this.cache.get<ReadonlyArray<ReinfoCityRecord>>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const response = await this.request<{ data: ReadonlyArray<ReinfoCityRecord> }>("XIT002", {
      area,
    });
    const result = response.data ?? [];

    if (this.cache) {
      await this.cache.set(cacheKey, result, DEFAULT_CACHE_TTL_MS);
    }

    return result;
  }

  /** 防災タイルAPI（XKT026/XKT029/XGT001等）からGeoJSONを取得 */
  async fetchTile(endpoint: string, tile: TileCoord): Promise<GeoJsonFeatureCollection> {
    return this.request<GeoJsonFeatureCollection>(endpoint, {
      response_format: "geojson",
      z: String(tile.z),
      x: String(tile.x),
      y: String(tile.y),
    });
  }
}
