import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  // Preview deployments must never be indexed in place of the real site.
  const isProduction =
    process.env.VERCEL_ENV === "production" || !process.env.VERCEL_ENV;

  return {
    rules: isProduction
      ? { userAgent: "*", allow: "/" }
      : { userAgent: "*", disallow: "/" },
    sitemap: `${site.url}/sitemap.xml`,
    host: site.url,
  };
}
