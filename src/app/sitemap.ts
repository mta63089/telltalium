import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const root = "https://telltalium.xyz";
  return [
    { url: root, changeFrequency: "weekly", priority: 1 },
    { url: `${root}/methodology`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${root}/privacy`, changeFrequency: "yearly", priority: 0.2 },
  ];
}
