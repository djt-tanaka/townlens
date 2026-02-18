/**
 * 駅圏ビルダーのテスト。
 * 駅解決 + メッシュ列挙 → 集約データ → ReportRow 変換。
 */
import { describe, it, expect } from "vitest";
import {
  buildStationAreaRows,
  stationRowsToScoringInput,
} from "../../src/station/area-builder";
import type { MeshDataPoint } from "../../src/mesh/types";

/** テスト用のメッシュデータマップを構築する */
function createMeshDataMap(
  entries: ReadonlyArray<{ code: string; population: number; kids: number }>,
): ReadonlyMap<string, MeshDataPoint> {
  const map = new Map<string, MeshDataPoint>();
  for (const entry of entries) {
    map.set(entry.code, {
      meshCode: entry.code,
      population: entry.population,
      kidsPopulation: entry.kids,
      kidsRatio: entry.population > 0 ? (entry.kids / entry.population) * 100 : 0,
    });
  }
  return map;
}

describe("buildStationAreaRows", () => {
  it("駅圏のメッシュデータを集約して ReportRow を返す", () => {
    const meshData = createMeshDataMap([
      { code: "53394525", population: 5000, kids: 500 },
      { code: "53394526", population: 3000, kids: 300 },
      { code: "53394535", population: 2000, kids: 250 },
    ]);

    const rows = buildStationAreaRows(
      [
        {
          stationName: "渋谷",
          meshCodes: ["53394525", "53394526"],
          lat: 35.658,
          lng: 139.702,
          areaCode: "13113",
        },
        {
          stationName: "新宿",
          meshCodes: ["53394535"],
          lat: 35.690,
          lng: 139.701,
          areaCode: "13104",
        },
      ],
      meshData,
      1000,
    );

    expect(rows).toHaveLength(2);

    // 渋谷: 5000+3000 = 8000, 500+300 = 800
    expect(rows[0].cityResolved).toBe("渋谷駅 1000m圏");
    expect(rows[0].total).toBe(8000);
    expect(rows[0].kids).toBe(800);
    expect(rows[0].ratio).toBeCloseTo(10.0, 1);

    // 新宿: 2000, 250
    expect(rows[1].cityResolved).toBe("新宿駅 1000m圏");
    expect(rows[1].total).toBe(2000);
    expect(rows[1].kids).toBe(250);
    expect(rows[1].ratio).toBeCloseTo(12.5, 1);
  });

  it("ランキングが付与される", () => {
    const meshData = createMeshDataMap([
      { code: "53394525", population: 5000, kids: 500 },
      { code: "53394535", population: 2000, kids: 350 },
    ]);

    const rows = buildStationAreaRows(
      [
        { stationName: "A駅", meshCodes: ["53394525"], lat: 0, lng: 0 },
        { stationName: "B駅", meshCodes: ["53394535"], lat: 0, lng: 0 },
      ],
      meshData,
      500,
    );

    // 人口ランキング: A駅(5000) > B駅(2000)
    expect(rows[0].totalRank).toBe(1);
    expect(rows[1].totalRank).toBe(2);

    // 比率ランキング: B駅(17.5%) > A駅(10%)
    expect(rows[0].ratioRank).toBe(2);
    expect(rows[1].ratioRank).toBe(1);
  });

  it("メッシュデータがない駅圏は人口0で返す", () => {
    const meshData = createMeshDataMap([]);

    const rows = buildStationAreaRows(
      [{ stationName: "X駅", meshCodes: ["99999999"], lat: 0, lng: 0 }],
      meshData,
      500,
    );

    expect(rows).toHaveLength(1);
    expect(rows[0].total).toBe(0);
    expect(rows[0].kids).toBe(0);
  });
});

describe("stationRowsToScoringInput", () => {
  it("ReportRow からスコアリング入力を構築する", () => {
    const meshData = createMeshDataMap([
      { code: "53394525", population: 5000, kids: 500 },
    ]);

    const rows = buildStationAreaRows(
      [{ stationName: "渋谷", meshCodes: ["53394525"], lat: 0, lng: 0, areaCode: "13113" }],
      meshData,
      1000,
    );

    const scoringInput = stationRowsToScoringInput(rows, "2020", "0003448233");
    expect(scoringInput).toHaveLength(1);
    expect(scoringInput[0].cityName).toBe("渋谷駅 1000m圏");
    expect(scoringInput[0].indicators).toHaveLength(2);

    const popIndicator = scoringInput[0].indicators.find((i) => i.indicatorId === "population_total");
    expect(popIndicator?.rawValue).toBe(5000);

    const ratioIndicator = scoringInput[0].indicators.find((i) => i.indicatorId === "kids_ratio");
    expect(ratioIndicator?.rawValue).toBeCloseTo(10.0, 1);
  });
});
