import { describe, it, expect } from "vitest";
import { aggregateMeshData } from "../../src/mesh/aggregation";
import type { MeshDataPoint } from "../../src/mesh/types";

describe("aggregateMeshData", () => {
  it("複数メッシュの人口を合算する", () => {
    const data = new Map<string, MeshDataPoint>([
      ["53394611", { meshCode: "53394611", population: 1000, kidsPopulation: 100 }],
      ["53394612", { meshCode: "53394612", population: 2000, kidsPopulation: 300 }],
      ["53394621", { meshCode: "53394621", population: 1500, kidsPopulation: 200 }],
    ]);

    const result = aggregateMeshData(data, 3);
    expect(result.totalPopulation).toBe(4500);
    expect(result.totalKids).toBe(600);
    expect(result.kidsRatio).toBeCloseTo(13.33, 1);
    expect(result.meshCount).toBe(3);
    expect(result.coverageRate).toBe(1);
  });

  it("一部メッシュにデータがない場合のカバレッジ率", () => {
    const data = new Map<string, MeshDataPoint>([
      ["53394611", { meshCode: "53394611", population: 1000, kidsPopulation: 100 }],
    ]);

    const result = aggregateMeshData(data, 5);
    expect(result.meshCount).toBe(1);
    expect(result.coverageRate).toBe(0.2);
  });

  it("空のデータはゼロを返す", () => {
    const data = new Map<string, MeshDataPoint>();
    const result = aggregateMeshData(data, 0);
    expect(result.totalPopulation).toBe(0);
    expect(result.totalKids).toBe(0);
    expect(result.kidsRatio).toBe(0);
    expect(result.meshCount).toBe(0);
    expect(result.coverageRate).toBe(0);
  });

  it("子供人口が未定義のメッシュは0として集約する", () => {
    const data = new Map<string, MeshDataPoint>([
      ["53394611", { meshCode: "53394611", population: 1000 }],
      ["53394612", { meshCode: "53394612", population: 2000, kidsPopulation: 200 }],
    ]);

    const result = aggregateMeshData(data, 2);
    expect(result.totalPopulation).toBe(3000);
    expect(result.totalKids).toBe(200);
    expect(result.kidsRatio).toBeCloseTo(6.67, 1);
  });

  it("人口が未定義のメッシュはカウントしない", () => {
    const data = new Map<string, MeshDataPoint>([
      ["53394611", { meshCode: "53394611" }],
      ["53394612", { meshCode: "53394612", population: 2000, kidsPopulation: 200 }],
    ]);

    const result = aggregateMeshData(data, 2);
    expect(result.meshCount).toBe(1);
    expect(result.totalPopulation).toBe(2000);
    expect(result.coverageRate).toBe(0.5);
  });
});
