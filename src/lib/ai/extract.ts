import Anthropic, { toFile } from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { BetaContentBlockParam } from "@anthropic-ai/sdk/resources/beta/messages/messages";
import { z } from "zod";
import type { PageChunk } from "@/lib/pdf";

const MODEL = "claude-opus-5-5";
// Server-side fallback: if a safety classifier declines (e.g. a false positive on drug doses),
// the API re-runs the request on a recommended fallback model instead of failing the chunk.
const BETAS = ["server-side-fallback-2026-07-01"];

let client: Anthropic | null = null;
function anthropic(): Anthropic {
  client ??= new Anthropic();
  return client;
}

const ExtractedChoice = z.object({
  label: z.string().describe("Choice letter as printed, e.g. A, B, C"),
  text: z.string(),
  is_correct: z.boolean(),
});

const ExtractedQuestion = z.object({
  number: z.number().int().nullable().describe("Question number as printed, or null"),
  extract_page: z.number().int().describe("1-based page of the provided exam extract where the question starts"),
  statement: z.string(),
  choices: z.array(ExtractedChoice),
  answer_source: z.enum(["corrige", "exam", "ai"]),
  confidence: z.enum(["high", "medium", "low"]),
  explanation: z.string(),
  lesson_excerpt: z.string(),
  lesson_index: z.number().int().nullable().describe("Index N of the 'Cours #N' document the excerpt comes from"),
  lesson_page: z.number().int().nullable(),
  notes: z.string().describe("What the human reviewer should double-check; empty string if nothing"),
});

const ExtractionResult = z.object({ questions: z.array(ExtractedQuestion) });
const SingleQuestionResult = z.object({ question: ExtractedQuestion });

export type ExtractedQuestion = z.infer<typeof ExtractedQuestion> & { exam_page: number };

export interface SourceDoc {
  fileId: string;
  title: string;
}

const SYSTEM = `You build revision material for medical students from their faculty's past exams (QCM / multiple-choice, often several correct answers per question).

Sources you receive:
- "Cours #N" documents: the professor's lessons for this module. They are the reference for every answer and explanation.
- Optional "Corrigé" documents: the official answer key.
- An extract of the exam paper.

Rules:
- Copy statements and choices verbatim, in the exam's language. Only fix obvious OCR or typing errors. Never invent a question or a choice.
- When questions share a clinical case (cas clinique), repeat the case text at the start of each of its questions' statements.
- Correct answers, in order of priority:
  1. the Corrigé, if it covers the question → answer_source "corrige";
  2. answers marked on the exam paper itself → answer_source "exam";
  3. otherwise decide from the lessons → answer_source "ai".
- confidence: "high" only when the Corrigé or a lesson passage settles every choice unambiguously. Use "medium" or "low" otherwise, and say why in notes.
- lesson_excerpt: a verbatim passage (1-4 sentences) from the Cours that justifies the correct answers. Set lesson_index and lesson_page to where it comes from. If the lessons do not cover the question, use an empty excerpt, null lesson_index and lesson_page, confidence "low", and say so in notes.
- explanation: short, in the exam's language, addressed to a student: why the correct choices are correct and why each wrong choice is wrong, grounded in the lessons.
- If the Corrigé contradicts the lessons, follow the Corrigé and describe the conflict in notes.`;

function contextBlocks(lessons: SourceDoc[], corriges: SourceDoc[]): BetaContentBlockParam[] {
  const blocks: BetaContentBlockParam[] = lessons.map((doc, i) => ({
    type: "document",
    source: { type: "file", file_id: doc.fileId },
    title: `Cours #${i}: ${doc.title}`,
  }));
  // Lessons are identical for every chunk of every exam of a module: cache them.
  // The answer key differs per exam, so it goes after the breakpoint.
  const last = blocks.at(-1);
  if (last && last.type === "document") last.cache_control = { type: "ephemeral" };
  for (const doc of corriges) {
    blocks.push({ type: "document", source: { type: "file", file_id: doc.fileId }, title: `Corrigé: ${doc.title}` });
  }
  return blocks;
}

function pdfBlock(bytes: Uint8Array, title: string): BetaContentBlockParam {
  return {
    type: "document",
    source: { type: "base64", media_type: "application/pdf", data: Buffer.from(bytes).toString("base64") },
    title,
  };
}

