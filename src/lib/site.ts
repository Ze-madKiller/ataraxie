// Public identity of the site, shared by metadata, robots, sitemap, JSON-LD and the OG image.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://e-ataraxie.vercel.app").replace(/\/$/, "");
export const SITE_NAME = "E-ATARAXIE";
export const FACULTY = "Faculté de Médecine et de Pharmacie de Fès";
export const SITE_TAGLINE = "Les QCM d'examen de médecine de Fès, corrigés par le cours";
export const SITE_DESCRIPTION =
  "Révisez les annales de QCM de la Faculté de Médecine de Fès, module par module, avec la correction et l'extrait exact du cours.";

/** Serialises JSON-LD for a <script> tag. Escapes "<" so content can never close the tag. */
export function jsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
