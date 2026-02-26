# Project 1: Foundation + Single Strategy
## TASKS.md — Ralph Loop Execution Plan

**Objective:** Deliver a working end-to-end demo: upload a PDF → extract text → GPT-4.1-mini generates summary, tags, and self-evaluation → display results → collect user feedback. One strategy only (text extraction). A user can test this and get value.

**Prerequisites:** None (first project)

**Estimated Time:** 4-6 hours of Ralph loop execution + 15 min manual setup

---

## What Already Exists

Nothing — greenfield project.

---

## Task Legend

- `[AUTO]` — Claude Code can execute this autonomously
- `[MANUAL]` — Requires human action (Steven does this). Detailed instructions provided.
- `[VERIFY]` — Requires human visual/functional verification

---

## Phase A: Manual Setup [MANUAL]

### Task A.1: Create Supabase Project + Run Migration [MANUAL]

**What:** Set up the Supabase project, create the storage bucket, and run the database migration.

**Steps:**
1. Go to https://supabase.com/dashboard and create a new project (or use existing)
2. Go to **SQL Editor** and run the full migration SQL from `prd.md` Section 5 (all 4 tables, enums, indexes, triggers)
3. Go to **Storage** → Create a new bucket called `documents` with public access disabled
4. Go to **Storage** → `documents` bucket → **Policies** → Add policy:
   - Allow `INSERT` for anonymous users (no auth in POC)
   - Allow `SELECT` for anonymous users
5. Go to **Project Settings** → **API** → Copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` secret key → `SUPABASE_SERVICE_ROLE_KEY`

**Completion:** All 4 tables exist in database. `documents` storage bucket exists with policies.

---

### Task A.2: Create .env.local [MANUAL]

**What:** Create environment variables file with Supabase and OpenAI credentials.

**Steps:**
1. In the project root, create `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   OPENAI_API_KEY=your_openai_api_key
   ```

**Completion:** `.env.local` exists with all 4 values populated.

---

## Phase B: Project Initialization [AUTO]

### Task B.1: Initialize Next.js Project [AUTO] ✅

**What:** Create the Next.js 14+ app with TypeScript, Tailwind, and shadcn/ui.

**Steps:**
1. Run `npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"` (use current directory)
2. Initialize shadcn/ui: `npx shadcn@latest init` — choose Default style, Slate base color, CSS variables enabled
3. Install core dependencies:
   ```bash
   npm install @supabase/supabase-js openai pdf-parse zod
   npm install -D @types/pdf-parse
   ```
4. Verify `npm run dev` starts without errors
5. Verify `npx tsc --noEmit` passes

**Completion Criteria:**
- Next.js dev server runs at localhost:3000
- shadcn/ui configured (components.json exists)
- All dependencies installed
- TypeScript compiles clean

---

### Task B.2: Set Up Project Structure and Shared Types [AUTO] ✅

**What:** Create the folder structure and all shared TypeScript types used across the app.

**Steps:**
1. Create folder structure:
   ```
   src/
     app/
       documents/[id]/
         page.tsx          (placeholder)
       page.tsx            (home — will be document list + upload)
       layout.tsx          (already exists)
     lib/
       supabase.ts         (Supabase client)
       openai.ts           (OpenAI client)
       costs.ts            (cost calculation)
     types/
       database.ts         (all DB entity types)
       ai.ts               (ModelProvider interface + AI types)
     features/
       upload/             (upload components)
       processing/         (pipeline logic)
       documents/          (list + detail components)
       feedback/           (feedback components)
   ```

2. Create `src/lib/supabase.ts`:
   ```typescript
   import { createClient } from '@supabase/supabase-js';

   // Client-side Supabase client (uses anon key)
   export const supabase = createClient(
     process.env.NEXT_PUBLIC_SUPABASE_URL!,
     process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
   );

   // Server-side Supabase client (uses service role key — never exposed to browser)
   export const supabaseAdmin = createClient(
     process.env.NEXT_PUBLIC_SUPABASE_URL!,
     process.env.SUPABASE_SERVICE_ROLE_KEY!
   );
   ```

