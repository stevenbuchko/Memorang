# Attachment Intelligence POC - Activity Log

## Current Status
**Last Updated:** 2026-02-26
**Current Project:** 02-multimodal-comparison
**Tasks Completed:** 11

---

## Session Log

<!-- Agent: Append entries here after each iteration. -->

## [2026-02-26 17:30] Task B.1: Initialize Next.js Project
- Status: ✅ Complete
- Created: Next.js 16.1.6 app with TypeScript, Tailwind CSS v4, shadcn/ui (manual setup due to registry access), ESLint, App Router with src/ directory
- Installed dependencies: @supabase/supabase-js, openai, pdf-parse, zod, clsx, tailwind-merge, class-variance-authority, lucide-react, @types/pdf-parse
- Created: src/lib/utils.ts (cn utility for shadcn), components.json, globals.css with shadcn CSS variables
- Updated: layout.tsx metadata to "Attachment Intelligence"
- Files: package.json, tsconfig.json, postcss.config.mjs, components.json, src/app/globals.css, src/app/layout.tsx, src/app/page.tsx, src/lib/utils.ts
- Notes: Used create-next-app in temp directory (capital letter in "Memorang" causes npm naming issue). shadcn/ui registry unreachable from sandbox — manually configured CSS variables, utils, and components.json. TypeScript compiles clean. Dev server starts successfully.
- Git: ⚠️ Unable to git init/commit — sandbox blocks writes to .git/ internal directories (hooks, objects, refs, config, HEAD are in denyWithinAllow). Steven will need to run `git init && git add . && git commit -m "feat: initialize Next.js project with TypeScript, Tailwind, shadcn/ui"` manually.

## [2026-02-26 18:00] Task B.2: Set Up Project Structure and Shared Types
- Status: ✅ Complete
- Created folder structure: src/types/, src/features/{upload,processing/providers,documents,feedback}, src/app/documents/[id]/, src/components/ui/
- Created: src/types/database.ts — Document, Summary, Evaluation, Feedback interfaces + status/strategy enums + DocumentWithSummaries joined type
- Created: src/types/ai.ts — ModelProvider interface, SummaryInput/Output, EvaluationInput/Output, TokenUsage, Zod schemas (SummaryResponseSchema, EvaluationResponseSchema)
- Created: src/lib/supabase.ts — supabase (anon) + supabaseAdmin (service role) clients
- Created: src/lib/openai.ts — OpenAI client instance
- Created: src/lib/costs.ts — MODEL_PRICING map (gpt-4.1-mini, gpt-4o) + calculateCost() function
- Created: src/app/documents/[id]/page.tsx — placeholder detail page
- Notes: Using Zod v4 (4.3.6). TypeScript compiles clean. Next.js 16+ uses async params pattern for dynamic routes.
- Git: ⚠️ Git not yet initialized (sandbox restriction). Steven needs to initialize git and commit all work so far.

## [2026-02-26 18:15] Task B.3: Install shadcn Components
- Status: ✅ Complete
- shadcn/ui registry unreachable from sandbox — manually created 3 missing component wrappers
- Created: src/components/ui/dialog.tsx — Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription, DialogTrigger, DialogClose (Radix UI Dialog primitive)
- Created: src/components/ui/separator.tsx — Separator component (Radix UI Separator primitive)
- Created: src/components/ui/tooltip.tsx — Tooltip, TooltipTrigger, TooltipContent, TooltipProvider (Radix UI Tooltip primitive)
- Previously existing (from B.1/B.2): button, card, badge, textarea, progress, alert, skeleton, tabs
- All 11 required components now in src/components/ui/: card, badge, button, textarea, progress, alert, skeleton, tabs, dialog, separator, tooltip
- Radix UI packages already installed: @radix-ui/react-dialog, @radix-ui/react-separator, @radix-ui/react-tooltip
- Notes: TypeScript compiles clean. All components follow shadcn/ui new-york style conventions.

## [2026-02-26 18:30] Task C.1: Build Upload Server Action
- Status: ✅ Complete
- Created: src/features/upload/actions.ts — server action `uploadDocument(formData: FormData)`
- Functionality:
  - Validates file exists, is PDF type, and ≤ 20MB
  - Generates UUID for document
  - Uploads file to Supabase Storage at `documents/{id}/{filename}`
  - Creates document record in `documents` table with status `uploading`
  - Updates status to `processing`
  - Returns `{ id, filename, status }` on success or `{ error }` on failure
  - Cleans up storage if DB insert fails
- Files: src/features/upload/actions.ts
- Notes: Uses supabaseAdmin (service role) since no auth. TypeScript compiles clean.

