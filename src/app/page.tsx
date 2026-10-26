import type { Metadata } from "next";
import Link from "next/link";
import { HomeCta } from "@/components/HomeCta";
import { getPublicModules, getPublicStats, type PublicModule } from "@/lib/public-content";
import { semesterLabel } from "@/lib/semesters";
import { FACULTY, SITE_DESCRIPTION, SITE_NAME, SITE_URL, jsonLd } from "@/lib/site";

// Static page, refreshed hourly so the stats and module list follow new imports.
export const revalidate = 3600;

// Canonical per page: a canonical on the root layout would be inherited by every page.
export const metadata: Metadata = { alternates: { canonical: "/" } };

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: SITE_NAME,
      description: SITE_DESCRIPTION,
      inLanguage: "fr",
      publisher: { "@id": `${SITE_URL}/#organization` },
    },
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: SITE_NAME,
      url: SITE_URL,
      logo: `${SITE_URL}/apple-icon`,
      description: `Révision des QCM d'examen pour les étudiants de la ${FACULTY}.`,
    },
  ],
};

const features = [
  {
    title: "Les vrais QCM des examens",
    text: "Les questions des examens passés de chaque module, classées par année et par session.",
  },
  {
    title: "Correction immédiate",
    text: "Bonnes réponses, erreurs et réponses oubliées, juste après chaque question.",
  },
  {
    title: "Expliqué par le cours",
    text: "Chaque correction cite l'extrait exact du cours du professeur, avec le titre et la page.",
  },
  {
    title: "Vos erreurs, à refaire",
    text: "Les questions ratées sont gardées pour que vous les retravailliez jusqu'à les réussir.",
  },
];

const steps = [
  { title: "Créez votre compte", text: "Gratuit. Choisissez votre semestre." },
  { title: "Ouvrez un module", text: "Un examen précis ou toutes les années, en entraînement ou en conditions d'examen." },
  { title: "Corrigez, refaites", text: "Lisez la correction tirée du cours, puis refaites vos erreurs." },
];

function PreviewCard() {
  const choices = [
    { label: "A", text: "Elle est définie par une FEVG ≤ 40 %", state: "correct" },
    { label: "B", text: "Les IEC améliorent la survie", state: "missed" },
    { label: "C", text: "Le BNP est typiquement abaissé", state: "wrong" },
  ] as const;
  const styles = {
    correct: "border-good bg-good-soft",
    wrong: "border-bad bg-bad-soft",
    missed: "border-warn bg-warn-soft",
  };
  const tags = {
    correct: { icon: "✓", text: "Bonne réponse", color: "text-good" },
    wrong: { icon: "✗", text: "Fausse", color: "text-bad" },
    missed: { icon: "!", text: "Oubliée", color: "text-warn" },
  };
  return (
    <figure className="card space-y-4 text-[0.9375rem] animate-slide-in sm:rotate-[0.6deg]" style={{ "--i": 3 } as React.CSSProperties} aria-label="Exemple de correction">
      <div className="flex justify-between text-xs font-medium text-muted">
        <span>Cardiologie · 2024</span>
        <span>Question 1 sur 40</span>
      </div>
      <p className="font-medium">Concernant l&apos;insuffisance cardiaque à fraction d&apos;éjection réduite :</p>
      <ul className="space-y-2">
        {choices.map((c, i) => (
          <li
            key={c.label}
            className={`demo-state flex items-start gap-3 rounded-xl border-[1.5px] p-3 ${styles[c.state]}`}
            style={{ "--i": i } as React.CSSProperties}
          >
            <span className="font-semibold">{c.label}</span>
            <span className="flex-1">{c.text}</span>
            <span
              className={`demo-tag inline-block text-xs font-semibold whitespace-nowrap ${tags[c.state].color}`}
              style={{ "--i": i } as React.CSSProperties}
            >
              <span aria-hidden>{tags[c.state].icon} </span>
              {tags[c.state].text}
            </span>
          </li>
        ))}
      </ul>
      <div className="citation demo-cite">
        <blockquote>« L&apos;ICFEr est définie par une FEVG ≤ 40 %. Les IEC réduisent la mortalité. »</blockquote>
        <figcaption>Cours : Insuffisance cardiaque, p. 12</figcaption>
      </div>
    </figure>
  );
}

async function loadHomeData(): Promise<{ stats: { modules: number; questions: number; exams: number } | null; modules: PublicModule[] }> {
  try {
    const [stats, modules] = await Promise.all([getPublicStats(), getPublicModules()]);
    return { stats, modules };
  } catch (e) {
    // The page must still render (and build) if Supabase is unreachable.
    console.error("home: public data unavailable", e);
    return { stats: null, modules: [] };
  }
}

