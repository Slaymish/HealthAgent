import type { MetadataRoute } from "next";
import { getAbsoluteUrl } from "./lib/site-url";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/"]
      },
      {
        userAgent: ["GPTBot", "ChatGPT-User", "ClaudeBot", "CCBot", "PerplexityBot", "Google-Extended"],
        allow: "/",
        disallow: ["/api/"]
      }
    ],
    sitemap: getAbsoluteUrl("/sitemap.xml")
  };
}
