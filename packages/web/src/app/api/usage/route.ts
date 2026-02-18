/**
 * GET /api/usage
 * 利用量確認 API。認証必須。
 */

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import {
  jsonResponse,
  handleApiError,
  getCurrentMonth,
  getReportLimit,
} from "@/lib/api-utils";
import type { UsageResponse } from "@/types";

export async function GET() {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const { user, supabase } = authResult;

    // プラン情報を取得
    const { data: profile } = await supabase
      .from("profiles")
      .select("plan")
      .eq("id", user.id)
      .single();

    const plan = (profile?.plan ?? "free") as UsageResponse["plan"];

    // 当月の利用量を取得
    const currentMonth = getCurrentMonth();
    const { data: usage } = await supabase
      .from("usage_records")
      .select("report_count")
      .eq("user_id", user.id)
      .eq("month", currentMonth)
      .single();

    const response: UsageResponse = {
      plan,
      currentMonth: {
        reportsGenerated: usage?.report_count ?? 0,
        reportsLimit: getReportLimit(plan),
      },
    };

    return jsonResponse(response);
  } catch (error) {
    return handleApiError(error);
  }
}
