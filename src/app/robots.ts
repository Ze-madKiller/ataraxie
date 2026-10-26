import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // /admin and /compte stay crawlable on purpose: they carry noindex, which crawlers only see if
        // they may fetch the page. A robots.txt block alone can still leave the URL in results.
        disallow: ["/api", "/auth", "/demo", "/*?next="],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
