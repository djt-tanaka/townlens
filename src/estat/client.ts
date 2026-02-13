import axios, { AxiosInstance } from "axios";
import { CliError } from "../errors";
import { arrify, textFrom } from "../utils";

export interface StatsListItem {
  id: string;
  title: string;
  statName: string;
  surveyDate: string;
}

export interface GetStatsDataParams {
  statsDataId: string;
  cdArea?: string;
  cdTime?: string;
  [key: string]: string | number | undefined;
}

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

export class EstatApiClient {
  private readonly http: AxiosInstance;

  constructor(private readonly appId: string) {
    this.http = axios.create({
      baseURL: "https://api.e-stat.go.jp/rest/3.0/app/json/",
      timeout: 30000
    });
  }

  private async request(endpoint: string, params: Record<string, string | number | undefined>): Promise<any> {
    let lastError: unknown;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const response = await this.http.get(endpoint, {
          params: {
            appId: this.appId,
            lang: "J",
            ...params
          }
        });

        const data = response.data;
        const root = data?.GET_STATS_DATA ?? data?.GET_META_INFO ?? data?.GET_STATS_LIST;
        const result = root?.RESULT;
        const status = String(result?.STATUS ?? "0");
        const errorMsg = textFrom(result?.ERROR_MSG);

        if (status !== "0") {
          throw new CliError(`e-Stat APIエラー(status=${status})`, errorMsg ? [errorMsg] : []);
        }

        return data;
      } catch (error) {
        if (error instanceof CliError) {
          throw error;
        }
        lastError = error;

        if (!isRetryableError(error) || attempt >= MAX_RETRIES - 1) {
          break;
        }

        const delayMs = INITIAL_DELAY_MS * Math.pow(2, attempt);
        await sleep(delayMs);
      }
    }

    if (axios.isAxiosError(lastError)) {
      throw new CliError("e-Stat APIへの通信に失敗しました", [
        `HTTPエラー: ${lastError.message}`,
        `${MAX_RETRIES}回リトライしましたが成功しませんでした。`,
        "ESTAT_APP_ID が有効か確認してください。"
      ]);
    }
    throw lastError;
  }

  async getStatsList(keyword: string, limit = 20): Promise<StatsListItem[]> {
    const data = await this.request("getStatsList", {
      searchWord: keyword,
      limit
    });

    const tableInfos = arrify(
      data?.GET_STATS_LIST?.DATALIST_INF?.TABLE_INF ??
        data?.GET_STATS_LIST?.STATISTICAL_DATA_LIST?.DATA_INF?.TABLE_INF
    );

    return tableInfos
      .map((tableInfo): StatsListItem | null => {
        const id = textFrom(tableInfo?.["@id"]);
        if (!id) {
          return null;
        }
        return {
          id,
          title: textFrom(tableInfo?.TITLE),
          statName: textFrom(tableInfo?.STAT_NAME),
          surveyDate: textFrom(tableInfo?.SURVEY_DATE)
        };
      })
      .filter((item): item is StatsListItem => item !== null);
  }

  async getMetaInfo(statsDataId: string): Promise<any> {
    const data = await this.request("getMetaInfo", { statsDataId });
    return data?.GET_META_INFO?.METADATA_INF ?? data;
  }

  async getStatsData(params: GetStatsDataParams): Promise<any> {
    return this.request("getStatsData", {
      ...params,
      metaGetFlg: "N",
      cntGetFlg: "N",
      limit: 100000
    });
  }
}
