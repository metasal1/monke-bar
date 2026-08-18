import type { MetadataRoute } from "next";
import { HOUSE_MONKE } from "@/lib/house-monke";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const base = "https://monke.bar";
  return [
    {
      url: `${base}/`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 1,
    },
    {
      url: `${base}${HOUSE_MONKE.href}`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    // Famous / demo monkes
    {
      url: `${base}/gen2/1355`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${base}/gen2/1`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.6,
    },
    {
      url: `${base}/gen3/20`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.6,
    },
    {
      url: `${base}/barrel/430`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.5,
    },
    {
      url: `${base}/llms.txt`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.3,
    },
  ];
}
