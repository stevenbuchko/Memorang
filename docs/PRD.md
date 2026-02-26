# PRD: Attachment Intelligence POC

**Project:** Memorang Attachment Intelligence
**Date:** February 26, 2026
**Stack:** Next.js 14+ (App Router) · Supabase · shadcn/ui · Vercel · OpenAI

---

## 1. Problem

Users upload attachments throughout the Memorang platform without context — no indication of what the file contains or whether it's relevant to the project. This forces users to open every file to understand its purpose.

## 2. Solution (POC)

Upload a PDF → AI generates a summary, tags, and self-evaluation scores using two different processing strategies → display results side-by-side for comparison → collect user feedback.

The POC serves a dual purpose: proving the summarization concept AND acting as an evaluation tool to compare processing strategies and models.

## 3. POC Scope

- PDF uploads only
- No authentication
- Dual processing: text extraction route (GPT-4.1-mini) vs multimodal route (GPT-4o)
- AI self-evaluation on quality dimensions
- Side-by-side comparison UI with cost/speed/quality metrics
- Thumbs up/down feedback with optional comments
- Per-document cost tracking
- Optional hard-coded project context for relevance testing

---

## 4. Technical Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Framework | Next.js 14+ (App Router) | Server actions for API layer |
| UI | shadcn/ui + Tailwind CSS | |
| Database | Supabase (Postgres) | Free tier |
| File Storage | Supabase Storage | PDFs stored here |
| AI (Text) | OpenAI GPT-4.1-mini | $0.40/M input, $1.60/M output |
| AI (Vision) | OpenAI GPT-4o | $2.50/M input, $10/M output |
| PDF Parsing | pdf-parse | Text extraction from PDFs |
| PDF to Image | pdfjs-dist + canvas (or sharp) | Convert pages to PNG for multimodal |
| Validation | Zod | Structured output validation |
| Deployment | Vercel | |

---

## 5. Data Model

```sql
CREATE TYPE document_status AS ENUM ('uploading', 'processing', 'completed', 'failed');
CREATE TYPE processing_strategy AS ENUM ('text_extraction', 'multimodal');
CREATE TYPE summary_status AS ENUM ('processing', 'completed', 'failed');
CREATE TYPE feedback_rating AS ENUM ('thumbs_up', 'thumbs_down');

CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    filename TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type TEXT NOT NULL DEFAULT 'application/pdf',
    page_count INTEGER,
    extracted_text TEXT,
    extraction_success BOOLEAN DEFAULT false,
    status document_status NOT NULL DEFAULT 'uploading',
    error_message TEXT,
    project_context TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    strategy processing_strategy NOT NULL,
    model_id TEXT NOT NULL,
    model_name TEXT NOT NULL,
    summary_short TEXT,
    summary_detailed TEXT,
    document_type TEXT,
    tags JSONB DEFAULT '[]',
    processing_time_ms INTEGER,
    input_tokens INTEGER,
    output_tokens INTEGER,
    total_tokens INTEGER,
    estimated_cost_usd DECIMAL(10, 6),
    status summary_status NOT NULL DEFAULT 'processing',
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE evaluations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    summary_id UUID NOT NULL REFERENCES summaries(id) ON DELETE CASCADE,
    completeness_score INTEGER CHECK (completeness_score BETWEEN 1 AND 10),
    completeness_rationale TEXT,
    confidence_score INTEGER CHECK (confidence_score BETWEEN 1 AND 10),
    confidence_rationale TEXT,
    specificity_score INTEGER CHECK (specificity_score BETWEEN 1 AND 10),
    specificity_rationale TEXT,
    overall_score INTEGER CHECK (overall_score BETWEEN 1 AND 10),
    overall_rationale TEXT,
    input_tokens INTEGER,
    output_tokens INTEGER,
    total_tokens INTEGER,
    estimated_cost_usd DECIMAL(10, 6),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    summary_id UUID NOT NULL REFERENCES summaries(id) ON DELETE CASCADE,
    rating feedback_rating NOT NULL,
    comment TEXT CHECK (char_length(comment) <= 500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_summaries_document_id ON summaries(document_id);
CREATE INDEX idx_evaluations_summary_id ON evaluations(summary_id);
CREATE INDEX idx_feedback_summary_id ON feedback(summary_id);

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER documents_updated_at
    BEFORE UPDATE ON documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER feedback_updated_at
    BEFORE UPDATE ON feedback
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

---

## 6. Model Provider Abstraction

Models are swappable via a provider interface. Adding a new model means implementing the interface — no pipeline or UI changes needed.

```typescript
interface ModelProvider {
  id: string;
  name: string;
  supportsVision: boolean;
  costPerInputToken: number;
  costPerOutputToken: number;

