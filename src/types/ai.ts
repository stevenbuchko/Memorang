import { z } from "zod";

// --- Zod Schemas for AI Response Validation ---

export const SummaryResponseSchema = z.object({
  shortSummary: z.string(),
  detailedSummary: z.string(),
  tags: z.array(
    z.object({
      label: z.string(),
      category: z.enum([
        "topic",
        "document_type",
        "entity",
        "methodology",
        "domain",
      ]),
      confidence: z.number().min(0).max(1),
    })
  ),
  documentType: z.enum([
    "report",
    "research_paper",
    "invoice",
    "contract",
    "letter",
    "manual",
    "presentation",
    "spreadsheet_export",
    "form",
    "other",
  ]),
});

export const EvaluationResponseSchema = z.object({
  completeness: z.object({
    score: z.number().int().min(1).max(10),
    rationale: z.string(),
  }),
  confidence: z.object({
    score: z.number().int().min(1).max(10),
    rationale: z.string(),
  }),
  specificity: z.object({
    score: z.number().int().min(1).max(10),
    rationale: z.string(),
  }),
  overall: z.object({
    score: z.number().int().min(1).max(10),
    rationale: z.string(),
  }),
});

// --- TypeScript Types ---

export type SummaryResponse = z.infer<typeof SummaryResponseSchema>;
export type EvaluationResponse = z.infer<typeof EvaluationResponseSchema>;

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
}

export interface SummaryInput {
  content: string;
  contentType: "text" | "image";
  projectContext?: string;
}

export interface SummaryOutput {
  shortSummary: string;
  detailedSummary: string;
  documentType: string;
  tags: Array<{
    label: string;
    category: "topic" | "document_type" | "entity" | "methodology" | "domain";
    confidence: number;
  }>;
  tokenUsage: TokenUsage;
  processingTimeMs: number;
}

export interface EvaluationInput {
  originalContent: string;
  summary: string;
}

export interface EvaluationOutput {
  completeness: { score: number; rationale: string };
  confidence: { score: number; rationale: string };
  specificity: { score: number; rationale: string };
  overall: { score: number; rationale: string };
  tokenUsage: TokenUsage;
}

export interface ModelProvider {
  id: string;
  name: string;
  supportsVision: boolean;
  costPerInputToken: number;
  costPerOutputToken: number;

  generateSummary(input: SummaryInput): Promise<SummaryOutput>;
  evaluateSummary(input: EvaluationInput): Promise<EvaluationOutput>;
}
