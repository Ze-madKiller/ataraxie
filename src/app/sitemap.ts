import type { MetadataRoute } from "next";
import { getPublicModules } from "@/lib/public-content";
import { SITE_URL } from "@/lib/site";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let modules: MetadataRoute.Sitemap = [];
  try {
    modules = (await getPublicModules()).map((m) => ({
      url: `${SITE_URL}/modules/${m.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));
  } catch (e) {
    // Missing key or Supabase down: still serve the static pages rather than failing the build.
    console.error("sitemap: module list unavailable", e);
  }
  return [
    { url: `${SITE_URL}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/modules`, changeFrequency: "weekly", priority: 0.9 },
    ...modules,
    { url: `${SITE_URL}/inscription`, changeFrequency: "yearly", priority: 0.5 },
    { url: `${SITE_URL}/mentions-legales`, changeFrequency: "yearly", priority: 0.1 },
  ];
}
