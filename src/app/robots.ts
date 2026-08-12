import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  // Preview deployments must never be indexed in place of the real site.
  const isProduction =
    process.env.VERCEL_ENV === "production" || !process.env.VERCEL_ENV;

  return {
    rules: isProduction
      ? // /sps/ is a field tool that happens to be hosted here, not part of
        // the practice's site. Keep it out of the index.
        { userAgent: "*", allow: "/", disallow: "/sps/" }
      : { userAgent: "*", disallow: "/" },
    sitemap: `${site.url}/sitemap.xml`,
    host: site.url,
  };
}
