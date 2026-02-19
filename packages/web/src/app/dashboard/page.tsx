import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentMonth, getReportLimit } from "@/lib/api-utils";
import { UsageCard } from "@/components/dashboard/usage-card";
import { ReportHistory } from "@/components/dashboard/report-history";
import { EmptyReports } from "@/components/dashboard/empty-reports";

export const metadata: Metadata = {
  title: "ダッシュボード | TownLens",
};

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const currentMonth = getCurrentMonth();

  // 並列でプロファイル、利用量、レポート一覧を取得
  const [profileResult, usageResult, reportsResult] = await Promise.all([
    supabase.from("profiles").select("plan").eq("id", user.id).single(),
    supabase
      .from("usage_records")
      .select("report_count")
      .eq("user_id", user.id)
      .eq("month", currentMonth)
      .single(),
    supabase
      .from("reports")
      .select("id, cities, preset, status, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .range(0, 49),
  ]);

  // プロファイルは必須（トリガーで自動生成されるため、存在しない場合はエラー）
  if (profileResult.error || !profileResult.data) {
    throw new Error("ユーザープロファイルの取得に失敗しました");
  }

  // usage_records は当月の記録がない場合（初回利用）は PGRST116 が返るため許容
  if (usageResult.error && usageResult.error.code !== "PGRST116") {
    throw new Error("利用量データの取得に失敗しました");
  }

  if (reportsResult.error) {
    throw new Error("レポート一覧の取得に失敗しました");
  }

  const plan = profileResult.data.plan;
  const reportsGenerated = usageResult.data?.report_count ?? 0;
  const reportsLimit = getReportLimit(plan);
  const reports = reportsResult.data ?? [];

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-black">ダッシュボード</h1>

      {/* 利用量 + プラン情報 */}
      <div className="mb-8 grid gap-6 sm:grid-cols-2">
        <UsageCard
          plan={plan}
          reportsGenerated={reportsGenerated}
          reportsLimit={reportsLimit}
        />
      </div>

      {/* レポート履歴 or 空状態 */}
      {reports.length > 0 ? (
        <ReportHistory reports={reports} />
      ) : (
        <EmptyReports />
      )}
    </main>
  );
}
