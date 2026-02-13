import { EstatApiClient } from "./client";
import { loadMetaInfoWithCache } from "./cache";
import {
  ClassObj,
  extractClassObjects,
  resolveAreaClass,
  resolveLatestTime,
  resolveAgeSelection,
} from "./meta";
import { DATASETS } from "../config/datasets";

/** 分類の概要情報 */
export interface ClassificationSummary {
  readonly id: string;
  readonly name: string;
  readonly itemCount: number;
  readonly sampleItems: ReadonlyArray<{ readonly code: string; readonly name: string }>;
}

/** 検出結果 */
export interface DetectionResult {
  readonly success: boolean;
  readonly classId?: string;
  readonly className?: string;
  readonly detail?: string;
  readonly errorMessage?: string;
}

/** 年齢区分の検出結果 */
export interface AgeDetectionResult extends DetectionResult {
  readonly totalCode?: string;
  readonly totalName?: string;
  readonly kidsCode?: string;
  readonly kidsName?: string;
}

/** inspect の全体結果 */
export interface InspectResult {
  readonly statsDataId: string;
  readonly classifications: ReadonlyArray<ClassificationSummary>;
  readonly areaDetection: DetectionResult;
  readonly timeDetection: DetectionResult;
  readonly ageDetection: AgeDetectionResult;
  readonly canGenerateReport: boolean;
}

function summarizeClassifications(classObjs: ReadonlyArray<ClassObj>): ReadonlyArray<ClassificationSummary> {
  return classObjs.map((classObj) => ({
    id: classObj.id,
    name: classObj.name,
    itemCount: classObj.items.length,
    sampleItems: classObj.items.slice(0, 8).map((item) => ({
      code: item.code,
      name: item.name,
    })),
  }));
}

function detectArea(classObjs: ClassObj[]): DetectionResult {
  try {
    const areaClass = resolveAreaClass(classObjs);
    return {
      success: true,
      classId: areaClass.id,
      className: areaClass.name,
      detail: `${areaClass.items.length}件`,
    };
  } catch (error) {
    return {
      success: false,
      errorMessage: error instanceof Error ? error.message : "不明なエラー",
    };
  }
}

function detectTime(classObjs: ClassObj[]): DetectionResult {
  try {
    const timeSelection = resolveLatestTime(classObjs);
    return {
      success: true,
      classId: timeSelection.classId,
      detail: `最新: ${timeSelection.label} (${timeSelection.code})`,
    };
  } catch (error) {
    return {
      success: false,
      errorMessage: error instanceof Error ? error.message : "不明なエラー",
    };
  }
}

function detectAge(classObjs: ClassObj[]): AgeDetectionResult {
  try {
    const ageSelection = resolveAgeSelection(classObjs);
    return {
      success: true,
      classId: ageSelection.classId,
      totalCode: ageSelection.total.code,
      totalName: ageSelection.total.name,
      kidsCode: ageSelection.kids.code,
      kidsName: ageSelection.kids.name,
      detail: `${ageSelection.total.name}(${ageSelection.total.code}) / ${ageSelection.kids.name}(${ageSelection.kids.code})`,
    };
  } catch (error) {
    return {
      success: false,
      errorMessage: error instanceof Error ? error.message : "不明なエラー",
    };
  }
}

/** 統計表のメタデータを検査し、自動検出の成否を返す */
export async function inspectStatsData(
  client: EstatApiClient,
  statsDataId: string,
): Promise<InspectResult> {
  const metaInfo = await loadMetaInfoWithCache(client, statsDataId);
  const classObjs = extractClassObjects(metaInfo);

  const classifications = summarizeClassifications(classObjs);
  const areaDetection = detectArea(classObjs);
  const timeDetection = detectTime(classObjs);
  const ageDetection = detectAge(classObjs);

  return {
    statsDataId,
    classifications,
    areaDetection,
    timeDetection,
    ageDetection,
    canGenerateReport: areaDetection.success && timeDetection.success && ageDetection.success,
  };
}

/** 検査結果を人間が読める文字列に整形する */
export function formatInspectResult(result: InspectResult): string {
  const lines: string[] = [];

  lines.push(`統計表ID: ${result.statsDataId}`);
  lines.push("=".repeat(40));
  lines.push("");

  lines.push("分類一覧:");
  for (const cls of result.classifications) {
    const sample = cls.sampleItems.map((item) => item.name).join(", ");
    const ellipsis = cls.itemCount > cls.sampleItems.length ? " ..." : "";
    lines.push(`  [${cls.id}] ${cls.name} (${cls.itemCount}件) → ${sample}${ellipsis}`);
  }
  lines.push("");

  lines.push("自動検出結果:");
  const format = (label: string, det: DetectionResult) => {
    const mark = det.success ? "○" : "×";
    const detail = det.success
      ? (det.detail ?? "")
      : (det.errorMessage ?? "検出失敗");
    return `  ${label}: ${mark} ${detail}`;
  };

  lines.push(format("地域事項", result.areaDetection));
  lines.push(format("時間軸  ", result.timeDetection));
  lines.push(format("年齢区分", result.ageDetection));
  lines.push("");

  if (result.canGenerateReport) {
    lines.push("レポート生成: 可能");
    lines.push(`  estat-report report --statsDataId ${result.statsDataId} --cities "..."`);
  } else {
    lines.push("レポート生成: 不可");
    if (!result.ageDetection.success) {
      lines.push("  年齢区分の自動検出に失敗しました。--classId/--totalCode/--kidsCode の手動指定が必要です。");
    }
    if (result.statsDataId !== DATASETS.population.statsDataId) {
      lines.push(`  推奨: --statsDataId ${DATASETS.population.statsDataId} (${DATASETS.population.label})`);
    }
  }

  return lines.join("\n");
}
