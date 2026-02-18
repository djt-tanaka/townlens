import { describe, it, expect, vi, beforeEach } from "vitest";
import { runReportPipeline } from "@/lib/report-pipeline";
import type { PipelineInput } from "@/lib/report-pipeline";

// core モジュールのモック
vi.mock("@townlens/core", () => {
  const mockPreset = {
    name: "childcare",
    label: "子育て重視",
    weights: { population_density: 1.0 },
  };

  return {
    buildReportData: vi.fn().mockResolvedValue({
      timeLabel: "2024年",
      rows: [
        { areaCode: "13112", cityResolved: "世田谷区" },
        { areaCode: "13113", cityResolved: "渋谷区" },
      ],
    }),
    toScoringInput: vi.fn().mockReturnValue([
      { areaCode: "13112", cityName: "世田谷区", indicators: {} },
      { areaCode: "13113", cityName: "渋谷区", indicators: {} },
    ]),
    buildPriceData: vi.fn().mockResolvedValue(new Map()),
    mergePriceIntoScoringInput: vi.fn().mockImplementation((input) => input),
    buildCrimeData: vi.fn().mockResolvedValue(new Map()),
    mergeCrimeIntoScoringInput: vi.fn().mockImplementation((input) => input),
    buildDisasterData: vi.fn().mockResolvedValue(new Map()),
    mergeDisasterIntoScoringInput: vi.fn().mockImplementation((input) => input),
    scoreCities: vi.fn().mockReturnValue([
      { areaCode: "13112", cityName: "世田谷区", totalScore: 75 },
      { areaCode: "13113", cityName: "渋谷区", totalScore: 80 },
    ]),
    findPreset: vi.fn().mockReturnValue(mockPreset),
    extractClassObjects: vi.fn().mockReturnValue({}),
    DATASETS: {
      population: { statsDataId: "0003411595", selectors: {} },
      crime: { statsDataId: "0003421913" },
    },
    POPULATION_INDICATORS: [],
    ALL_INDICATORS: [],
    CHILDCARE_FOCUSED: mockPreset,
  };
});

