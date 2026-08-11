import type { MetadataRoute } from "next";
import { allProjects } from "@/lib/projects";
import { site } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages: MetadataRoute.Sitemap = [
    { url: site.url, changeFrequency: "monthly", priority: 1 },
    { url: `${site.url}/projects`, changeFrequency: "monthly", priority: 0.9 },
    { url: `${site.url}/studio`, changeFrequency: "yearly", priority: 0.7 },
    { url: `${site.url}/contact`, changeFrequency: "yearly", priority: 0.6 },
  ];

  return [
    ...pages,
    ...allProjects.map((p) => ({
      url: `${site.url}/projects/${p.slug}`,
      changeFrequency: "yearly" as const,
      priority: 0.8,
    })),
  ];
}
