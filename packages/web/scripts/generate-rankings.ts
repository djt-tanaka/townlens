/**
 * ランキングデータ生成スクリプト。
 *
 * 全自治体 (~1,900) のスコアを計算し、city_rankings テーブルに保存する。
 * GitHub Actions の月次 cron から実行される。
 *
 * 使い方:
 *   pnpm ranking:generate
 *
 * 必要な環境変数:
 *   ESTAT_APP_ID, REINFOLIB_API_KEY,
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import type { CityIndicators } from "@townlens/core";
import {
  EstatApiClient,
  ReinfoApiClient,
  extractClassObjects,
  resolveAreaClass,
  buildAreaEntries,
  isMunicipalityCode,
  isDesignatedCityCode,
  buildReportData,
  toScoringInput,
  buildPriceData,
  mergePriceIntoScoringInput,
  buildCrimeData,
  mergeCrimeIntoScoringInput,
  buildDisasterData,
  mergeDisasterIntoScoringInput,
  buildEducationData,
  mergeEducationIntoScoringInput,
  scoreSingleCity,
  ALL_INDICATORS,
  ALL_PRESETS,
  DATASETS,
} from "@townlens/core";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/types/database";

// --- 設定 ---

const CHUNK_SIZE = 50;

// --- 環境変数バリデーション ---

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`環境変数 ${name} が未設定です`);
  }
  return value;
}

// --- 都道府県コード解決 ---

const PREFECTURE_MAP: ReadonlyMap<string, string> = new Map([
  ["01", "北海道"], ["02", "青森県"], ["03", "岩手県"], ["04", "宮城県"],
  ["05", "秋田県"], ["06", "山形県"], ["07", "福島県"], ["08", "茨城県"],
  ["09", "栃木県"], ["10", "群馬県"], ["11", "埼玉県"], ["12", "千葉県"],
  ["13", "東京都"], ["14", "神奈川県"], ["15", "新潟県"], ["16", "富山県"],
  ["17", "石川県"], ["18", "福井県"], ["19", "山梨県"], ["20", "長野県"],
  ["21", "岐阜県"], ["22", "静岡県"], ["23", "愛知県"], ["24", "三重県"],
  ["25", "滋賀県"], ["26", "京都府"], ["27", "大阪府"], ["28", "兵庫県"],
  ["29", "奈良県"], ["30", "和歌山県"], ["31", "鳥取県"], ["32", "島根県"],
  ["33", "岡山県"], ["34", "広島県"], ["35", "山口県"], ["36", "徳島県"],
  ["37", "香川県"], ["38", "愛媛県"], ["39", "高知県"], ["40", "福岡県"],
  ["41", "佐賀県"], ["42", "長崎県"], ["43", "熊本県"], ["44", "大分県"],
  ["45", "宮崎県"], ["46", "鹿児島県"], ["47", "沖縄県"],
]);

function getPrefectureName(areaCode: string): string {
  return PREFECTURE_MAP.get(areaCode.slice(0, 2)) ?? "不明";
}

/**
 * エントリ名が都道府県名そのものかどうかを判定する（名前ベースの安全策）。
 * isMunicipalityCode のコード判定を補完し、万が一コード形式の想定外で
 * 都道府県エントリが通過した場合にも除外できるようにする。
 */
const PREFECTURE_NAMES = new Set(PREFECTURE_MAP.values());
function isPrefectureName(name: string): boolean {
  return PREFECTURE_NAMES.has(name);
}

// --- チャンク分割ユーティリティ ---

function chunk<T>(array: ReadonlyArray<T>, size: number): ReadonlyArray<ReadonlyArray<T>> {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size) as T[]);
  }
  return chunks;
}

// --- スコアリング結果を DB に保存する型 ---

interface CityRankingRow {
  readonly preset: string;
  readonly areaCode: string;
  readonly cityName: string;
  readonly prefecture: string;
  readonly starRating: number;
  readonly indicatorStars: unknown;
  readonly population: number | null;
}

// --- メイン処理 ---

