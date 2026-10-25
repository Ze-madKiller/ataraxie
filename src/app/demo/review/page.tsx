import Link from "next/link";
import { notFound } from "next/navigation";
import { ReviewCard } from "@/app/admin/(protected)/review/ReviewCard";
import { demoQuestions } from "@/lib/demo-data";

// Dev-only preview of the admin review card. Buttons need a database, so saving will fail here.
export default function DemoReviewPage() {
  if (process.env.NODE_ENV === "production") notFound();
  const draft = {
    ...demoQuestions[0],
    status: "draft" as const,
    answer_source: "ai" as const,
    ai_confidence: "medium" as const,
    ai_notes: "Pas de corrigé pour cette session : réponses déduites du cours p. 12. Vérifier la proposition D.",
  };
  return (
    <div className="space-y-4">
      <p className="rounded-lg bg-warn-soft p-3 text-sm text-warn">
        Aperçu de l&apos;écran admin « Vérification ». Les boutons ont besoin de la base de données.{" "}
        <Link href="/demo" className="underline">← Retour au quiz</Link>
      </p>
      <ReviewCard question={draft} />
    </div>
  );
}
