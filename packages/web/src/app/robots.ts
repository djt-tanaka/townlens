import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://townlens.jp";

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/dashboard",
        "/api/reports",
        "/api/stripe",
        "/api/usage",
        "/api/cities",
        "/auth/callback",
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
