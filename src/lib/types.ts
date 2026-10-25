export type DocumentKind = "exam" | "cours" | "corrige";
export type QuestionStatus = "draft" | "approved" | "rejected";
export type Confidence = "high" | "medium" | "low";
export type AnswerSource = "corrige" | "exam" | "ai" | "manual";

export interface Module {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  position: number;
}

export interface DocumentRow {
  id: string;
  module_id: string;
  kind: DocumentKind;
  title: string;
  storage_path: string;
  page_count: number | null;
  anthropic_file_id: string | null;
  exam_year: number | null;
  exam_session: string | null;
  created_at: string;
}

export interface ImportJob {
  id: string;
  module_id: string;
  exam_document_id: string;
  status: "pending" | "running" | "done" | "error";
  chunks: { start: number; end: number; contextStart: number }[];
  done_chunks: number;
  questions_created: number;
  error: string | null;
  created_at: string;
}

export interface Choice {
  id: string;
  question_id: string;
  label: string;
  text: string;
  is_correct: boolean;
  position: number;
}

export interface Question {
  id: string;
  module_id: string;
  exam_document_id: string | null;
  exam_year: number | null;
  exam_session: string | null;
  number: number | null;
  statement: string;
  explanation: string | null;
  lesson_excerpt: string | null;
  lesson_document_id: string | null;
  lesson_title: string | null;
  lesson_page: number | null;
  source_page: number | null;
  answer_source: AnswerSource | null;
  ai_confidence: Confidence | null;
  ai_notes: string | null;
  status: QuestionStatus;
  updated_at?: string;
}

export interface QuestionWithChoices extends Question {
  choices: Choice[];
}