## [2026-02-26 19:00] Task C.2: Build Upload UI Component
- Status: ✅ Complete
- Created: src/features/upload/upload-zone.tsx — `UploadZone` client component
- Functionality:
  - Drag-and-drop area with dashed border, upload icon, and instructional text
  - Hidden file input triggered by clicking anywhere on the drop zone
  - Client-side validation: PDF type + 20MB max size
  - Calls `uploadDocument` server action on valid file
  - Upload states: idle → uploading (spinner) → success (redirect) or error (alert)
  - On success: redirects to `/documents/{id}` via `router.push()`
  - Error display using shadcn Alert with destructive variant
  - Visual drag-over feedback (border color + background change)
- Uses: shadcn Card, Button, Alert; Lucide icons (Upload, FileWarning, Loader2)
- Files: src/features/upload/upload-zone.tsx
- Notes: TypeScript compiles clean.

## [2026-02-26 19:30] Task C.3: Build Home Page with Document List
- Status: ✅ Complete
- Created: src/features/documents/document-card.tsx — `DocumentCard` client component
- Updated: src/app/page.tsx — Server component home page with document list
- Functionality:
  - Server component fetches all documents from Supabase ordered by created_at DESC
  - Joins with summaries and evaluations to show per-strategy overall scores
  - Page header: "Attachment Intelligence" title
  - UploadZone component rendered at top
  - Document list below with DocumentCard components showing:
    - Filename (truncated), status badge (colored by status), eval scores per strategy
    - Relative timestamp (e.g., "2h ago", "3d ago")
  - Click on card navigates to `/documents/[id]`
  - Empty state with icon when no documents exist
  - `dynamic = "force-dynamic"` to always fetch fresh data
- Files: src/app/page.tsx, src/features/documents/document-card.tsx
- Notes: TypeScript compiles clean.

## [2026-02-26 20:00] Task D.1: Build PDF Text Extraction Utility
- Status: ✅ Complete
- Created: src/features/processing/extract-text.ts — `extractTextFromPdf(filePath)` function
- Functionality:
  - Downloads PDF from Supabase Storage using `supabaseAdmin`
  - Uses pdf-parse v3 class-based API (`PDFParse` constructor + `getText()`)
  - Returns `{ text, pageCount, success, error? }` as `TextExtractionResult`
  - Handles password-protected PDFs (detects "password" in error message)
  - Handles corrupted/unparseable PDFs with graceful error return
  - Detects scanned PDFs: if extracted text < 50 chars, returns `success: false`
  - Properly destroys PDFParse instance in finally block
  - Outer try-catch for unexpected errors (storage failures, etc.)
- Files: src/features/processing/extract-text.ts
- Notes: pdf-parse v3 uses class-based API (not the legacy default export). TypeScript compiles clean.

## [2026-02-26 20:30] Task D.2: Build OpenAI Text Provider
- Status: ✅ Complete
- Created: src/features/processing/providers/openai-text.ts — `openAITextProvider` implementing `ModelProvider`
- Functionality:
  - `id`: "gpt-4.1-mini", `name`: "GPT-4.1 Mini", `supportsVision`: false
  - `generateSummary(input)`: Builds system prompt from PRD Section 7, calls OpenAI with JSON response format, parses with `SummaryResponseSchema` Zod schema, tracks timing via `performance.now()`, extracts token usage from API response, calculates cost via `calculateCost()`
  - `evaluateSummary(input)`: Builds evaluation prompt from PRD Section 7, sends original document + generated summary, parses with `EvaluationResponseSchema` Zod schema, tracks token usage and cost separately
  - `callWithRetry()` helper: retries up to 3x with exponential backoff on 429 rate limit errors
  - `buildTokenUsage()` helper: constructs `TokenUsage` from OpenAI response usage data
  - Handles: empty responses, malformed JSON (Zod validation), rate limits, API errors
- Files: src/features/processing/providers/openai-text.ts
- Notes: TypeScript compiles clean.

## [2026-02-26 21:00] Task D.3: Build Processing Orchestrator + Server Action
- Status: ✅ Complete
- Created: src/features/processing/orchestrator.ts — `processDocument(documentId)` function
- Created: src/features/processing/actions.ts — `triggerProcessing(documentId)` server action
- Updated: src/features/upload/actions.ts — chains `triggerProcessing` after successful upload (fire-and-forget)
- Functionality:
  - Orchestrator fetches document record, runs text extraction, updates document with extraction results
  - Creates summary record (status: processing), calls `openAITextProvider.generateSummary()` with extracted text
  - Updates summary record with short/detailed summary, tags, document_type, tokens, cost, timing
  - Runs self-evaluation via `openAITextProvider.evaluateSummary()`, persists scores and rationales to evaluations table
  - 60s timeout per strategy via `withTimeout()` helper
  - Partial failure handling: if summary succeeds but eval fails, summary is still saved as completed
  - If no text extracted at all, marks document as failed
  - Updates document status to `completed` or `failed` based on strategy outcome
  - Server action wraps orchestrator with try-catch, returns `{ success, error? }`
  - Upload action triggers processing in background (fire-and-forget with error logging)
