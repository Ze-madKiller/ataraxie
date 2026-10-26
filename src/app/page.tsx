import type { Metadata } from "next";
import { HomeCta } from "@/components/HomeCta";
import { FACULTY, SITE_DESCRIPTION, SITE_NAME, SITE_URL, jsonLd } from "@/lib/site";

const features = [
  {
    title: "Les vrais QCM des examens",
    text: "Les questions des examens passés de chaque module, classées par année et par session.",
  },
  {
    title: "Correction immédiate",
    text: "Après chaque QCM : les bonnes réponses, vos erreurs et les réponses oubliées, tout de suite.",
  },
  {
    title: "Expliqué par le cours",
    text: "Chaque correction cite l'extrait exact du cours du professeur, avec le titre et la page.",
  },
  {
    title: "Vos erreurs, à refaire",
    text: "Le site retient les questions ratées pour que vous les retravailliez jusqu'à les réussir.",
  },
];

const steps = [
  "Créez votre compte et choisissez votre semestre.",
  "Ouvrez un module : un examen précis ou toutes les années.",
  "Répondez, lisez la correction, refaites vos erreurs.",
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
  const tags = { correct: "Bonne réponse", wrong: "Fausse", missed: "Oubliée" };
  return (
    <div className="card space-y-3 p-5 text-sm shadow-sm" aria-hidden>
      <div className="flex justify-between text-xs text-muted">
        <span>Cardiologie · 2024 · Q1</span>
        <span>Question 1/40</span>
      </div>
      <p className="font-medium">Concernant l&apos;insuffisance cardiaque à fraction d&apos;éjection réduite :</p>
      <ul className="space-y-2">
        {choices.map((c) => (
          <li key={c.label} className={`flex items-start gap-3 rounded-lg border p-2.5 ${styles[c.state]}`}>
            <span className="font-semibold">{c.label}</span>
            <span className="flex-1">{c.text}</span>
            <span className="text-xs font-medium">{tags[c.state]}</span>
          </li>
        ))}
      </ul>
      <figure className="border-l-4 border-accent bg-accent-soft p-3">
        <blockquote className="italic">« L&apos;ICFEr est définie par une FEVG ≤ 40 %. Les IEC réduisent la mortalité. »</blockquote>
        <figcaption className="mt-1 text-xs text-muted">Cours : Insuffisance cardiaque, p. 12</figcaption>
      </figure>
    </div>
  );
}

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

export default function Home() {
  return (
    <div className="space-y-16 py-4">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(structuredData) }} />
      <section className="grid items-center gap-10 md:grid-cols-[1.1fr_1fr]">
        <div className="space-y-5">
          <p className="text-sm font-medium text-accent">Pour les étudiants en médecine</p>
          <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
            Révisez l&apos;Ataraxie avec E-ATARAXIE, module par module.
          </h1>
          <p className="text-lg text-muted">
            Les QCM des examens passés de votre faculté, corrigés immédiatement avec l&apos;extrait exact du cours du
            professeur.
          </p>
          <HomeCta secondary />
        </div>
        <PreviewCard />
      </section>

      <section className="space-y-6">
        <h2 className="text-2xl font-semibold tracking-tight">Ce que vous trouverez ici</h2>
        <ul className="grid gap-4 sm:grid-cols-2">
          {features.map((f) => (
            <li key={f.title} className="card p-5">
              <h3 className="font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted">{f.text}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-6">
        <h2 className="text-2xl font-semibold tracking-tight">Comment ça marche</h2>
        <ol className="grid gap-4 sm:grid-cols-3">
          {steps.map((s, i) => (
            <li key={s} className="card p-5">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-soft font-semibold text-accent">
                {i + 1}
              </span>
              <p className="mt-3 text-sm">{s}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="card flex flex-col items-start gap-4 p-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Prêt à réviser ?</h2>
          <p className="text-sm text-muted">Choisissez votre semestre et commencez par le module de votre choix.</p>
        </div>
        <HomeCta />
      </section>
    </div>
  );
}