3. Create `src/lib/openai.ts`:
   ```typescript
   import OpenAI from 'openai';

   export const openai = new OpenAI({
     apiKey: process.env.OPENAI_API_KEY!,
   });
   ```

4. Create `src/types/database.ts` with types matching the SQL schema:
   - `Document`, `Summary`, `Evaluation`, `Feedback`
   - `DocumentStatus`, `ProcessingStrategy`, `SummaryStatus`, `FeedbackRating` enums
   - `DocumentWithSummaries` joined type (document + summaries + evaluations + feedback)

5. Create `src/types/ai.ts` with the ModelProvider interface and related types from PRD Section 6:
   - `ModelProvider`, `SummaryInput`, `SummaryOutput`, `EvaluationOutput`, `TokenUsage`
   - Zod schemas: `SummaryResponseSchema`, `EvaluationResponseSchema`

6. Create `src/lib/costs.ts` with `MODEL_PRICING` map and `calculateCost()` function from PRD Section 7

**Completion Criteria:**
- All folders exist
- All type files export their types correctly
- Supabase clients initialize without errors
- OpenAI client initializes without errors
- `npx tsc --noEmit` passes

---

### Task B.3: Install shadcn Components [AUTO] ✅

**What:** Pre-install all shadcn/ui components needed across the POC.

**Steps:**
1. Install components:
   ```bash
   npx shadcn@latest add card badge button textarea progress alert skeleton tabs dialog separator tooltip
   ```
2. Verify all components are in `src/components/ui/`

**Completion Criteria:** All listed components installed and importable.

---

## Phase C: Upload Flow [AUTO]

### Task C.1: Build Upload Server Action [AUTO] ✅

**What:** Create a server action that accepts a PDF file, uploads it to Supabase Storage, creates a document record, and returns the document ID.

**File:** `src/features/upload/actions.ts`

**Steps:**
1. Create server action `uploadDocument(formData: FormData)`:
   - Validate file: must be PDF, must be ≤ 20MB
   - Generate a UUID for the document
   - Upload file to Supabase Storage at path `documents/{id}/{filename}`
   - Create document record in `documents` table with status `uploading`
   - Update status to `processing`
   - Return `{ id, filename, status }`
2. Handle errors: invalid file type, oversized file, storage failure, DB failure
3. Use `supabaseAdmin` (service role) since there's no auth

**Completion Criteria:**
- Server action accepts FormData with a PDF file
- File appears in Supabase Storage
- Document record appears in `documents` table
- Invalid files are rejected with descriptive error messages
- TypeScript compiles clean

---

### Task C.2: Build Upload UI Component [AUTO] ✅

**What:** Build a drag-and-drop upload zone with file validation and progress feedback.

**File:** `src/features/upload/upload-zone.tsx`

**Steps:**
1. Create `UploadZone` client component:
   - Drag-and-drop area with dashed border, file icon, "Drop a PDF here or click to browse" text
   - Hidden file input triggered by clicking the zone
   - Accept only `.pdf` files
   - Client-side validation: file type + size (20MB max)
   - On valid file: call the `uploadDocument` server action
   - Show upload state: idle → uploading (with spinner) → success (redirect to document detail) or error (alert message)
2. Use shadcn `Card`, `Button`, `Alert` components
3. After successful upload, use `router.push(/documents/${id})` to navigate to the document detail page

**Completion Criteria:**
- Drag-and-drop works
- Click-to-browse works
- Invalid files show error alert
- Successful upload navigates to `/documents/[id]`
- Looks clean with shadcn styling

---

### Task C.3: Build Home Page with Document List [AUTO] ✅

**What:** Build the home page showing the upload zone and a list of previously processed documents.

**File:** `src/app/page.tsx`

**Steps:**
1. Server component that fetches all documents from Supabase ordered by `created_at DESC`
2. Join with summaries to get quick evaluation scores per strategy
3. Layout:
   - Page header: "Attachment Intelligence" title
   - `UploadZone` component
   - Below: document list as `Card` components, each showing:
     - Filename
     - Status badge (uploading/processing/completed/failed) using shadcn `Badge`
     - If completed: overall eval score per strategy (e.g., "Text: 7.5 | Multimodal: —")
     - Timestamp (relative, e.g., "2 hours ago")
   - Click on a card → navigate to `/documents/[id]`
   - Empty state if no documents yet
