import { describe, it, expect } from "vitest";
import { mergeTransportIntoScoringInput } from "../../src/estat/merge-transport-scoring";
import { CityIndicators } from "../../src/scoring/types";
import { TransportStats } from "../../src/estat/transport-data";

const baseCities: ReadonlyArray<CityIndicators> = [
  {
    cityName: "世田谷区",
    areaCode: "13112",
    indicators: [
      { indicatorId: "population_total", rawValue: 900000, dataYear: "2020", sourceId: "estat" },
      { indicatorId: "kids_ratio", rawValue: 11.5, dataYear: "2020", sourceId: "estat" },
    ],
  },
  {
    cityName: "渋谷区",
    areaCode: "13113",
    indicators: [
      { indicatorId: "population_total", rawValue: 230000, dataYear: "2020", sourceId: "estat" },
      { indicatorId: "kids_ratio", rawValue: 9.7, dataYear: "2020", sourceId: "estat" },
    ],
  },
];

describe("mergeTransportIntoScoringInput", () => {
  it("交通利便性データを都市の指標に追加する", () => {
    const transportData = new Map<string, TransportStats>([
      ["13112", { stationCountPerCapita: 0.2, terminalAccessKm: 5.3, dataYear: "2022" }],
      ["13113", { stationCountPerCapita: 0.44, terminalAccessKm: 1.2, dataYear: "2022" }],
    ]);

    const result = mergeTransportIntoScoringInput(baseCities, transportData);

    expect(result).toHaveLength(2);
    const setagaya = result.find((c) => c.areaCode === "13112")!;
    expect(setagaya.indicators).toHaveLength(4);

    const stationCount = setagaya.indicators.find((i) => i.indicatorId === "station_count_per_capita")!;
    expect(stationCount.rawValue).toBe(0.2);
    expect(stationCount.sourceId).toBe("estat");
    expect(stationCount.dataYear).toBe("2022");

    const terminalAccess = setagaya.indicators.find((i) => i.indicatorId === "terminal_access_km")!;
    expect(terminalAccess.rawValue).toBe(5.3);
    expect(terminalAccess.sourceId).toBe("static");
  });

  it("交通データがない都市はnull値で追加する", () => {
    const transportData = new Map<string, TransportStats>([
      ["13112", { stationCountPerCapita: 0.2, terminalAccessKm: 5.3, dataYear: "2022" }],
    ]);

    const result = mergeTransportIntoScoringInput(baseCities, transportData);

    const shibuya = result.find((c) => c.areaCode === "13113")!;
    const stationCount = shibuya.indicators.find((i) => i.indicatorId === "station_count_per_capita")!;
    expect(stationCount.rawValue).toBeNull();
    expect(stationCount.dataYear).toBe("");

    const terminalAccess = shibuya.indicators.find((i) => i.indicatorId === "terminal_access_km")!;
    expect(terminalAccess.rawValue).toBeNull();
  });

  it("元のCityIndicatorsを変更しない（不変性）", () => {
    const transportData = new Map<string, TransportStats>([
      ["13112", { stationCountPerCapita: 0.2, terminalAccessKm: 5.3, dataYear: "2022" }],
    ]);

    const result = mergeTransportIntoScoringInput(baseCities, transportData);

    expect(baseCities[0].indicators).toHaveLength(2);
    expect(result[0].indicators).toHaveLength(4);
    expect(result[0]).not.toBe(baseCities[0]);
  });

  it("空のtransportDataでも全都市にnull指標を追加する", () => {
    const transportData = new Map<string, TransportStats>();

    const result = mergeTransportIntoScoringInput(baseCities, transportData);

    for (const city of result) {
      expect(city.indicators).toHaveLength(4);
      const stationCount = city.indicators.find((i) => i.indicatorId === "station_count_per_capita")!;
      expect(stationCount.rawValue).toBeNull();
      const terminalAccess = city.indicators.find((i) => i.indicatorId === "terminal_access_km")!;
      expect(terminalAccess.rawValue).toBeNull();
    }
  });

  it("空の都市配列で空配列を返す", () => {
    const result = mergeTransportIntoScoringInput([], new Map());
    expect(result).toEqual([]);
  });
});
