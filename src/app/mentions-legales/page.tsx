import type { Metadata } from "next";
import { FACULTY, SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "Mentions légales",
  description: `Mentions légales et données personnelles de ${SITE_NAME}.`,
  alternates: { canonical: "/mentions-legales" },
};

export default function LegalPage() {
  return (
    <article className="prose-page mx-auto max-w-2xl space-y-8">
      <header className="space-y-2">
        <h1 className="title">Mentions légales</h1>
        <p className="text-muted">Dernière mise à jour : octobre 2026.</p>
      </header>

      <section className="space-y-2">
        <h2 className="heading">Le site</h2>
        <p>
          {SITE_NAME} est un projet étudiant indépendant d&apos;aide à la révision. Il n&apos;est ni édité, ni validé,
          ni affilié à la {FACULTY} ou à l&apos;Université Sidi Mohamed Ben Abdellah. Les corrections sont préparées avec
          soin mais peuvent contenir des erreurs : le cours du professeur fait toujours foi. Le bouton « Signaler une
          erreur » sous chaque question permet de nous les indiquer.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="heading">Hébergement</h2>
        <p>
          Site hébergé par Vercel Inc. (États-Unis), région de Dublin. Base de données et comptes hébergés par Supabase
          (Union européenne, Irlande).
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="heading">Données personnelles</h2>
        <p>
          Nous enregistrons uniquement ce qui sert au fonctionnement du site : votre adresse email et votre mot de passe
          (chiffré) pour le compte, votre nom et votre semestre si vous les indiquez, et vos réponses aux QCM pour
          calculer votre progression. Ces données ne sont ni vendues ni partagées. Les statistiques vues par
          l&apos;administrateur sont agrégées.
        </p>
        <p>
          Vous pouvez modifier vos informations dans « Mon compte » et réinitialiser votre progression module par module.
          Pour supprimer votre compte, utilisez le bouton « Signaler une erreur » d&apos;une question en précisant votre
          demande, ou écrivez à l&apos;administrateur.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="heading">Cookies</h2>
        <p>
          Le site utilise seulement les cookies nécessaires à la connexion à votre compte. Aucun cookie publicitaire ni de
          mesure d&apos;audience.
        </p>
      </section>
    </article>
  );
}