async function main(): Promise<void> {
  const startTime = Date.now();
  console.log("=== ランキングデータ生成開始 ===");

  // 環境変数チェック
  const estatAppId = requireEnv("ESTAT_APP_ID");
  const reinfoApiKey = requireEnv("REINFOLIB_API_KEY");
  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const supabaseServiceKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

  // クライアント初期化
  const estatClient = new EstatApiClient(estatAppId);
  const reinfoClient = new ReinfoApiClient(reinfoApiKey);
  const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 全自治体リスト取得
  console.log("全自治体リストを取得中...");
  const metaInfo = await estatClient.getMetaInfo(DATASETS.population.statsDataId);
  const classObjs = extractClassObjects(metaInfo);
  const areaClass = resolveAreaClass(classObjs);
  const rawEntries = buildAreaEntries(areaClass);
  // 都道府県・全国レベルを除外し、市区町村のみに絞り込む
  // isMunicipalityCode（コード判定）+ isPrefectureName（名前判定）の二重フィルタ
  // さらに政令指定都市の親コードを除外（区のみランキング対象にする）
  const allEntries = rawEntries.filter(
    (e) => isMunicipalityCode(e.code) && !isPrefectureName(e.name) && !isDesignatedCityCode(e.code),
  );
  console.log(`${rawEntries.length} エリアから ${allEntries.length} 市区町村を抽出（都道府県・全国・政令指定都市の親コードを除外）`);

  // --- 自治体マスターテーブル (municipalities) を upsert ---
  console.log("自治体マスターテーブルを更新中...");
  const municipalityChunks = chunk(allEntries, 500);
  let municipalityCount = 0;

  for (const muniChunk of municipalityChunks) {
    const rows = muniChunk.map((e) => ({
      area_code: e.code,
      city_name: e.name,
      prefecture: getPrefectureName(e.code),
      generated_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from("municipalities")
      .upsert(rows, { onConflict: "area_code" });

    if (error) {
      console.error(`  municipalities upsert エラー: ${error.message}`);
    }
    municipalityCount += muniChunk.length;
  }
  console.log(`  ${municipalityCount} 自治体をマスターテーブルに保存`);

  // チャンクに分割して処理（エリアコード付きで分割し、名前解決をバイパス）
  const entryChunks = chunk(allEntries, CHUNK_SIZE);
  console.log(`${entryChunks.length} チャンクに分割（各 ${CHUNK_SIZE} 都市）`);

  // 全自治体の CityIndicators を蓄積
  const allCityData: Array<{
    indicators: CityIndicators;
    population: number;
  }> = [];

  // サーキットブレーカー: API障害時に以降のチャンクで同じAPIを繰り返しリトライしない
  let skipPrice = false;
  let skipDisaster = false;

  for (let ci = 0; ci < entryChunks.length; ci++) {
    const chunkEntries = entryChunks[ci];
    console.log(`\nチャンク ${ci + 1}/${entryChunks.length}: ${chunkEntries.length} 都市を処理中...`);

    try {
      // Phase 0: 人口統計（エリアコード直接指定で同名自治体エラーを回避）
      const chunkAreaCodes = chunkEntries.map((e) => e.code);
      const chunkCityNames = chunkEntries.map((e) => e.name);
      const reportData = await buildReportData({
        client: estatClient,
        statsDataId: DATASETS.population.statsDataId,
        cityNames: chunkCityNames,
        areaCodes: chunkAreaCodes,
        selectors: DATASETS.population.selectors,
        metaInfo,
      });

      const timeYear = reportData.timeLabel.match(/\d{4}/)?.[0] ?? "不明";
      let scoringInput: ReadonlyArray<CityIndicators> = toScoringInput(
        reportData,
        timeYear,
        DATASETS.population.statsDataId,
      );

      const areaCodes = reportData.rows.map((r) => r.areaCode);

      // Phase 1〜3 を並列実行（各Phaseは Phase 0 の結果のみに依存し、互いに独立）
      const populationMap = new Map(reportData.rows.map((r) => [r.areaCode, r.total]));
      const cityNameMap = new Map(reportData.rows.map((r) => [r.areaCode, r.cityResolved]));
      const priceYear = String(new Date().getFullYear() - 1);

      const [priceResult, crimeResult, disasterResult, educationResult] = await Promise.all([
        // Phase 1: 不動産価格（サーキットブレーカー適用）
        skipPrice
          ? Promise.resolve(null)
          : buildPriceData(reinfoClient, areaCodes, priceYear)
              .then((data) => { console.log(`  Phase 1 (不動産): ${data.size} 件取得`); return data; })
              .catch((err) => {
                console.warn(`  Phase 1 (不動産) スキップ: ${err instanceof Error ? err.message : String(err)}`);
                skipPrice = true;
                console.warn("  [circuit-breaker] 不動産APIに障害があるため、以降のチャンクでPhase 1をスキップします");
                return null;
              }),
        // Phase 2a: 犯罪統計
        buildCrimeData(estatClient, areaCodes, { statsDataId: DATASETS.crime.statsDataId }, populationMap)
          .then((data) => { console.log(`  Phase 2a (犯罪): ${data.size} 件取得`); return data; })
          .catch((err) => { console.warn(`  Phase 2a (犯罪) スキップ: ${err instanceof Error ? err.message : String(err)}`); return null; }),
        // Phase 2b: 災害リスク（サーキットブレーカー適用）
        skipDisaster
          ? Promise.resolve(null)
          : buildDisasterData(reinfoClient, areaCodes, cityNameMap)
              .then((data) => { console.log(`  Phase 2b (災害): ${data.size} 件取得`); return data; })
              .catch((err) => {
                console.warn(`  Phase 2b (災害) スキップ: ${err instanceof Error ? err.message : String(err)}`);
                skipDisaster = true;
                console.warn("  [circuit-breaker] 災害APIに障害があるため、以降のチャンクでPhase 2bをスキップします");
                return null;
              }),
        // Phase 3: 教育統計
        buildEducationData(estatClient, areaCodes, { statsDataId: DATASETS.education.statsDataId }, populationMap)
          .then((data) => { console.log(`  Phase 3 (教育): ${data.size} 件取得`); return data; })
          .catch((err) => { console.warn(`  Phase 3 (教育) スキップ: ${err instanceof Error ? err.message : String(err)}`); return null; }),
      ]);

      // 結果をマージ
      if (priceResult && priceResult.size > 0) {
        scoringInput = mergePriceIntoScoringInput(scoringInput, priceResult);
      }
      if (crimeResult && crimeResult.size > 0) {
        scoringInput = mergeCrimeIntoScoringInput(scoringInput, crimeResult);
      }
      if (disasterResult && disasterResult.size > 0) {
        scoringInput = mergeDisasterIntoScoringInput(scoringInput, disasterResult);
      }
      if (educationResult && educationResult.size > 0) {
        scoringInput = mergeEducationIntoScoringInput(scoringInput, educationResult);
      }

      // CityIndicators と人口を蓄積
      const populationByCode = new Map(reportData.rows.map((r) => [r.areaCode, r.total]));
      for (const city of scoringInput) {
        allCityData.push({
          indicators: city,
          population: populationByCode.get(city.areaCode) ?? 0,
        });
      }

      console.log(`  チャンク完了: ${scoringInput.length} 都市のデータ取得`);
    } catch (err) {
      console.error(`  チャンク ${ci + 1} でエラー: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  console.log(`\n合計 ${allCityData.length} 都市のデータを取得`);

  // プリセット別にスコアリング → 順位付け → DB 保存
  const now = new Date().toISOString();

  for (const preset of ALL_PRESETS) {
    console.log(`\nプリセット「${preset.label}」のスコアリング中...`);

    // 各都市をスコアリング
    const scored: CityRankingRow[] = allCityData.map(({ indicators, population }) => {
      const score = scoreSingleCity(indicators, ALL_INDICATORS, preset);
      return {
        preset: preset.name,
        areaCode: score.areaCode,
        cityName: score.cityName,
        prefecture: getPrefectureName(score.areaCode),
        starRating: score.starRating,
        indicatorStars: score.indicatorStars,
        population,
      };
    });

    // starRating 降順ソート → 順位付与
    const sorted = [...scored].sort((a, b) => b.starRating - a.starRating);

    // DB に upsert（チャンクごとに実行）
    const upsertChunks = chunk(sorted, 500);
    let upsertedCount = 0;

    for (const upsertChunk of upsertChunks) {
      const rows = upsertChunk.map((city, index) => ({
        preset: city.preset,
        area_code: city.areaCode,
        city_name: city.cityName,
        prefecture: city.prefecture,
        rank: upsertedCount + index + 1,
        star_rating: city.starRating,
        indicator_stars: city.indicatorStars as Database["public"]["Tables"]["city_rankings"]["Insert"]["indicator_stars"],
        population: city.population,
        generated_at: now,
      }));

      const { error } = await supabase
        .from("city_rankings")
        .upsert(rows, { onConflict: "preset,area_code" });

      if (error) {
        console.error(`  DB upsert エラー: ${error.message}`);
      }

      upsertedCount += upsertChunk.length;
    }

    console.log(`  ${preset.label}: ${sorted.length} 都市をランキング保存（1位: ${sorted[0]?.cityName ?? "なし"} ★${sorted[0]?.starRating.toFixed(1) ?? "-"}）`);
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n=== ランキングデータ生成完了（${elapsed}秒） ===`);
}

main().catch((err) => {
  console.error("ランキング生成に失敗しました:", err);
  process.exit(1);
});
