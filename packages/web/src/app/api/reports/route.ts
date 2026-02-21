/**
 * POST /api/reports
 * レポート生成 API。認証必須。
 *
 * 利用量チェック → core パイプライン実行 → DB 保存 → レスポンス返却
 */

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createEstatClient, createReinfoClient } from "@/lib/api-clients";
import { createReportSchema } from "@/lib/validations";
import {
  errorResponse,
  handleApiError,
  getCurrentMonth,
  getReportLimit,
} from "@/lib/api-utils";
import { runReportPipeline } from "@/lib/report-pipeline";
import type { CreateReportResponse } from "@/types";

export async function POST(request: Request) {
  try {
    // 認証チェック
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const { user, supabase } = authResult;

    // リクエストボディのバリデーション
    const body = await request.json();
    const parsed = createReportSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(
        parsed.error.issues[0]?.message ?? "バリデーションエラー",
        400,
      );
    }

    const { cities, preset, options } = parsed.data;
    const admin = createAdminClient();

    // プラン情報を取得
    const { data: profile } = await supabase
      .from("profiles")
      .select("plan")
      .eq("id", user.id)
      .single();

    const plan = profile?.plan ?? "free";

    // 利用量チェック
    const currentMonth = getCurrentMonth();
    const { data: usage } = await admin
      .from("usage_records")
      .select("report_count")
      .eq("user_id", user.id)
      .eq("month", currentMonth)
      .single();

    const currentCount = usage?.report_count ?? 0;
    const limit = getReportLimit(plan);

    if (limit !== null && currentCount >= limit) {
      return errorResponse(
        `月間レポート上限（${limit}件）に達しています。プランをアップグレードしてください。`,
        403,
      );
    }

    // レポートレコードを作成（status: processing）
    const { data: report, error: insertError } = await admin
      .from("reports")
      .insert({
        user_id: user.id,
        cities: [...cities],
        preset,
        status: "processing" as const,
      })
      .select("id")
      .single();

    if (insertError || !report) {
      return errorResponse("レポートの作成に失敗しました", 500);
    }

    // パイプライン実行
    const includePrice = options?.includePrice ?? true;
    const includeCrime = options?.includeCrime ?? true;
    const includeDisaster = options?.includeDisaster ?? true;
    const includeEducation = options?.includeEducation ?? true;
    const includeTransport = options?.includeTransport ?? true;
    const includeHealthcare = options?.includeHealthcare ?? true;

    let reinfoClient;
    try {
      reinfoClient = createReinfoClient();
    } catch {
      // REINFOLIB_API_KEY 未設定の場合は reinfo なしで進行
    }

    try {
      const result = await runReportPipeline(
        { cityNames: cities, preset, includePrice, includeCrime, includeDisaster, includeEducation, includeTransport, includeHealthcare },
        { estatClient: createEstatClient(), reinfoClient },
      );

      // 結果を保存
      await admin
        .from("reports")
        .update({
          status: "completed" as const,
          result_json: JSON.parse(
            JSON.stringify({
              results: result.results,
              definitions: result.definitions,
              rawRows: result.rawRows,
              hasPriceData: result.hasPriceData,
              hasCrimeData: result.hasCrimeData,
              hasDisasterData: result.hasDisasterData,
              hasEducationData: result.hasEducationData,
              hasTransportData: result.hasTransportData,
              hasHealthcareData: result.hasHealthcareData,
              preset: result.preset,
              timeLabel: result.timeLabel,
            }),
          ),
        })
        .eq("id", report.id);

      // 利用量をインクリメント
      await admin.from("usage_records").upsert(
        {
          user_id: user.id,
          month: currentMonth,
          report_count: currentCount + 1,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,month" },
      );

      const response: CreateReportResponse = {
        reportId: report.id,
        status: "completed",
      };
      return NextResponse.json(response, { status: 201 });
    } catch (pipelineError) {
      // パイプライン失敗時はレポートを failed に更新
      const errorMessage =
        pipelineError instanceof Error
          ? pipelineError.message
          : "パイプライン実行に失敗しました";
      await admin
        .from("reports")
        .update({
          status: "failed" as const,
          error_message: errorMessage,
        })
        .eq("id", report.id);

      const response: CreateReportResponse = {
        reportId: report.id,
        status: "failed",
        error: errorMessage,
      };
      return NextResponse.json(response, { status: 500 });
    }
  } catch (error) {
    return handleApiError(error);
  }
}
