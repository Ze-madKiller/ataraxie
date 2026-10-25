// Sample questions for the dev-only /demo preview (no database needed).
import type { QuestionWithChoices } from "@/lib/types";

const base = {
  module_id: "demo",
  exam_document_id: null,
  exam_year: 2024,
  exam_session: "Normale",
  lesson_document_id: null,
  source_page: 1,
  answer_source: "corrige" as const,
  ai_confidence: "high" as const,
  ai_notes: null,
  status: "approved" as const,
};

function choices(qid: string, items: [string, boolean][]) {
  return items.map(([text, is_correct], i) => ({
    id: `${qid}-${i}`,
    question_id: qid,
    label: String.fromCharCode(65 + i),
    text,
    is_correct,
    position: i,
  }));
}

export const demoQuestions: QuestionWithChoices[] = [
  {
    ...base,
    id: "q1",
    number: 1,
    statement:
      "Concernant l'insuffisance cardiaque à fraction d'éjection réduite (ICFEr), quelles sont les propositions exactes ?",
    choices: choices("q1", [
      ["Elle est définie par une FEVG ≤ 40 %", true],
      ["Les IEC améliorent la survie", true],
      ["Le vérapamil est recommandé en traitement de fond", false],
      ["Le BNP est typiquement abaissé", false],
      ["Les bêtabloquants sont contre-indiqués en phase stable", false],
    ]),
    explanation:
      "A et B sont exactes. C est fausse : les inhibiteurs calciques non dihydropyridiniques sont délétères dans l'ICFEr. D est fausse : le BNP est élevé. E est fausse : les bêtabloquants font partie du traitement de fond une fois le patient stabilisé.",
    lesson_excerpt:
      "L'ICFEr est définie par une FEVG ≤ 40 %. Les IEC, les bêtabloquants et les antagonistes des récepteurs minéralocorticoïdes réduisent la mortalité.",
    lesson_title: "Cours 3 — Insuffisance cardiaque (exemple)",
    lesson_page: 12,
  },
  {
    ...base,
    id: "q2",
    number: 2,
    statement: "À propos du nœud sinusal :",
    choices: choices("q2", [
      ["Il est situé dans la paroi de l'oreillette droite", true],
      ["C'est le pacemaker physiologique du cœur", true],
      ["Sa fréquence de décharge au repos est de 60 à 100/min", true],
      ["Il est vascularisé exclusivement par l'artère interventriculaire antérieure", false],
      ["Il est situé dans le septum interventriculaire", false],
    ]),
    explanation:
      "A, B et C sont exactes. D est fausse : l'artère du nœud sinusal naît le plus souvent de la coronaire droite. E est fausse : c'est le faisceau de His qui chemine dans le septum.",
    lesson_excerpt:
      "Le nœud sinusal, situé à la jonction de la veine cave supérieure et de l'oreillette droite, impose une fréquence de 60 à 100 battements par minute.",
    lesson_title: "Cours 1 — Électrophysiologie cardiaque (exemple)",
    lesson_page: 4,
  },
  {
    ...base,
    id: "q3",
    number: 3,
    statement: "Parmi les signes suivants, lesquels évoquent une insuffisance cardiaque droite ?",
    choices: choices("q3", [
      ["Turgescence jugulaire", true],
      ["Hépatomégalie douloureuse", true],
      ["Reflux hépato-jugulaire", true],
      ["Crépitants bilatéraux à l'auscultation", false],
      ["Œdèmes des membres inférieurs", true],
    ]),
    explanation:
      "Les crépitants traduisent une congestion pulmonaire, signe d'insuffisance cardiaque gauche. Les autres signes traduisent la congestion veineuse systémique.",
    lesson_excerpt:
      "L'insuffisance ventriculaire droite se traduit par des signes de congestion systémique : turgescence jugulaire, reflux hépato-jugulaire, hépatomégalie douloureuse et œdèmes déclives.",
    lesson_title: "Cours 3 — Insuffisance cardiaque (exemple)",
    lesson_page: 18,
  },
];
