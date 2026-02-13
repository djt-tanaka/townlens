import { describe, it, expect, vi, beforeEach } from "vitest";
import { resolveStatsDataId, loadConfig, writeInitFiles } from "../../src/config/config";
import { CliError } from "../../src/errors";

// fs モジュールをモック
vi.mock("node:fs/promises", () => ({
  default: {
    readFile: vi.fn(),
    writeFile: vi.fn(),
    access: vi.fn(),
  },
}));

import fs from "node:fs/promises";

const mockedFs = vi.mocked(fs);

describe("resolveStatsDataId", () => {
  it("明示的なstatsDataIdを優先する", () => {
    const result = resolveStatsDataId({
      explicitStatsDataId: "0003448299",
      config: {},
    });
    expect(result.statsDataId).toBe("0003448299");
    expect(result.source).toBe("--statsDataId");
  });

  it("プレースホルダのstatsDataIdはエラーにする", () => {
    expect(() =>
      resolveStatsDataId({
        explicitStatsDataId: "REPLACE_WITH_ID",
        config: {},
      })
    ).toThrow(CliError);
  });

  it("profile名を指定してstatsDataIdを取得する", () => {
    const result = resolveStatsDataId({
      profileName: "population",
      config: {
        profiles: {
          population: {
            statsDataId: "0003448299",
            selectors: { classId: "cat01" },
          },
        },
      },
    });
    expect(result.statsDataId).toBe("0003448299");
    expect(result.selectors?.classId).toBe("cat01");
    expect(result.source).toBe("profile:population");
  });

  it("defaultProfileが指定されていれば使う", () => {
    const result = resolveStatsDataId({
      config: {
        defaultProfile: "pop",
        profiles: {
          pop: { statsDataId: "12345" },
        },
      },
    });
    expect(result.statsDataId).toBe("12345");
    expect(result.source).toBe("profile:pop");
  });

  it("profileのstatsDataIdがプレースホルダならエラー", () => {
    expect(() =>
      resolveStatsDataId({
        config: {
          defaultProfile: "test",
          profiles: {
            test: { statsDataId: "REPLACE_WITH_STATS_DATA_ID" },
          },
        },
      })
    ).toThrow(CliError);
  });

  it("profileが存在しない場合はエラー", () => {
    expect(() =>
      resolveStatsDataId({
        profileName: "nonexistent",
        config: { profiles: {} },
      })
    ).toThrow(CliError);
  });

  it("statsDataIdもprofileも未指定ならエラー", () => {
    expect(() =>
      resolveStatsDataId({ config: {} })
    ).toThrow(CliError);
  });

  it("explicitStatsDataIdがあればprofileを無視する", () => {
    const result = resolveStatsDataId({
      explicitStatsDataId: "9999",
      profileName: "ignored",
      config: {
        profiles: {
          ignored: { statsDataId: "1111" },
        },
      },
    });
    expect(result.statsDataId).toBe("9999");
    expect(result.source).toBe("--statsDataId");
  });
});

describe("loadConfig", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("設定ファイルを読み込んでパースする", async () => {
    const configJson = JSON.stringify({
      defaultProfile: "population",
      profiles: {
        population: { statsDataId: "12345" },
      },
    });
    mockedFs.readFile.mockResolvedValue(configJson);

    const config = await loadConfig("estat.config.json");
    expect(config.defaultProfile).toBe("population");
    expect(config.profiles?.population?.statsDataId).toBe("12345");
  });

  it("ファイルが存在しない場合は空オブジェクトを返す", async () => {
    const err = new Error("ENOENT") as NodeJS.ErrnoException;
    err.code = "ENOENT";
    mockedFs.readFile.mockRejectedValue(err);

    const config = await loadConfig();
    expect(config).toEqual({});
  });

  it("JSONパースエラーの場合はCliErrorを投げる", async () => {
    mockedFs.readFile.mockResolvedValue("{ invalid json }");

    await expect(loadConfig()).rejects.toThrow(CliError);
  });
});

describe("writeInitFiles", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ファイルが存在しない場合は作成する", async () => {
    mockedFs.access.mockRejectedValue(new Error("ENOENT"));
    mockedFs.writeFile.mockResolvedValue();

    const created = await writeInitFiles();
    expect(created).toContain("estat.config.json");
    expect(created).toContain(".env.example");
    expect(mockedFs.writeFile).toHaveBeenCalledTimes(2);
  });

  it("ファイルが既に存在する場合は作成しない", async () => {
    mockedFs.access.mockResolvedValue(undefined);

    const created = await writeInitFiles();
    expect(created).toEqual([]);
    expect(mockedFs.writeFile).not.toHaveBeenCalled();
  });

  it("一方のファイルのみ存在しない場合はそれだけ作成する", async () => {
    // estat.config.json は存在、.env.example は不在
    mockedFs.access
      .mockResolvedValueOnce(undefined)  // estat.config.json exists
      .mockRejectedValueOnce(new Error("ENOENT")); // .env.example missing
    mockedFs.writeFile.mockResolvedValue();

    const created = await writeInitFiles();
    expect(created).toEqual([".env.example"]);
    expect(mockedFs.writeFile).toHaveBeenCalledTimes(1);
  });
});
