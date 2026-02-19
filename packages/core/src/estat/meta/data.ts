import { arrify, parseNumber, textFrom } from "../../utils";
import type { DataValue } from "./types";

export function extractDataValues(data: any): DataValue[] {
  const values = arrify(data?.GET_STATS_DATA?.STATISTICAL_DATA?.DATA_INF?.VALUE);
  return values.map((item) => {
    const attrs = Object.entries(item ?? {}).filter(([key]) => key.startsWith("@"));
    const cats: Record<string, string> = {};
    let area: string | undefined;
    let time: string | undefined;

    for (const [key, value] of attrs) {
      const normalizedKey = key.slice(1);
      if (normalizedKey === "area") {
        area = textFrom(value);
      } else if (normalizedKey === "time") {
        time = textFrom(value);
      } else if (normalizedKey.startsWith("cat") || normalizedKey === "tab") {
        cats[normalizedKey] = textFrom(value);
      }
    }

    return {
      area,
      time,
      cats,
      value: parseNumber(item?.$)
    };
  });
}

export function valuesByArea(values: DataValue[], timeCode: string): Map<string, number> {
  const map = new Map<string, number>();

  const filtered = values.filter((value) => {
    if (!value.area) {
      return false;
    }
    if (!value.time) {
      return true;
    }
    return value.time === timeCode;
  });

  for (const row of filtered) {
    if (!row.area || row.value === null) {
      continue;
    }
    // 防御: 同一areaの重複がある場合は最初の値を保持（上書きしない）
    if (!map.has(row.area)) {
      map.set(row.area, row.value);
    }
  }

  return map;
}
