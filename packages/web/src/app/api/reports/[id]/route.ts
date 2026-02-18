/**
 * GET /api/reports/[id]
 * レポート取得 API。認証不要（URLを知っていれば誰でも閲覧可能）。
 */

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { reportIdSchema } from "@/lib/validations";
import { jsonResponse, errorResponse, handleApiError } from "@/lib/api-utils";
import type { ReportResponse } from "@/types";

interface RouteParams {
  readonly params: Promise<{ readonly id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    // Next.js 15 では params は Promise
    const { id } = await params;

    const parsed = reportIdSchema.safeParse({ id });
    if (!parsed.success) {
      return errorResponse(
        parsed.error.issues[0]?.message ?? "バリデーションエラー",
        400,
      );
    }

    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("reports")
      .select("*")
      .eq("id", id)
      .single();

    // error と data を分離してチェックすることで、Supabase の判別共用体型が正しく絞り込まれる
    if (error) {
      return errorResponse("レポートが見つかりません", 404);
    }
    if (!data) {
      return errorResponse("レポートが見つかりません", 404);
    }

    const report = data;

    if (report.status === "processing") {
      return jsonResponse({ status: "processing", reportId: report.id }, 202);
    }

    if (report.status === "failed") {
      return errorResponse(
        report.error_message ?? "レポート生成に失敗しました",
        500,
      );
    }

    // result_json をパースしてレスポンスを構築
    const resultJson = report.result_json as Record<string, unknown> | null;
    if (!resultJson) {
      return errorResponse("レポートデータが見つかりません", 500);
    }

    const response: ReportResponse = {
      report: {
        id: report.id,
        cities: report.cities as readonly string[],
        preset: resultJson.preset as ReportResponse["report"]["preset"],
        createdAt: report.created_at,
        results:
          resultJson.results as ReportResponse["report"]["results"],
        definitions:
          resultJson.definitions as ReportResponse["report"]["definitions"],
        rawRows:
          resultJson.rawRows as ReportResponse["report"]["rawRows"],
        hasPriceData: (resultJson.hasPriceData as boolean) ?? false,
        hasCrimeData: (resultJson.hasCrimeData as boolean) ?? false,
        hasDisasterData: (resultJson.hasDisasterData as boolean) ?? false,
      },
    };

    return jsonResponse(response);
  } catch (error) {
    return handleApiError(error);
  }
}