describe("runReportPipeline", () => {
  const baseInput: PipelineInput = {
    cityNames: ["世田谷区", "渋谷区"],
    preset: "childcare",
    includePrice: false,
    includeCrime: false,
    includeDisaster: false,
  };

  const mockEstatClient = {
    getMetaInfo: vi.fn().mockResolvedValue({}),
    getStatsData: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("基本パイプライン（人口統計のみ）が正常に実行される", async () => {
    const result = await runReportPipeline(baseInput, {
      estatClient: mockEstatClient as any,
    });

    expect(result.results).toHaveLength(2);
    expect(result.cities).toEqual(["世田谷区", "渋谷区"]);
    expect(result.hasPriceData).toBe(false);
    expect(result.hasCrimeData).toBe(false);
    expect(result.hasDisasterData).toBe(false);
    expect(result.timeLabel).toBe("2024年");
  });

  it("preset が正しく解決される", async () => {
    const result = await runReportPipeline(baseInput, {
      estatClient: mockEstatClient as any,
    });

    expect(result.preset.name).toBe("childcare");
  });

  it("犯罪統計を含む場合に buildCrimeData が呼ばれる", async () => {
    const { buildCrimeData } = await import("@townlens/core");
    const input = { ...baseInput, includeCrime: true };

    await runReportPipeline(input, {
      estatClient: mockEstatClient as any,
    });

    expect(buildCrimeData).toHaveBeenCalled();
  });

  it("reinfoClient 未指定時に不動産価格データ取得をスキップする", async () => {
    const { buildPriceData } = await import("@townlens/core");
    const input = { ...baseInput, includePrice: true };

    await runReportPipeline(input, {
      estatClient: mockEstatClient as any,
      // reinfoClient 未指定
    });

    expect(buildPriceData).not.toHaveBeenCalled();
  });

  it("災害データを含む場合で reinfoClient がある場合に buildDisasterData が呼ばれる", async () => {
    const { buildDisasterData } = await import("@townlens/core");
    const mockReinfoClient = { getTransaction: vi.fn() };
    const input = { ...baseInput, includeDisaster: true };

    await runReportPipeline(input, {
      estatClient: mockEstatClient as any,
      reinfoClient: mockReinfoClient as any,
    });

    expect(buildDisasterData).toHaveBeenCalled();
  });

  it("不動産価格取得でデータありの場合に hasPriceData が true になる", async () => {
    const { buildPriceData, mergePriceIntoScoringInput } = await import("@townlens/core");
    vi.mocked(buildPriceData).mockResolvedValue(
      new Map([["13112", { avgPrice: 5000 }]]) as any,
    );
    const mockReinfoClient = { getTransaction: vi.fn() };
    const input = { ...baseInput, includePrice: true };

    const result = await runReportPipeline(input, {
      estatClient: mockEstatClient as any,
      reinfoClient: mockReinfoClient as any,
    });

    expect(result.hasPriceData).toBe(true);
    expect(mergePriceIntoScoringInput).toHaveBeenCalled();
  });

  it("犯罪統計でデータありの場合に hasCrimeData が true になる", async () => {
    const { buildCrimeData, mergeCrimeIntoScoringInput } = await import("@townlens/core");
    vi.mocked(buildCrimeData).mockResolvedValue(
      new Map([["13112", { crimeRate: 0.5 }]]) as any,
    );
    const input = { ...baseInput, includeCrime: true };

    const result = await runReportPipeline(input, {
      estatClient: mockEstatClient as any,
    });

    expect(result.hasCrimeData).toBe(true);
    expect(mergeCrimeIntoScoringInput).toHaveBeenCalled();
  });

  it("災害データでデータありの場合に hasDisasterData が true になる", async () => {
    const { buildDisasterData, mergeDisasterIntoScoringInput } = await import("@townlens/core");
    vi.mocked(buildDisasterData).mockResolvedValue(
      new Map([["13112", { riskScore: 3 }]]) as any,
    );
    const mockReinfoClient = { getTransaction: vi.fn() };
    const input = { ...baseInput, includeDisaster: true };

    const result = await runReportPipeline(input, {
      estatClient: mockEstatClient as any,
      reinfoClient: mockReinfoClient as any,
    });

    expect(result.hasDisasterData).toBe(true);
    expect(mergeDisasterIntoScoringInput).toHaveBeenCalled();
  });

  it("不動産価格取得失敗時にエラーを握りつぶして続行する", async () => {
    const { buildPriceData } = await import("@townlens/core");
    vi.mocked(buildPriceData).mockRejectedValue(new Error("API error"));
    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const mockReinfoClient = { getTransaction: vi.fn() };
    const input = { ...baseInput, includePrice: true };

    const result = await runReportPipeline(input, {
      estatClient: mockEstatClient as any,
      reinfoClient: mockReinfoClient as any,
    });

    expect(result.hasPriceData).toBe(false);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("犯罪統計取得失敗時にエラーを握りつぶして続行する", async () => {
    const { buildCrimeData } = await import("@townlens/core");
    vi.mocked(buildCrimeData).mockRejectedValue(new Error("API error"));
    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const input = { ...baseInput, includeCrime: true };

    const result = await runReportPipeline(input, {
      estatClient: mockEstatClient as any,
    });

    expect(result.hasCrimeData).toBe(false);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("災害データ取得失敗時にエラーを握りつぶして続行する", async () => {
    const { buildDisasterData } = await import("@townlens/core");
    vi.mocked(buildDisasterData).mockRejectedValue(new Error("API error"));
    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const mockReinfoClient = { getTransaction: vi.fn() };
    const input = { ...baseInput, includeDisaster: true };

    const result = await runReportPipeline(input, {
      estatClient: mockEstatClient as any,
      reinfoClient: mockReinfoClient as any,
    });

    expect(result.hasDisasterData).toBe(false);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("findPreset が null を返した場合に CHILDCARE_FOCUSED がフォールバックされる", async () => {
    const { findPreset } = await import("@townlens/core");
    vi.mocked(findPreset).mockReturnValue(undefined as any);

    const result = await runReportPipeline(baseInput, {
      estatClient: mockEstatClient as any,
    });

    expect(result.preset.name).toBe("childcare");
  });
});