4. Create a reusable `DocumentCard` component in `src/features/documents/document-card.tsx`

**Completion Criteria:**
- Upload zone renders at top of page
- Document list shows all documents from database
- Status badges render with appropriate colors
- Clicking a card navigates to the detail page
- Empty state displays when no documents exist
- TypeScript compiles clean

---

## Phase D: Processing Pipeline — Text Extraction Strategy [AUTO]

### Task D.1: Build PDF Text Extraction Utility [AUTO] ✅

**What:** Create a utility that extracts raw text from a PDF file stored in Supabase Storage.

**File:** `src/features/processing/extract-text.ts`

**Steps:**
1. Create `extractTextFromPdf(filePath: string)` function:
   - Download the PDF from Supabase Storage using `supabaseAdmin`
   - Pass the buffer to `pdf-parse`
   - Return `{ text: string, pageCount: number, success: boolean }`
   - If extraction returns < 50 characters, set `success: false` (likely scanned PDF)
2. Handle errors: corrupted file, password-protected, parse failures
3. This runs server-side only

**Completion Criteria:**
- Given a valid Supabase Storage path, returns extracted text and page count
- Handles error cases gracefully without throwing uncaught exceptions
- Returns `success: false` for scanned/empty PDFs

---

### Task D.2: Build OpenAI Text Provider [AUTO] ✅

**What:** Implement the `ModelProvider` interface for GPT-4.1-mini text-based summarization.

**File:** `src/features/processing/providers/openai-text.ts`

**Steps:**
1. Create class `OpenAITextProvider` implementing `ModelProvider`:
   - `id`: `"gpt-4.1-mini"`
   - `name`: `"GPT-4.1 Mini"`
   - `supportsVision`: `false`
   - Set cost rates per PRD pricing
2. Implement `generateSummary(input: SummaryInput)`:
   - Build the system prompt from PRD Section 7 (Summary Generation)
   - If `projectContext` is provided, include it in the prompt
   - Call OpenAI chat completions with `response_format: { type: "json_object" }`
   - Parse response with `SummaryResponseSchema` (Zod)
   - Track timing with `performance.now()` 
   - Extract token usage from OpenAI response (`usage.prompt_tokens`, `usage.completion_tokens`)
   - Calculate cost using `calculateCost()`
   - Return `SummaryOutput`
3. Implement `evaluateSummary(input: EvaluationInput)`:
   - Build evaluation prompt from PRD Section 7 (Self-Evaluation)
   - Send both the original document text and the generated summary
   - Parse response with `EvaluationResponseSchema` (Zod)
   - Track token usage and cost separately
   - Return `EvaluationOutput`
4. Handle OpenAI errors: rate limits (retry 3x with backoff), API errors, malformed responses

**Completion Criteria:**
- Provider returns valid `SummaryOutput` with all fields populated
- Provider returns valid `EvaluationOutput` with scores 1-10 and rationales
- Token usage and cost are accurate
- Zod validation catches malformed AI responses
- Retries on rate limits

---

### Task D.3: Build Processing Orchestrator + Server Action [AUTO] ✅

**What:** Create the orchestrator that runs the text extraction strategy end-to-end, persists results to the database, and exposes it as a server action.

**Files:**
- `src/features/processing/orchestrator.ts`
- `src/features/processing/actions.ts`

**Steps:**
1. Create `processDocument(documentId: string)` function:
   - Fetch document record from DB
   - Run text extraction using `extractTextFromPdf()`
   - Update document with `extracted_text`, `page_count`, `extraction_success`
   - If extraction succeeded (or partial text available):
     - Create summary record in `summaries` table (status: processing, strategy: text_extraction)
     - Call `OpenAITextProvider.generateSummary()` with extracted text
     - Update summary record with results (summary_short, summary_detailed, tags, document_type, tokens, cost, status: completed)
     - Create evaluation record in `evaluations` table
     - Call `OpenAITextProvider.evaluateSummary()` with original text + generated summary
     - Update evaluation record with scores and rationales
   - Update document status to `completed` (or `failed` if everything failed)
   - Handle partial failures: if summary succeeds but eval fails, still save what we have
