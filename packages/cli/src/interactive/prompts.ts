/**
 * インタラクティブCLIプロンプトモジュール。
 * @inquirer/prompts を使用した対話型UI。
 *
 * I/O依存が強いため、テストはカバレッジ除外対象。
 * ビジネスロジック（ファジー検索等）は分離モジュールでテスト済み。
 */

import { select, input, confirm } from "@inquirer/prompts";
import { fuzzySearch, type FuzzyCandidate } from "./fuzzy-search";
import { getAllStationNames } from "../station/stations";
import { ALL_PRESETS } from "@townlens/core";

/** 地理モードの選択肢 */
export type GeoMode = "municipality" | "mesh" | "station";

/** インタラクティブセッションの結果 */
export interface InteractiveResult {
  readonly mode: GeoMode;
  readonly targets: ReadonlyArray<string>;
  readonly scored: boolean;
  readonly preset: string;
  readonly radius?: number;
}

/** 地理モードを選択する */
async function selectGeoMode(): Promise<GeoMode> {
  return select({
    message: "地理モードを選択してください",
    choices: [
      { name: "市区町村モード", value: "municipality" as const },
      { name: "メッシュモード", value: "mesh" as const },
      { name: "駅圏モード", value: "station" as const },
    ],
  });
}

/** 市区町村名を入力する */
async function inputCityNames(): Promise<ReadonlyArray<string>> {
  const raw = await input({
    message: "市区町村名をカンマ区切りで入力してください（例: 新宿区,渋谷区）",
    validate: (value) => {
      const names = value.split(",").map((n) => n.trim()).filter(Boolean);
      return names.length > 0 || "1つ以上の市区町村名を入力してください";
    },
  });
  return raw.split(",").map((n) => n.trim()).filter(Boolean);
}

/** メッシュコードを入力する */
async function inputMeshCodes(): Promise<ReadonlyArray<string>> {
  const raw = await input({
    message: "メッシュコードをカンマ区切りで入力してください（例: 53394525,53394526）",
    validate: (value) => {
      const codes = value.split(",").map((c) => c.trim()).filter(Boolean);
      if (codes.length === 0) return "1つ以上のメッシュコードを入力してください";
      const invalid = codes.filter((c) => !/^\d{4,9}$/.test(c));
      if (invalid.length > 0) return `不正なコード: ${invalid.join(", ")}`;
      return true;
    },
  });
  return raw.split(",").map((c) => c.trim()).filter(Boolean);
}

/** 駅名を入力する（ファジー検索付き） */
async function inputStationNames(): Promise<ReadonlyArray<string>> {
  const allStations = getAllStationNames();
  const candidates: FuzzyCandidate[] = allStations.map((name) => ({
    label: name,
    value: name,
  }));

  const selectedStations: string[] = [];
  let addMore = true;

  while (addMore) {
    const query = await input({
      message: selectedStations.length === 0
        ? "駅名を入力してください（部分入力で検索）"
        : `追加する駅名を入力してください（現在: ${selectedStations.join(", ")}）`,
    });

    const matches = fuzzySearch(query, candidates, { maxResults: 10 });

    if (matches.length === 0) {
      console.log(`「${query}」に一致する駅が見つかりません。`);
      continue;
    }

    const selected = await select({
      message: "駅を選択してください",
      choices: [
        ...matches.map((m) => ({ name: m.label, value: m.value })),
        { name: "（入力をやり直す）", value: "__retry__" },
      ],
    });

    if (selected === "__retry__") continue;

    if (!selectedStations.includes(selected)) {
      selectedStations.push(selected);
      console.log(`追加: ${selected}駅`);
    }

    if (selectedStations.length >= 2) {
      addMore = await confirm({
        message: "さらに駅を追加しますか？",
        default: false,
      });
    }
  }

  return selectedStations;
}

/** 駅圏の半径を入力する */
async function inputRadius(): Promise<number> {
  const raw = await input({
    message: "駅圏の半径（メートル）を入力してください",
    default: "1000",
    validate: (value) => {
      const num = Number(value);
      if (!Number.isFinite(num) || num <= 0) return "正の数値を入力してください";
      if (num > 10000) return "10000m以下を指定してください";
      return true;
    },
  });
  return Number(raw);
}

/** スコアリングプリセットを選択する */
async function selectPreset(): Promise<string> {
  return select({
    message: "スコアリングプリセットを選択してください",
    choices: ALL_PRESETS.map((preset) => ({
      name: `${preset.label} (${preset.name})`,
      value: preset.name,
    })),
  });
}

/** インタラクティブセッションを実行する */
export async function runInteractiveSession(): Promise<InteractiveResult> {
  console.log("=== TownLens インタラクティブモード ===\n");

  const mode = await selectGeoMode();

  let targets: ReadonlyArray<string>;
  let radius: number | undefined;

  switch (mode) {
    case "municipality":
      targets = await inputCityNames();
      break;
    case "mesh":
      targets = await inputMeshCodes();
      break;
    case "station":
      targets = await inputStationNames();
      radius = await inputRadius();
      break;
  }

  const scored = await confirm({
    message: "スコア付きレポートを生成しますか？",
    default: true,
  });

  let preset = "childcare";
  if (scored) {
    preset = await selectPreset();
  }

  console.log("\n--- 設定確認 ---");
  console.log(`モード: ${mode}`);
  console.log(`対象: ${targets.join(", ")}`);
  if (radius !== undefined) {
    console.log(`半径: ${radius}m`);
  }
  console.log(`スコア: ${scored ? "有効" : "無効"}`);
  if (scored) {
    console.log(`プリセット: ${preset}`);
  }

  const proceed = await confirm({
    message: "この設定でレポートを生成しますか？",
    default: true,
  });

  if (!proceed) {
    throw new Error("ユーザーによりキャンセルされました");
  }

  return {
    mode,
    targets,
    scored,
    preset,
    radius,
  };
}
