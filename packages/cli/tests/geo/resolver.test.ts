import { describe, it, expect } from "vitest";
import { buildMeshTargets } from "../../src/geo/resolver";
import type { MeshDataPoint } from "../../src/mesh/types";
import type { MeshTarget } from "../../src/geo/types";

describe("buildMeshTargets", () => {
  const meshData: ReadonlyMap<string, MeshDataPoint> = new Map([
    ["53394525", { meshCode: "53394525", population: 1200, kidsPopulation: 150, kidsRatio: 12.5 }],
    ["53394526", { meshCode: "53394526", population: 800, kidsPopulation: 90, kidsRatio: 11.25 }],
  ]);

  it("メッシュコードからGeoTargetを構築する", () => {
    const targets = buildMeshTargets(["53394525", "53394526"], meshData);

    expect(targets).toHaveLength(2);
    const target = targets[0] as MeshTarget;
    expect(target.kind).toBe("mesh");
    expect(target.meshCode).toBe("53394525");
    expect(target.meshLevel).toBe(3);
    expect(target.id).toBe("53394525");
    expect(target.label).toContain("53394525");
    expect(target.label).toContain("1200");
    expect(target.lat).toBeDefined();
    expect(target.lng).toBeDefined();
  });

  it("人口データがないメッシュもGeoTargetを構築できる", () => {
    const emptyData = new Map<string, MeshDataPoint>();
    const targets = buildMeshTargets(["53394525"], emptyData);

    expect(targets).toHaveLength(1);
    const target = targets[0] as MeshTarget;
    expect(target.kind).toBe("mesh");
    expect(target.label).toBe("メッシュ53394525");
  });

  it("不正なメッシュコードでエラーを投げる", () => {
    expect(() => buildMeshTargets(["invalid"], new Map())).toThrow("不正なメッシュコード");
  });

  it("異なるメッシュレベルのコードを正しく判別する", () => {
    const targets = buildMeshTargets(
      ["5339", "533945", "53394525"],
      new Map(),
    );

    expect(targets).toHaveLength(3);
    expect((targets[0] as MeshTarget).meshLevel).toBe(1);
    expect((targets[1] as MeshTarget).meshLevel).toBe(2);
    expect((targets[2] as MeshTarget).meshLevel).toBe(3);
  });
});
