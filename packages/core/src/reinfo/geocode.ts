import axios from "axios";
import { CityLocation } from "./city-locations";

/** 国土地理院 住所検索APIのレスポンス要素 */
interface GsiGeocodeResult {
  readonly geometry: {
    readonly coordinates: readonly [number, number]; // [lng, lat]
  };
  readonly properties: {
    readonly title: string;
  };
}

const GSI_GEOCODE_URL = "https://msearch.gsi.go.jp/address-search/AddressSearch";
const TIMEOUT_MS = 10000;

/**
 * 国土地理院の住所検索APIで市区町村名から座標を取得する。
 * APIキー不要。取得失敗時はnullを返す。
 */
export async function geocodeCityName(cityName: string): Promise<CityLocation | null> {
  try {
    const response = await axios.get<ReadonlyArray<GsiGeocodeResult>>(GSI_GEOCODE_URL, {
      params: { q: cityName },
      timeout: TIMEOUT_MS,
    });

    const results = response.data;
    if (!Array.isArray(results) || results.length === 0) {
      return null;
    }

    const first = results[0];
    const [lng, lat] = first.geometry.coordinates;
    if (typeof lat !== "number" || typeof lng !== "number") {
      return null;
    }

    return { name: cityName, lat, lng };
  } catch {
    return null;
  }
}
