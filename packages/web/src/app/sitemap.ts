import type { MetadataRoute } from "next";
import { createAdminClient } from "@/lib/supabase/admin";

/** DB アクセスがあるためビルド時プリレンダリングを無効化 */
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://townlens.jp";

  // 静的ページ
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${baseUrl}/pricing`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/auth/login`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
  ];

  // 完了済みレポートを DB から取得
  const supabase = createAdminClient();
  const { data: reports } = await supabase
    .from("reports")
    .select("id, created_at")
    .eq("status", "completed")
    .order("created_at", { ascending: false })
    .limit(1000);

  const reportPages: MetadataRoute.Sitemap = (reports ?? []).map(
    (report) => ({
      url: `${baseUrl}/report/${report.id}`,
      lastModified: new Date(report.created_at),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    }),
  );

  return [...staticPages, ...reportPages];
}
