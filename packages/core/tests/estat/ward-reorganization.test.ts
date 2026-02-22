import { describe, it, expect } from "vitest";
import {
  isReorganizedCode,
  isAbolishedCode,
  expandAreaCodes,
  aggregateRawValues,
  aggregatePerCapitaValues,
  aggregateBooleanValues,
  expandPopulationMap,
} from "../../src/estat/meta/ward-reorganization";

describe("isReorganizedCode", () => {
  it("浜松市の新コードはtrueを返す", () => {
    expect(isReorganizedCode("22138")).toBe(true); // 中央区
    expect(isReorganizedCode("22139")).toBe(true); // 浜名区
    expect(isReorganizedCode("22140")).toBe(true); // 天竜区
  });

  it("6桁コードでも判定できる", () => {
    expect(isReorganizedCode("221384")).toBe(true);
  });

  it("無関係なコードはfalseを返す", () => {
    expect(isReorganizedCode("13101")).toBe(false); // 千代田区
    expect(isReorganizedCode("22130")).toBe(false); // 浜松市（親）
    expect(isReorganizedCode("22131")).toBe(false); // 旧中区
  });
});

describe("isAbolishedCode", () => {
  it("浜松市の旧コードはtrueを返す", () => {
    expect(isAbolishedCode("22131")).toBe(true); // 旧中区
    expect(isAbolishedCode("22132")).toBe(true); // 旧東区
    expect(isAbolishedCode("22133")).toBe(true); // 旧西区
    expect(isAbolishedCode("22134")).toBe(true); // 旧南区
    expect(isAbolishedCode("22135")).toBe(true); // 旧北区
    expect(isAbolishedCode("22136")).toBe(true); // 旧浜北区
    expect(isAbolishedCode("22137")).toBe(true); // 旧天竜区
  });

  it("無関係なコードはfalseを返す", () => {
    expect(isAbolishedCode("13101")).toBe(false);
    expect(isAbolishedCode("22138")).toBe(false); // 新コードは「廃止された」コードではない
  });
});

describe("expandAreaCodes", () => {
  it("再編コードを含む場合、旧コードを追加する", () => {
    const { expandedCodes, newToOldMapping } = expandAreaCodes([
      "22138",
      "13101",
    ]);

    // 22138(中央区)の旧コード 22131,22132,22133,22134 が追加される
    expect(expandedCodes).toContain("22138");
    expect(expandedCodes).toContain("13101");
    expect(expandedCodes).toContain("22131");
    expect(expandedCodes).toContain("22132");
    expect(expandedCodes).toContain("22133");
    expect(expandedCodes).toContain("22134");
    expect(newToOldMapping.size).toBe(1);
  });

  it("全3区を展開する", () => {
    const { expandedCodes, newToOldMapping } = expandAreaCodes([
      "22138",
      "22139",
      "22140",
    ]);

    // 新3コード + 旧7コード = 10
    expect(expandedCodes.length).toBe(10);
    expect(newToOldMapping.size).toBe(3);
  });

  it("再編コードがない場合、変更なし", () => {
    const { expandedCodes, newToOldMapping } = expandAreaCodes([
      "13101",
      "13102",
    ]);

    expect(expandedCodes).toEqual(["13101", "13102"]);
    expect(newToOldMapping.size).toBe(0);
  });

  it("旧コードが既に含まれている場合、重複追加しない", () => {
    const { expandedCodes } = expandAreaCodes(["22138", "22131"]);
    const count22131 = expandedCodes.filter((c) => c === "22131").length;
    expect(count22131).toBe(1);
  });
});

describe("aggregateRawValues", () => {
  it("旧コードの値を新コードに合算する", () => {
    const { newToOldMapping } = expandAreaCodes(["22138"]);
    const dataMap = new Map<string, number | null>([
      ["22131", 10], // 中区
      ["22132", 5], // 東区
      ["22133", 8], // 西区
      ["22134", 3], // 南区
    ]);

    aggregateRawValues(dataMap, newToOldMapping);

    expect(dataMap.get("22138")).toBe(26); // 10 + 5 + 8 + 3
  });

  it("新コードのデータが既にある場合はスキップする", () => {
    const { newToOldMapping } = expandAreaCodes(["22138"]);
    const dataMap = new Map<string, number | null>([
      ["22138", 99], // 新コードのデータが既にある
      ["22131", 10],
      ["22132", 5],
    ]);

    aggregateRawValues(dataMap, newToOldMapping);

    expect(dataMap.get("22138")).toBe(99); // 上書きされない
  });

  it("旧コードに一部データがない場合、存在する分だけ合算する", () => {
    const { newToOldMapping } = expandAreaCodes(["22138"]);
    const dataMap = new Map<string, number | null>([
      ["22131", 10],
      // 22132, 22133, 22134 はデータなし
    ]);

    aggregateRawValues(dataMap, newToOldMapping);

    expect(dataMap.get("22138")).toBe(10);
  });

  it("旧コードに全くデータがない場合、新コードは追加されない", () => {
    const { newToOldMapping } = expandAreaCodes(["22138"]);
    const dataMap = new Map<string, number | null>();

    aggregateRawValues(dataMap, newToOldMapping);

    expect(dataMap.has("22138")).toBe(false);
  });
});

describe("aggregatePerCapitaValues", () => {
  it("人口加重平均で集約する", () => {
    const { newToOldMapping } = expandAreaCodes(["22139"]);
    // 浜名区 = 北区(pop ~92548) + 浜北区(pop ~99960)
    const dataMap = new Map<string, number | null>([
      ["22135", 5.0], // 北区の犯罪率
      ["22136", 3.0], // 浜北区の犯罪率
    ]);

    aggregatePerCapitaValues(dataMap, newToOldMapping);

    const result = dataMap.get("22139")!;
    // 加重平均: (5.0 × 92548 + 3.0 × 99960) / (92548 + 99960) ≈ 3.96
    expect(result).toBeCloseTo(3.96, 1);
  });

  it("新コードが既にある場合はスキップする", () => {
    const { newToOldMapping } = expandAreaCodes(["22139"]);
    const dataMap = new Map<string, number | null>([
      ["22139", 99.9],
      ["22135", 5.0],
      ["22136", 3.0],
    ]);

    aggregatePerCapitaValues(dataMap, newToOldMapping);

    expect(dataMap.get("22139")).toBe(99.9);
  });
});

describe("aggregateBooleanValues", () => {
  it("いずれかがtrueならtrueになる", () => {
    const { newToOldMapping } = expandAreaCodes(["22138"]);
    const dataMap = new Map<string, boolean>([
      ["22131", false],
      ["22132", true],
      ["22133", false],
      ["22134", false],
    ]);

    aggregateBooleanValues(dataMap, newToOldMapping);

    expect(dataMap.get("22138")).toBe(true);
  });

  it("全てfalseならfalseになる", () => {
    const { newToOldMapping } = expandAreaCodes(["22138"]);
    const dataMap = new Map<string, boolean>([
      ["22131", false],
      ["22132", false],
    ]);

    aggregateBooleanValues(dataMap, newToOldMapping);

    expect(dataMap.get("22138")).toBe(false);
  });
});

describe("expandPopulationMap", () => {
  it("旧コードの国勢調査人口を追加する", () => {
    const { newToOldMapping } = expandAreaCodes(["22140"]);
    const populationMap = new Map([["22140", 28000]]);

    const expanded = expandPopulationMap(populationMap, newToOldMapping);

    expect(expanded.get("22140")).toBe(28000);
    expect(expanded.get("22137")).toBe(27632); // 旧天竜区の国勢調査人口
  });
});
