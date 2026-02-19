import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://townlens.jp";

  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/api/og"],
      disallow: ["/dashboard", "/api/", "/auth/callback"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
