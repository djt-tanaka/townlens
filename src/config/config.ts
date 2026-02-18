import fs from "node:fs/promises";
import path from "node:path";
import { CliError } from "../errors";
import { DATASETS } from "./datasets";

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
  /** Phase 2a: 犯罪統計用の statsDataId（社会・人口統計体系等） */
  crimeStatsDataId?: string;
}

export async function loadConfig(configPath = "townlens.config.json"): Promise<EstatConfig> {
  const filePath = path.resolve(configPath);
  try {
    const content = await fs.readFile(filePath, "utf8");
    return JSON.parse(content) as EstatConfig;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return {};
    }
    throw new CliError("設定ファイル townlens.config.json の読み込みに失敗しました", [
      "townlens.config.json のJSON構文を確認してください。"
    ]);
  }
}

export async function writeInitFiles(): Promise<string[]> {
  const created: string[] = [];

  const configPath = path.resolve("townlens.config.json");
  try {
    await fs.access(configPath);
  } catch {
    const template: EstatConfig = {
      defaultProfile: "population",
      profiles: {
        population: {
          statsDataId: DATASETS.population.statsDataId,
          notes: "国勢調査 年齢（3区分）人口。別のデータを使う場合のみ変更してください。",
        }
      }
    };
    await fs.writeFile(configPath, `${JSON.stringify(template, null, 2)}\n`, "utf8");
    created.push("townlens.config.json");
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
          "候補探索: townlens search --keyword \"人口\""
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
          "townlens.config.json の profiles を確認してください。",
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
          "townlens.config.json で実在する statsDataId に置き換えてください。",
          "候補探索: townlens search --keyword \"人口\""
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

  return {
    statsDataId: DATASETS.population.statsDataId,
    selectors: { ...DATASETS.population.selectors },
    source: "builtin-default",
  };
}
