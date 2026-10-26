import Link from "next/link";
import { notFound } from "next/navigation";
import { Quiz } from "@/components/Quiz";
import { demoQuestions } from "@/lib/demo-data";

// Dev-only preview of the student quiz with sample data.
export default function DemoPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <div className="space-y-4">
      <p className="rounded-lg bg-warn-soft p-3 text-sm text-warn">
        Aperçu avec des questions d&apos;exemple. <Link href="/demo/review" className="underline">Voir l&apos;écran de vérification admin →</Link>
      </p>
      <h1 className="title">Cardiologie (démo)</h1>
      <Quiz moduleSlug="demo" questions={demoQuestions} mode="practice" />
    </div>
  );
}