  generateSummary(input: SummaryInput): Promise<SummaryOutput>;
  evaluateSummary(input: EvaluationInput): Promise<EvaluationOutput>;
}

interface SummaryInput {
  content: string;
  contentType: "text" | "image";
  projectContext?: string;
}

interface SummaryOutput {
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

interface EvaluationOutput {
  completeness: { score: number; rationale: string };
  confidence: { score: number; rationale: string };
  specificity: { score: number; rationale: string };
  overall: { score: number; rationale: string };
  tokenUsage: TokenUsage;
}

interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
}
```

---

## 7. AI Prompts

### Summary Generation

```
You are a document analysis assistant. Given the contents of a document, generate:

1. A SHORT SUMMARY (2-3 sentences) suitable for inline display. Be specific
   to THIS document — avoid generic descriptions.
2. A DETAILED SUMMARY (2-4 paragraphs) covering main topics, key findings,
   and notable details.
3. TAGS — array of relevant tags, each with:
   - label: the tag text
   - category: one of "topic", "document_type", "entity", "methodology", "domain"
   - confidence: 0.0-1.0
4. DOCUMENT TYPE — classify as one of: report, research_paper, invoice,
   contract, letter, manual, presentation, spreadsheet_export, form, other

{If project context provided:}
The document belongs to a project with this context: {projectContext}
Consider relevance to this project in your analysis.

Respond in JSON format matching the provided schema.
```

### Self-Evaluation

```
You are an evaluation assistant. Given an original document and an AI-generated
summary, evaluate the summary on these dimensions:

1. COMPLETENESS (1-10): Does it capture all main points?
2. CONFIDENCE (1-10): How confident are you in its accuracy?
3. SPECIFICITY (1-10): Is it specific to this document or generic?
4. OVERALL (1-10): Holistic quality assessment.

For each, provide the score AND a brief rationale (1-2 sentences).
Respond in JSON format matching the provided schema.
```

### Structured Output Schemas (Zod)

```typescript
const SummaryResponseSchema = z.object({
  shortSummary: z.string(),
  detailedSummary: z.string(),
  tags: z.array(z.object({
    label: z.string(),
    category: z.enum(["topic", "document_type", "entity", "methodology", "domain"]),
    confidence: z.number().min(0).max(1),
  })),
  documentType: z.enum([
    "report", "research_paper", "invoice", "contract",
    "letter", "manual", "presentation", "spreadsheet_export", "form", "other"
  ]),
});

const EvaluationResponseSchema = z.object({
  completeness: z.object({ score: z.number().int().min(1).max(10), rationale: z.string() }),
  confidence: z.object({ score: z.number().int().min(1).max(10), rationale: z.string() }),
  specificity: z.object({ score: z.number().int().min(1).max(10), rationale: z.string() }),
  overall: z.object({ score: z.number().int().min(1).max(10), rationale: z.string() }),
});
```

### Cost Calculation

```typescript
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  "gpt-4.1-mini": { input: 0.40 / 1_000_000, output: 1.60 / 1_000_000 },
  "gpt-4o":       { input: 2.50 / 1_000_000, output: 10.00 / 1_000_000 },
};

function calculateCost(modelId: string, usage: TokenUsage): number {
  const pricing = MODEL_PRICING[modelId];
  return (usage.inputTokens * pricing.input) + (usage.outputTokens * pricing.output);
}
```

---

## 8. Error Handling

| Scenario | Detection | Behavior |
|----------|-----------|----------|
| Password-protected PDF | pdf-parse error | Alert: "PDF is password-protected." |
| Corrupted PDF | pdf-parse error | Alert: "File couldn't be read." |
| Scanned PDF (no text) | Extracted text < 50 chars | Flag as "limited text." Strategy B comparison becomes informative. |
| OpenAI rate limit | 429 response | Retry 3x with exponential backoff. Mark failed if still failing. |
| OpenAI API error | 5xx response | Mark strategy as failed. Other strategy may still succeed. |
| File too large | Client + server check | Reject: "File exceeds 20MB limit." |
| Invalid file type | Client MIME + server | Reject: "Only PDF files are supported." |
| Processing timeout | 60s per strategy | Mark strategy as failed: "Processing timed out." |

Each strategy fails independently.

---

## 9. Autonomous Development Workflow

Development is split into 3 vertical mini-projects. Each delivers a working, testable increment.

| # | Project | Deliverable |
|---|---------|-------------|
| 01 | Foundation + Single Strategy | Upload PDF → text extraction → summary/tags/eval → display → feedback. Working demo. |
| 02 | Multimodal + Comparison | Add GPT-4o vision, side-by-side comparison, cost tracking, aggregate stats. |
| 03 | Polish + Deploy | Error handling, loading states, project context, mobile, deploy to Vercel. |

See `PROJECT-X-TASKS.md` files for execution details.
