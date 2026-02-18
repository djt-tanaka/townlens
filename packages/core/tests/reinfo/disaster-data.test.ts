import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildDisasterData } from "../../src/reinfo/disaster-data";
import * as disasterClient from "../../src/reinfo/disaster-client";

vi.mock("../../src/reinfo/disaster-client", async (importOriginal) => {
  const actual = await importOriginal<typeof disasterClient>();
  return {
    ...actual,
    fetchDisasterRisk: vi.fn(),
  };
});

const mockClient = {} as any;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("buildDisasterData", () => {
  it("複数都市の災害リスクを取得する", async () => {
    vi.mocked(disasterClient.fetchDisasterRisk)
      .mockResolvedValueOnce({ floodRisk: true, landslideRisk: false, evacuationSiteCount: 5 })
      .mockResolvedValueOnce({ floodRisk: false, landslideRisk: true, evacuationSiteCount: 3 });

    const result = await buildDisasterData(mockClient, ["13104", "13113"]);

    expect(result.size).toBe(2);
    const shinjuku = result.get("13104")!;
    expect(shinjuku.floodRisk).toBe(true);
    expect(shinjuku.landslideRisk).toBe(false);
    expect(shinjuku.riskScore).toBe(1);
    expect(shinjuku.evacuationSiteCount).toBe(5);

    const shibuya = result.get("13113")!;
    expect(shibuya.landslideRisk).toBe(true);
    expect(shibuya.riskScore).toBe(1);
  });

  it("空の都市コード配列で空Mapを返す", async () => {
    const result = await buildDisasterData(mockClient, []);
    expect(result.size).toBe(0);
  });

  it("代表地点が未登録の都市はMapに含まれない", async () => {
    vi.mocked(disasterClient.fetchDisasterRisk)
      .mockResolvedValueOnce({ floodRisk: false, landslideRisk: false, evacuationSiteCount: 2 });

    const result = await buildDisasterData(mockClient, ["13104", "99999"]);

    expect(result.size).toBe(1);
    expect(result.has("13104")).toBe(true);
    expect(result.has("99999")).toBe(false);
  });

  it("両方のリスクありでriskScore=2", async () => {
    vi.mocked(disasterClient.fetchDisasterRisk)
      .mockResolvedValueOnce({ floodRisk: true, landslideRisk: true, evacuationSiteCount: 0 });

    const result = await buildDisasterData(mockClient, ["13104"]);

    expect(result.get("13104")!.riskScore).toBe(2);
  });

  it("リスクなしでriskScore=0", async () => {
    vi.mocked(disasterClient.fetchDisasterRisk)
      .mockResolvedValueOnce({ floodRisk: false, landslideRisk: false, evacuationSiteCount: 10 });

    const result = await buildDisasterData(mockClient, ["13104"]);

    expect(result.get("13104")!.riskScore).toBe(0);
  });
});
