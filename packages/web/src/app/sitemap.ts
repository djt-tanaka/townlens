import type { MetadataRoute } from "next";
import { CITY_LOCATIONS } from "@townlens/core";
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

  // 都市ページ（CITY_LOCATIONS 登録済みの主要都市）
  const cityPages: MetadataRoute.Sitemap = [...CITY_LOCATIONS.values()].map(
    (loc) => ({
      url: `${baseUrl}/city/${encodeURIComponent(loc.name)}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }),
  );

  return [...staticPages, ...reportPages, ...cityPages];
}