2. Create server action `triggerProcessing(documentId: string)` that calls the orchestrator
3. Call `triggerProcessing` automatically after successful upload in the upload action (chain them)

**Completion Criteria:**
- Uploading a PDF triggers the full pipeline automatically
- `summaries` table gets a record with strategy `text_extraction`
- `evaluations` table gets scores and rationales
- Document status updates to `completed`
- Token usage and cost are persisted
- Partial failures don't crash the pipeline

---

## Phase E: Document Detail Page — Display + Feedback [AUTO]

### Task E.1: Build Document Detail Page [AUTO] ✅

**What:** Build the document detail page showing the full summary results for the text extraction strategy.

**File:** `src/app/documents/[id]/page.tsx`

**Steps:**
1. Server component that fetches document with joined summaries, evaluations, and feedback
2. Layout:
   - **Header section:** filename, page count, file size (formatted), extraction success indicator, upload timestamp
   - **Summary card** (using shadcn `Card`):
     - Strategy label: "Text Extraction" + model name "GPT-4.1 Mini"
     - Short summary (always visible)
     - "Show detailed summary" expandable section (use shadcn `Dialog` or collapsible)
     - Tags displayed as shadcn `Badge` components with confidence shown on hover via `Tooltip`
     - Document type badge
   - **Evaluation section:**
     - Four scores displayed as labeled shadcn `Progress` bars (value out of 10)
     - Each score has its rationale text below it
     - Overall score prominently displayed
   - **Metrics section:**
     - Processing time (formatted, e.g., "1.2s")
     - Token count (formatted with commas)
     - Estimated cost (e.g., "$0.0123")
   - **Feedback section** (see Task E.2)
3. Handle states: document still processing (show skeleton), document failed (show error alert)
4. Back button to return to home page

**Completion Criteria:**
- Page loads and displays all summary data
- Tags render as colored badges
- Evaluation scores render as progress bars with rationales
- Processing/failed states handled gracefully
- Navigation back to home works

---

### Task E.2: Build Feedback Component + Server Action [AUTO] ✅

**What:** Build the feedback UI (thumbs up/down + comment) and the server action to persist it.

**Files:**
- `src/features/feedback/feedback-form.tsx`
- `src/features/feedback/actions.ts`

**Steps:**
1. Create server action `submitFeedback({ summaryId, rating, comment })`:
   - Validate: summaryId exists, rating is `thumbs_up` or `thumbs_down`, comment ≤ 500 chars
   - Upsert into `feedback` table (update if feedback already exists for this summary)
   - Return success/error
2. Create `FeedbackForm` client component:
   - Two icon buttons: 👍 and 👎 (use Lucide icons `ThumbsUp`, `ThumbsDown`)
   - Clicking one highlights it and shows the optional comment textarea
   - Shadcn `Textarea` for comment (max 500 chars, char count displayed)
   - Submit button
   - If feedback already exists for this summary, show it pre-filled
   - Success state: "Feedback submitted" toast or inline confirmation
3. Integrate into the document detail page below the metrics section

**Completion Criteria:**
- Thumbs up/down toggles correctly
- Comment field appears after selecting a rating
- Feedback persists to database
- Existing feedback loads pre-filled on page load
- Character count displays correctly
- Visual confirmation on submit

---

## Phase F: Verification [VERIFY]

### Task F.1: End-to-End Flow Test [VERIFY]

**What:** Steven tests the full flow: upload a PDF → see it in the list → view summary, tags, eval scores, metrics → submit feedback.

**Steps:**
1. Start dev server: `npm run dev`
2. Navigate to localhost:3000
3. Upload a sample PDF (try a text-heavy document like a report or research paper)
4. Verify document appears in list with "processing" status
5. Wait for processing to complete (page should update to "completed")
6. Click into the document detail page
7. Verify: short summary makes sense, tags are relevant, eval scores present, cost/time/tokens displayed
8. Submit thumbs up with a comment
9. Refresh page — feedback should still be there
10. Try uploading an invalid file (e.g., .txt) — should be rejected
11. Try uploading a very large PDF if available

**Completion:** Full flow works. Summary quality is reasonable. UI is functional.
