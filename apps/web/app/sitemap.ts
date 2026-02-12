import type { MetadataRoute } from "next";
import { getAbsoluteUrl } from "./lib/site-url";

type SitemapEntry = {
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  priority: number;
};

const publicRoutes: SitemapEntry[] = [
  {
    path: "/",
    changeFrequency: "daily",
    priority: 1
  },
  {
    path: "/connect",
    changeFrequency: "weekly",
    priority: 0.7
  }
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return publicRoutes.map((route) => ({
    url: getAbsoluteUrl(route.path),
    lastModified,
    changeFrequency: route.changeFrequency,
    priority: route.priority
  }));
}