- Files: src/features/processing/orchestrator.ts, src/features/processing/actions.ts, src/features/upload/actions.ts
- Notes: TypeScript compiles clean.

## [2026-02-26 21:30] Task E.1: Build Document Detail Page
- Status: ✅ Complete
- Created: src/features/documents/strategy-card.tsx — `StrategyCard` client component
- Created: src/app/documents/[id]/loading.tsx — Skeleton loading state
- Updated: src/app/documents/[id]/page.tsx — Full document detail server component
- Functionality:
  - Server component fetches document with joined summaries, evaluations, and feedback
  - Header section: filename, page count, file size (formatted), extraction success indicator, upload timestamp
  - Summary card via StrategyCard component:
    - Strategy label + model name badge + document type badge
    - Short summary (always visible)
    - Collapsible detailed summary section
    - Tags displayed as colored badges by category with confidence shown on hover via Tooltip
  - Evaluation section: four scores (completeness, confidence, specificity, overall) as Progress bars with rationales
  - Overall score prominently displayed
  - Metrics section: processing time, token count, estimated cost (summary + eval combined)
  - Handles states: processing (alert), failed (destructive alert with error message), no summaries
  - Back button to return to home page
  - Loading skeleton for streaming/suspense
  - Uses notFound() for invalid document IDs
- Files: src/app/documents/[id]/page.tsx, src/features/documents/strategy-card.tsx, src/app/documents/[id]/loading.tsx
- Notes: TypeScript compiles clean.

## [2026-02-26 22:00] Task E.2: Build Feedback Component + Server Action
- Status: ✅ Complete
- Created: src/features/feedback/actions.ts — `submitFeedback` server action
- Created: src/features/feedback/feedback-form.tsx — `FeedbackForm` client component
- Updated: src/features/documents/strategy-card.tsx — integrated FeedbackForm at bottom of card
- Functionality:
  - Server action validates rating (thumbs_up/thumbs_down), comment length (≤500 chars), and summary existence
  - Upserts feedback (updates if feedback already exists for summary via onConflict: summary_id)
  - FeedbackForm shows two toggle buttons: Helpful (thumbs up) and Not helpful (thumbs down)
  - Selecting a rating reveals optional comment textarea with 500-char limit and character count
  - Submit button with loading spinner via useTransition
  - Pre-fills existing feedback (rating + comment) when feedback already exists
  - Shows "Feedback submitted" inline confirmation on success
  - Shows "Update" instead of "Submit" when editing existing feedback
  - Error display for server-side failures
- Files: src/features/feedback/actions.ts, src/features/feedback/feedback-form.tsx, src/features/documents/strategy-card.tsx
- Notes: TypeScript compiles clean. All AUTO tasks in Phase E complete. Only Phase F (VERIFY) remains.

## [2026-02-26 22:00] All AUTO Tasks Complete (Project 1)
- Status: PROJECT_COMPLETE
- All [AUTO] tasks in docs/PROJECT-1-TASKS.md are complete (B.1–B.3, C.1–C.3, D.1–D.3, E.1–E.2)
- Remaining: Task F.1 is [VERIFY] — requires Steven to manually test the end-to-end flow

---

## Project 2: Multimodal + Comparison

## [2026-02-27 00:35] Task A.1: Build PDF-to-Image Conversion Utility
- Status: ✅ Complete
- Created: src/features/processing/pdf-to-images.ts — `convertPdfToImages(filePath, maxPages?)` function
- Installed: `mupdf` (WASM-based PDF renderer, no native dependencies)
- Approach: Used `mupdf` instead of `pdfjs-dist` + `canvas` because:
  - `canvas` native module failed to compile (missing `pixman-1` system library)
  - `pdfjs-dist` v5 requires Node >= 20.16.0 and browser APIs (`DOMMatrix`) not available in server context
  - `mupdf` is WASM-based, zero native dependencies, works in any Node.js environment
- Functionality:
  - Downloads PDF from Supabase Storage via `supabaseAdmin`
  - Opens PDF with `mupdf.Document.openDocument()`
  - Renders each page to pixmap via `page.toPixmap()` with RGB colorspace
  - Converts pixmap to PNG via `pixmap.asPNG()`, then to base64 string
  - Caps at `maxPages` (default 5) to control costs
  - Returns `{ images: string[], pageCount: number, success: boolean, error?: string }`
  - Error handling: password-protected PDFs, corrupted PDFs, per-page render failures (skips bad pages, continues)
  - Outer try-catch for unexpected errors (storage failures, etc.)
- Files: src/features/processing/pdf-to-images.ts, package.json (added mupdf dependency)
- Notes: TypeScript compiles clean. Removed failed `pdf-to-img` dependency (also needed canvas).

