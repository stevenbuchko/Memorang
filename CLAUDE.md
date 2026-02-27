# Attachment Intelligence POC

## Project Overview

A proof-of-concept for AI-powered document summarization and evaluation, built for Memorang. Upload a PDF → AI generates summaries, tags, and self-evaluation scores using two processing strategies → compare results side-by-side → collect user feedback.

See PRD.md for the full product requirements document.

## Tech Stack

- **Framework:** Next.js 14+ (App Router), TypeScript
- **UI:** shadcn/ui + Tailwind CSS
- **Backend:** Supabase (PostgreSQL + Storage)
- **AI:** OpenAI API (GPT-4.1-mini for text, GPT-4o for multimodal)
- **PDF Parsing:** pdf-parse (text extraction), pdfjs-dist + canvas (PDF-to-image)
- **Validation:** Zod (structured AI output parsing)
- **Deployment:** Vercel

## Project Structure

```
src/
  app/
    page.tsx                    # Home — upload zone + document list + aggregate stats
    documents/[id]/
      page.tsx                  # Document detail — comparison view + feedback
      loading.tsx               # Skeleton loading state
    layout.tsx                  # Root layout
  lib/
    supabase.ts                 # Supabase clients (anon + service role)
    openai.ts                   # OpenAI client
    costs.ts                    # Model pricing + cost calculation
  types/
    database.ts                 # DB entity types (Document, Summary, Evaluation, Feedback)
    ai.ts                       # ModelProvider interface, Zod schemas, AI types
  features/
    upload/
      upload-zone.tsx           # Drag-and-drop upload component
      actions.ts                # Upload server action
    processing/
      extract-text.ts           # PDF text extraction utility
      pdf-to-images.ts          # PDF-to-PNG conversion utility
      orchestrator.ts           # Runs both strategies, persists results
      actions.ts                # Processing server action
      providers/
        openai-text.ts          # GPT-4.1-mini ModelProvider implementation
        openai-multimodal.ts    # GPT-4o ModelProvider implementation
    documents/
      document-card.tsx         # Document list card
      strategy-card.tsx         # Strategy result display (summary, tags, eval, metrics)
      comparison-banner.tsx     # Side-by-side cost/quality comparison
      aggregate-stats.tsx       # Aggregate metrics across all documents
      extraction-alert.tsx      # Error alerts for problem PDFs
      processing-status.tsx     # Real-time processing indicator
    feedback/
      feedback-form.tsx         # Thumbs up/down + comment
      actions.ts                # Feedback server action
  components/ui/                # shadcn/ui components (auto-generated)
```

## Coding Conventions

- Use TypeScript strict mode
- Use Server Components by default; add `"use client"` only when needed (interactivity, hooks, browser APIs)
- Use **Server Actions** for API logic — not API route handlers — unless there's a specific reason
- Use shadcn/ui components from `@/components/ui/` — don't build custom primitives
- Use Tailwind classes for styling — no CSS modules or styled-components
- Use `@/` path alias for all imports
- Keep components under 150 lines — extract sub-components if larger

## Supabase Clients

Two clients exist in `src/lib/supabase.ts`:

- **`supabase`** — uses `NEXT_PUBLIC_SUPABASE_ANON_KEY`, safe for client components
- **`supabaseAdmin`** — uses `SUPABASE_SERVICE_ROLE_KEY`, server-side only (server actions, server components)

Since there's no authentication in this POC, all server-side DB and Storage operations use `supabaseAdmin`.

## AI Provider Pattern

All AI models implement the `ModelProvider` interface from `src/types/ai.ts`. To add a new model (Claude, Gemini, etc.), create a new file in `src/features/processing/providers/` implementing the interface. No pipeline or UI changes needed.

Current providers:

- `openai-text.ts` — GPT-4.1-mini, text-based summarization
- `openai-multimodal.ts` — GPT-4o, vision-based summarization

All AI responses are validated with Zod schemas (`SummaryResponseSchema`, `EvaluationResponseSchema`). Use OpenAI's `response_format: { type: "json_object" }` to enforce JSON output.

## Processing Pipeline

The orchestrator (`src/features/processing/orchestrator.ts`) runs both strategies for every document:

1. **Strategy A (text_extraction):** pdf-parse → extracted text → GPT-4.1-mini → summary → self-evaluation
2. **Strategy B (multimodal):** pdfjs-dist → page images → GPT-4o → summary → self-evaluation

Each strategy fails independently. If one fails, the other still completes. Document is marked `completed` if at least one strategy succeeds.

## Cost Tracking

Every OpenAI call tracks token usage from the API response. Cost is calculated using rates in `src/lib/costs.ts`. Both summary generation and evaluation costs are tracked separately and stored in the database.

## Error Handling

- Password-protected PDFs → alert user, skip text extraction, still attempt multimodal
- Corrupted PDFs → alert user, mark document failed
- Scanned PDFs (< 50 chars extracted) → flag in UI, both strategies still run
- OpenAI rate limits → retry 3x with exponential backoff
- Processing timeout → 60s per strategy, mark as failed

## Important Rules

- NEVER hardcode Supabase or OpenAI credentials — always use environment variables
- NEVER read or modify `.env.local` — it contains secrets
- NEVER use API route handlers when a Server Action will do
- Always validate AI responses with Zod before persisting
- Always track token usage and cost for every LLM call
- Test that TypeScript compiles (`npx tsc --noEmit`) after making changes
- Git commit after completing each task with a descriptive message

## Current Phase

Check PROJECT-2-TASKS.md for the current task list and activity.md for recent progress.
