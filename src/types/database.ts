export type DocumentSource = "thread" | "knowledge_base";
export type DocumentStatus = "uploading" | "processing" | "completed" | "failed";
export type ProcessingStrategy = "text_extraction" | "multimodal";
export type SummaryStatus = "processing" | "completed" | "failed";
export type FeedbackRating = "thumbs_up" | "thumbs_down";
export type ExtractionErrorType =
  | "password_protected"
  | "corrupted"
  | "no_text"
  | "storage_error"
  | "unknown";

export interface Document {
  id: string;
  filename: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  page_count: number | null;
  extracted_text: string | null;
  extraction_success: boolean;
  status: DocumentStatus;
  error_message: string | null;
  error_type: ExtractionErrorType | null;
  project_context: string | null;
  source: DocumentSource;
  created_at: string;
  updated_at: string;
}

export interface Summary {
  id: string;
  document_id: string;
  strategy: ProcessingStrategy;
  model_id: string;
  model_name: string;
  summary_short: string | null;
  summary_detailed: string | null;
  document_type: string | null;
  tags: Tag[];
  processing_time_ms: number | null;
  input_tokens: number | null;
  output_tokens: number | null;
  total_tokens: number | null;
  estimated_cost_usd: number | null;
  status: SummaryStatus;
  error_message: string | null;
  created_at: string;
}

export interface Tag {
  label: string;
  category: "topic" | "document_type" | "entity" | "methodology" | "domain";
  confidence: number;
}

export interface Evaluation {
  id: string;
  summary_id: string;
  completeness_score: number | null;
  completeness_rationale: string | null;
  confidence_score: number | null;
  confidence_rationale: string | null;
  specificity_score: number | null;
  specificity_rationale: string | null;
  overall_score: number | null;
  overall_rationale: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
  total_tokens: number | null;
  estimated_cost_usd: number | null;
  created_at: string;
}

export interface Feedback {
  id: string;
  summary_id: string;
  rating: FeedbackRating;
  comment: string | null;
  created_at: string;
  updated_at: string;
}

export interface SummaryWithEvaluation extends Summary {
  evaluation: Evaluation | null;
}

export interface SummaryWithFeedback extends SummaryWithEvaluation {
  feedback: Feedback | null;
}

export interface DocumentWithSummaries extends Document {
  summaries: SummaryWithFeedback[];
}