## [2026-02-27 01:00] Task A.2: Build OpenAI Multimodal Provider
- Status: ✅ Complete
- Created: src/features/processing/providers/openai-multimodal.ts — `openAIMultimodalProvider` implementing `ModelProvider`
- Functionality:
  - `id`: "gpt-4o", `name`: "GPT-4o", `supportsVision`: true
  - `generateSummary(input)`: Parses input.content as JSON array of base64 images, builds message with image_url content blocks using `detail: "low"` to reduce token cost, includes system prompt for document analysis, parses response with `SummaryResponseSchema`, tracks timing/tokens/cost
  - `evaluateSummary(input)`: Text-based evaluation (does NOT re-send images to save tokens), sends original content description + generated summary, parses with `EvaluationResponseSchema`, tracks token usage and cost
  - `callWithRetry()` helper: retries up to 3x with exponential backoff on 429 rate limit errors
  - `buildTokenUsage()` helper: constructs `TokenUsage` from OpenAI response usage data
  - Cost rates: $2.50/M input tokens, $10.00/M output tokens (matches MODEL_PRICING in costs.ts)
  - Handles: empty responses, malformed JSON (Zod validation), rate limits, API errors
- Pattern: Mirrors openai-text.ts structure for consistency
- Files: src/features/processing/providers/openai-multimodal.ts
- Notes: TypeScript compiles clean.

## [2026-02-27 01:30] Task A.3: Update Processing Orchestrator for Dual Strategy
- Status: ✅ Complete
- Updated: src/features/processing/orchestrator.ts — now runs both text extraction AND multimodal strategies
- Key changes:
  - Extracted `runStrategy()` helper function: handles summary generation, evaluation, DB persistence, and error handling for any strategy. Takes strategy name, provider, content, and content type as params.
  - Text extraction and PDF-to-image conversion run first to gather content
  - If neither extraction method produces usable content, document is marked failed
  - Both strategies run sequentially (safer for POC — avoids concurrent rate limits)
  - Each strategy fails independently: if text extraction fails, multimodal still runs (and vice versa)
  - Document marked `completed` if at least one strategy succeeds, `failed` only if all fail
  - Page count fallback: uses image conversion page count if text extraction didn't provide it
  - Multimodal content passed as JSON-stringified array of base64 images (matches openai-multimodal provider's expected format)
- Files: src/features/processing/orchestrator.ts
- Notes: TypeScript compiles clean. No changes needed to the server action or upload action.

## [2026-02-27 02:00] Task B.1: Build Side-by-Side Comparison Layout
- Status: ✅ Complete
- Created: src/features/documents/strategy-comparison.tsx — `StrategyComparison` client component
- Updated: src/app/documents/[id]/page.tsx — refactored to use StrategyComparison, widened max-width for dual strategy
- Updated: src/app/documents/[id]/loading.tsx — two-column skeleton layout
- Functionality:
  - Desktop (≥768px): Two-column grid layout, one column per strategy
  - Mobile (<768px): shadcn Tabs to toggle between "Text Extraction" and "Multimodal"
  - Responsive detection via `matchMedia` with event listener for live switching
  - Each strategy rendered independently: completed → StrategyCard, processing → spinner card, failed → error card
  - Single strategy backward compatibility: full-width layout with informational alert noting the other strategy is unavailable
  - Strategies identified by type (text_extraction / multimodal) regardless of array order
  - Page max-width dynamically set: max-w-6xl for dual strategy, max-w-3xl for single
  - Loading skeleton updated to show two card skeletons side-by-side on desktop
- Files: src/features/documents/strategy-comparison.tsx, src/app/documents/[id]/page.tsx, src/app/documents/[id]/loading.tsx
- Notes: TypeScript compiles clean.

## [2026-02-26 03:00] Task B.2: Build Cost-Per-Quality Comparison Display
- Status: ✅ Complete
- Created: src/features/documents/comparison-banner.tsx — `ComparisonBanner` server component
- Updated: src/app/documents/[id]/page.tsx — imports and renders ComparisonBanner above strategy cards
- Functionality:
  - Compact comparison table with four rows: Overall Score, Cost, Time, Cost per Point
  - Two columns: Text Extraction vs Multimodal
  - Winner highlighted in green per metric (higher score is better, lower cost/time is better)
  - Cost per quality point calculated as total cost (summary + eval) / overall score
  - Ties shown as normal text (no highlight)
  - Handles null values gracefully (shows dash)
  - Cost formatting adapts precision for very small vs typical amounts
  - Only rendered when BOTH strategies have completed results
  - Placed between document header and strategy comparison cards
- Files: src/features/documents/comparison-banner.tsx, src/app/documents/[id]/page.tsx
- Notes: TypeScript compiles clean.