export default async function Home() {
  const { stats, modules } = await loadHomeData();
  const featured = modules.filter((m) => m.questionCount > 0).slice(0, 6);

  return (
    <div className="space-y-20 sm:space-y-28">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(structuredData) }} />

      <section className="relative isolate grid items-center gap-10 pt-2 md:grid-cols-[1.15fr_1fr] md:gap-14">
        {/* Soft static glow behind the hero. Decorative. */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 right-0 -z-10 h-80 w-80 rounded-full bg-accent/20 blur-3xl md:right-10 md:h-[28rem] md:w-[28rem]"
        />
        <div className="space-y-6">
          <p className="eyebrow animate-rise" style={{ "--i": 0 } as React.CSSProperties}>
            Faculté de Médecine de Fès · Annales corrigées
          </p>
          {/* Movement only, no fade: the headline is the LCP element and must paint immediately. */}
          <h1 className="display animate-rise-solid" style={{ "--i": 1 } as React.CSSProperties}>
            Les QCM d&apos;examen de médecine, corrigés par le cours.
          </h1>
          <p className="lead animate-rise" style={{ "--i": 2 } as React.CSSProperties}>
            Révisez les examens passés de votre faculté, module par module. Après chaque question : la correction et
            l&apos;extrait exact du cours du professeur.
          </p>
          <div className="animate-rise" style={{ "--i": 3 } as React.CSSProperties}>
            <HomeCta secondary />
          </div>
          {stats && stats.questions > 0 && (
            <dl className="flex flex-wrap gap-x-10 gap-y-4 border-t border-line pt-6 animate-rise" style={{ "--i": 4 } as React.CSSProperties}>
              {[
                { n: stats.questions, label: "QCM corrigés" },
                { n: stats.exams, label: "examens" },
                { n: stats.modules, label: "modules" },
              ].map((s) => (
                <div key={s.label} className="flex flex-col-reverse">
                  <dt className="text-sm text-muted">{s.label}</dt>
                  <dd className="font-serif text-3xl font-semibold text-foreground">{s.n.toLocaleString("fr-FR")}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
        <PreviewCard />
      </section>

      <section className="space-y-8" aria-labelledby="features-title">
        <div className="reveal max-w-2xl space-y-3">
          <p className="eyebrow">Ce que vous trouverez ici</p>
          <h2 id="features-title" className="title">
            Moins de temps à chercher la réponse, plus de temps à la comprendre.
          </h2>
        </div>
        <ul className="grid gap-x-10 gap-y-8 sm:grid-cols-2">
          {features.map((f, i) => (
            <li key={f.title} className="reveal flex gap-4" style={{ "--i": i } as React.CSSProperties}>
              <span className="font-serif text-2xl font-semibold text-accent" aria-hidden>
                {String(i + 1).padStart(2, "0")}
              </span>
              <div>
                <h3 className="heading">{f.title}</h3>
                <p className="mt-1 text-muted">{f.text}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="reveal rounded-3xl bg-sand px-5 py-10 sm:px-10 sm:py-12" aria-labelledby="scoring-title">
        <div className="grid gap-8 md:grid-cols-[1fr_1.2fr] md:items-center">
          <div className="space-y-3">
            <p className="eyebrow">Comme le jour de l&apos;examen</p>
            <h2 id="scoring-title" className="title">
              Notation « tout ou rien »
            </h2>
          </div>
          <p className="text-lg text-on-sand">
            Une question rapporte un point seulement si vous cochez exactement toutes les bonnes réponses, et aucune
            fausse. Une réponse oubliée compte comme une erreur : vous savez tout de suite où vous en êtes vraiment.
          </p>
        </div>
      </section>

      <section className="space-y-8" aria-labelledby="steps-title">
        <h2 id="steps-title" className="title">
          Comment ça marche
        </h2>
        <ol className="grid gap-6 sm:grid-cols-3">
          {steps.map((s, i) => (
            <li key={s.title} className="reveal space-y-2" style={{ "--i": i } as React.CSSProperties}>
              {/* The accent rule grows from the left as the step scrolls in. */}
              <span aria-hidden className="reveal-grow-x mb-4 block h-0.5 w-full rounded-full bg-accent" />
              <p className="text-sm font-semibold text-accent">Étape {i + 1}</p>
              <h3 className="heading">{s.title}</h3>
              <p className="text-muted">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {featured.length > 0 && (
        <section className="space-y-6" aria-labelledby="modules-title">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 id="modules-title" className="title">
              Modules disponibles
            </h2>
            <Link href="/modules" className="link-quiet font-medium">
              Tous les modules →
            </Link>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((m, i) => (
              <li key={m.id} className="reveal" style={{ "--i": Math.min(i, 5) } as React.CSSProperties}>
                <Link href={`/modules/${m.slug}`} className="card card-link block h-full">
                  <p className="text-xs font-medium text-muted">{m.semester ? semesterLabel(m.semester) : "Tous semestres"}</p>
                  <h3 className="heading mt-1">QCM de {m.name}</h3>
                  <p className="mt-3 text-sm font-medium text-accent">{m.questionCount} questions corrigées</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card reveal flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:justify-between sm:p-10">
        <div className="space-y-1">
          <h2 className="title">Prêt à réviser ?</h2>
          <p className="text-muted">Choisissez votre semestre et commencez par le module de votre choix.</p>
        </div>
        <HomeCta />
      </section>
    </div>
  );
}