function assertComplete(response: { stop_reason: string | null; stop_details?: { category?: string | null } | null }) {
  if (response.stop_reason === "refusal") {
    throw new Error(`Claude declined this extract (category: ${response.stop_details?.category ?? "unknown"}).`);
  }
  if (response.stop_reason === "max_tokens") {
    throw new Error("Claude's answer was cut off (max_tokens). Lower PAGES_PER_CHUNK in src/lib/pdf.ts.");
  }
}

export async function uploadPdfToAnthropic(bytes: Uint8Array, filename: string): Promise<string> {
  const file = await anthropic().files.upload({
    file: await toFile(bytes, filename, { type: "application/pdf" }),
  });
  return file.id;
}

export async function extractQuestions(input: {
  moduleName: string;
  examTitle: string;
  lessons: SourceDoc[];
  corriges: SourceDoc[];
  chunkPdf: Uint8Array;
  chunk: PageChunk;
}): Promise<ExtractedQuestion[]> {
  const { chunk } = input;
  const hasContextPage = chunk.contextStart < chunk.start;
  const firstOwnPage = chunk.start - chunk.contextStart + 1;
  const instruction = [
    `Module: ${input.moduleName}. Exam: ${input.examTitle}.`,
    `The exam extract above contains pages ${chunk.contextStart}-${chunk.end} of the original paper.`,
    hasContextPage
      ? `Its page 1 is context only (already processed): extract only questions that START on extract page ${firstOwnPage} or later, but use page 1 to complete a question or clinical case that began there.`
      : `Extract every question that starts in this extract.`,
    `If a question starts here but continues past the last page, extract what is visible and say so in notes.`,
    `Return an empty list if the extract contains no questions (cover page, instructions, answer sheet).`,
  ].join("\n");

  const response = await anthropic().beta.messages.parse({
    model: MODEL,
    max_tokens: 32000,
    betas: BETAS,
    fallbacks: "default",
    thinking: { type: "adaptive" },
    output_config: { effort: "high", format: betaZodOutputFormat(ExtractionResult) },
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: [
          ...contextBlocks(input.lessons, input.corriges),
          pdfBlock(input.chunkPdf, `Exam extract: ${input.examTitle}`),
          { type: "text", text: instruction },
        ],
      },
    ],
  });

  assertComplete(response);
  if (!response.parsed_output) throw new Error("Claude returned output that does not match the schema.");

  return response.parsed_output.questions
    .map((q) => ({ ...q, exam_page: chunk.contextStart + q.extract_page - 1 }))
    .filter((q) => q.exam_page >= chunk.start);
}

/** Re-checks one draft question against its exam page(s), optionally following the reviewer's feedback. */
export async function regenerateQuestion(input: {
  moduleName: string;
  examTitle: string;
  lessons: SourceDoc[];
  corriges: SourceDoc[];
  pagesPdf: Uint8Array;
  firstPage: number;
  current: unknown;
  feedback: string;
}): Promise<ExtractedQuestion> {
  const instruction = [
    `Module: ${input.moduleName}. Exam: ${input.examTitle}.`,
    `The exam extract above starts at page ${input.firstPage} of the original paper.`,
    `Here is a draft extraction of ONE question from it. Re-check it carefully against the exam and the lessons and return the corrected question.`,
    `Draft:\n${JSON.stringify(input.current, null, 2)}`,
    input.feedback ? `Reviewer feedback to address:\n${input.feedback}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const response = await anthropic().beta.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    betas: BETAS,
    fallbacks: "default",
    thinking: { type: "adaptive" },
    output_config: { effort: "high", format: betaZodOutputFormat(SingleQuestionResult) },
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: [
          ...contextBlocks(input.lessons, input.corriges),
          pdfBlock(input.pagesPdf, `Exam extract: ${input.examTitle}`),
          { type: "text", text: instruction },
        ],
      },
    ],
  });

  assertComplete(response);
  if (!response.parsed_output) throw new Error("Claude returned output that does not match the schema.");
  const q = response.parsed_output.question;
  return { ...q, exam_page: input.firstPage + q.extract_page - 1 };
}
