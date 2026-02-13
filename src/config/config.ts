import fs from "node:fs/promises";
import path from "node:path";
import { CliError } from "../errors";

export interface SelectorConfig {
  classId?: string;
  totalCode?: string;
  kidsCode?: string;
}

export interface ProfileConfig {
  statsDataId: string;
  selectors?: SelectorConfig;
  notes?: string;
}

export interface EstatConfig {
  defaultProfile?: string;
  profiles?: Record<string, ProfileConfig>;
}

export async function loadConfig(configPath = "estat.config.json"): Promise<EstatConfig> {
  const filePath = path.resolve(configPath);
  try {
    const content = await fs.readFile(filePath, "utf8");
    return JSON.parse(content) as EstatConfig;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return {};
    }
    throw new CliError("設定ファイル estat.config.json の読み込みに失敗しました", [
      "estat.config.json のJSON構文を確認してください。"
    ]);
  }
}

export async function writeInitFiles(): Promise<string[]> {
  const created: string[] = [];

  const configPath = path.resolve("estat.config.json");
  try {
    await fs.access(configPath);
  } catch {
    const template: EstatConfig = {
      defaultProfile: "population",
      profiles: {
        population: {
          statsDataId: "REPLACE_WITH_STATS_DATA_ID",
          notes: "市区町村別・年齢階級（総数/0-14）を含む統計表を指定する"
        }
      }
    };
    await fs.writeFile(configPath, `${JSON.stringify(template, null, 2)}\n`, "utf8");
    created.push("estat.config.json");
  }

  const envExamplePath = path.resolve(".env.example");
  try {
    await fs.access(envExamplePath);
  } catch {
    await fs.writeFile(envExamplePath, "ESTAT_APP_ID=YOUR_APP_ID\n", "utf8");
    created.push(".env.example");
  }

  return created;
}

export function resolveStatsDataId(args: {
  explicitStatsDataId?: string;
  profileName?: string;
  config: EstatConfig;
}): { statsDataId: string; selectors?: SelectorConfig; source: string } {
  if (args.explicitStatsDataId) {
    if (args.explicitStatsDataId.includes("REPLACE_WITH")) {
      throw new CliError(
        "statsDataId がプレースホルダのままです",
        [
          "実在する statsDataId を --statsDataId で指定してください。",
          "候補探索: estat-report search --keyword \"人口\""
        ],
        undefined,
        2
      );
    }
    return {
      statsDataId: args.explicitStatsDataId,
      source: "--statsDataId"
    };
  }

  const profileName = args.profileName || args.config.defaultProfile;
  if (profileName) {
    const profile = args.config.profiles?.[profileName];
    if (!profile?.statsDataId) {
      throw new CliError(
        `profile '${profileName}' が見つからないか statsDataId が未設定です`,
        [
          "estat.config.json の profiles を確認してください。",
          "または --statsDataId <ID> を直接指定してください。"
        ],
        undefined,
        2
      );
    }
    if (profile.statsDataId.includes("REPLACE_WITH")) {
      throw new CliError(
        `profile '${profileName}' の statsDataId がプレースホルダです`,
        [
          "estat.config.json で実在する statsDataId に置き換えてください。",
          "候補探索: estat-report search --keyword \"人口\""
        ],
        undefined,
        2
      );
    }
    return {
      statsDataId: profile.statsDataId,
      selectors: profile.selectors,
      source: `profile:${profileName}`
    };
  }

  throw new CliError(
    "statsDataId が未指定です",
    [
      "--statsDataId <ID> を指定してください。",
      "または estat-report init を実行して profile を作成し、--profile <name> を指定してください。",
      "候補を探すには estat-report search --keyword \"人口\" を利用してください。"
    ],
    undefined,
    2
  );
}
