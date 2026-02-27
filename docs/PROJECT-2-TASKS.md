# Project 2: Multimodal + Comparison
## TASKS.md — Ralph Loop Execution Plan

**Objective:** Add the GPT-4o multimodal processing strategy, build the side-by-side comparison view, and add cost tracking with aggregate stats. After this project, users can compare text extraction vs multimodal results for the same PDF.

**Prerequisites:** Project 1 complete (Foundation + Single Strategy working)

**Estimated Time:** 3-4 hours of Ralph loop execution

---

## What Already Exists

| What | Status |
|---|---|
| Next.js app with shadcn/ui, Tailwind, TypeScript | ✅ |
| Supabase with all 4 tables, storage bucket | ✅ |
| PDF upload flow (UI + server action + storage) | ✅ |
| Document list page with status cards | ✅ |
| `ModelProvider` interface in `src/types/ai.ts` | ✅ |
| `OpenAITextProvider` implementing `ModelProvider` | ✅ |
| PDF text extraction utility (`pdf-parse`) | ✅ |
| Processing orchestrator (runs Strategy A only) | ✅ |
| Document detail page showing single strategy results | ✅ |
| Feedback component (thumbs up/down + comment) | ✅ |
| Cost calculation utility in `src/lib/costs.ts` | ✅ |

---

## Task Legend

- `[AUTO]` — Claude Code can execute this autonomously
- `[VERIFY]` — Requires human visual/functional verification

---

## Phase A: Multimodal Processing [AUTO]

### Task A.1: Build PDF-to-Image Conversion Utility [AUTO] ✅

**What:** Create a utility that converts PDF pages to PNG images (base64) for sending to GPT-4o vision.

**File:** `src/features/processing/pdf-to-images.ts`

**Steps:**
1. Install dependencies:
   ```bash
   npm install pdfjs-dist canvas
   npm install -D @types/canvas
   ```
   Note: `canvas` is the Node.js canvas implementation that `pdfjs-dist` needs for server-side rendering.
2. Create `convertPdfToImages(filePath: string, maxPages?: number)` function:
   - Download PDF from Supabase Storage
   - Use `pdfjs-dist` to render each page to a canvas
   - Convert canvas to PNG base64 string
   - Cap at `maxPages` (default 5) to control costs for POC
   - Return `{ images: string[], pageCount: number }` where each image is a base64-encoded PNG
3. Handle errors: invalid PDF, rendering failures
4. If canvas/pdfjs-dist has issues in the Next.js serverless environment, fall back to `pdf-poppler` or `sharp`-based conversion. Document the approach chosen in activity.md.

**Completion Criteria:**
- Given a Supabase Storage path, returns base64 PNG images of PDF pages
- Respects maxPages limit
- Handles error cases without crashing
- Works in Next.js server action context (not browser)

---

### Task A.2: Build OpenAI Multimodal Provider [AUTO] ✅

**What:** Implement the `ModelProvider` interface for GPT-4o with vision capabilities.

**File:** `src/features/processing/providers/openai-multimodal.ts`

**Steps:**
1. Create class `OpenAIMultimodalProvider` implementing `ModelProvider`:
   - `id`: `"gpt-4o"`
   - `name`: `"GPT-4o"`
   - `supportsVision`: `true`
   - Set cost rates per PRD pricing
2. Implement `generateSummary(input: SummaryInput)`:
   - When `contentType` is `"image"`, content is a JSON-stringified array of base64 images
   - Build the message with image content blocks:
     ```typescript
     messages: [{
       role: "user",
       content: [
         { type: "text", text: systemPrompt },
         ...images.map(img => ({
           type: "image_url",
           image_url: { url: `data:image/png;base64,${img}`, detail: "low" }
         }))
       ]
     }]
     ```
   - Use `detail: "low"` to reduce token cost (can be made configurable later)
   - Parse response with `SummaryResponseSchema`
   - Track timing, tokens, cost
3. Implement `evaluateSummary(input: EvaluationInput)`:
   - Same as text provider — evaluation is text-based (send the generated summary + document description, not images again)
   - This saves tokens on the evaluation step
4. Handle errors same as text provider

**Completion Criteria:**
- Provider accepts base64 images and returns valid `SummaryOutput`
- Evaluation works without re-sending images
- Token usage and cost tracked accurately
- Error handling matches text provider

---

### Task A.3: Update Processing Orchestrator for Dual Strategy [AUTO] ✅

**What:** Modify the orchestrator to run both strategies (text extraction AND multimodal) for every document.

**File:** `src/features/processing/orchestrator.ts`

**Steps:**
1. Update `processDocument(documentId: string)`:
   - After text extraction, also run PDF-to-image conversion
   - Run both strategies (can be parallel with `Promise.allSettled` or sequential — sequential is safer for POC):
     - **Strategy A (text_extraction):** existing flow with `OpenAITextProvider`
     - **Strategy B (multimodal):** use `convertPdfToImages()` then `OpenAIMultimodalProvider`
   - Each strategy creates its own summary + evaluation records independently
   - If one strategy fails, the other should still complete
   - Update document status to `completed` when at least one strategy finishes successfully
   - Update document status to `failed` only if ALL strategies fail
2. Ensure both summary records reference the same `document_id` with different `strategy` values

**Completion Criteria:**
- Uploading a PDF produces TWO summary records (one per strategy)
- Each summary has its own evaluation record
- If text extraction fails (scanned PDF), multimodal still runs
- Document marked `completed` if at least one strategy succeeds
- Token/cost data present for both strategies

---

## Phase B: Comparison UI [AUTO]

### Task B.1: Build Side-by-Side Comparison Layout [AUTO] ✅

**What:** Refactor the document detail page to show both strategies side-by-side.

**File:** `src/app/documents/[id]/page.tsx` (refactor existing)

**Steps:**
1. Refactor the document detail page:
   - Fetch document with ALL summaries (should now have 2), their evaluations, and feedback
   - **Desktop (≥768px):** Two-column grid layout, one column per strategy
   - **Mobile (<768px):** Use shadcn `Tabs` to toggle between strategies
2. Create a reusable `StrategyCard` component (`src/features/documents/strategy-card.tsx`):
   - Header: strategy label ("Text Extraction" or "Multimodal") + model name
   - Short summary
   - Expandable detailed summary
   - Tags as badges
   - Document type badge
   - Evaluation scores as progress bars with rationales
   - Metrics: time, tokens, cost
   - Feedback form (one per strategy)
3. If a strategy failed or is still processing, show appropriate state in its column (error alert or skeleton)
4. If only one strategy exists (e.g., during migration from Project 1 data), show it full-width with a note that the second strategy is unavailable

**Completion Criteria:**
- Two strategies render side-by-side on desktop
- Tabs work on mobile to switch between strategies
- Each strategy has independent feedback
- Failed/processing states handled per-strategy
- Backward compatible with documents that only have one strategy

---

### Task B.2: Build Cost-Per-Quality Comparison Display [AUTO] ✅

**What:** Add a comparison banner at the top of the detail page showing the cost/quality tradeoff between strategies.

**File:** `src/features/documents/comparison-banner.tsx`

**Steps:**
1. Create `ComparisonBanner` component that takes both summaries + evaluations:
   - Show a compact comparison table:
     ```
     ┌──────────────────┬──────────────┬──────────────┐
     │                  │ Text Extract │  Multimodal  │
     ├──────────────────┼──────────────┼──────────────┤
     │ Overall Score    │    7.5/10    │    8.5/10    │
     │ Cost             │   $0.012     │   $0.087     │
     │ Time             │    1.2s      │    3.8s      │
     │ Cost per point   │   $0.0016    │   $0.0102    │
     └──────────────────┴──────────────┴──────────────┘
     ```
   - Highlight the "winner" in each row (lower cost, higher score, faster time)
   - Calculate and display "cost per quality point" (cost ÷ overall score)
2. Place at the top of the document detail page, below the document header
3. Only show when both strategies have completed results

**Completion Criteria:**
- Comparison table renders with accurate data
- Winners highlighted per metric
- Cost-per-point calculated correctly
- Hidden when only one strategy has results

---

### Task B.3: Add Aggregate Stats to Home Page [AUTO] ✅

**What:** Add a stats bar to the home page showing aggregate metrics across all processed documents.

**File:** `src/features/documents/aggregate-stats.tsx`

**Steps:**
1. Create `AggregateStats` server component:
   - Query all completed summaries and evaluations
   - Calculate:
     - Total documents processed
     - Average overall score per strategy
     - Total cost (sum of all summary + evaluation costs)
     - Average cost per document per strategy
   - Display as a row of stat cards at the top of the home page (above upload zone)
   - Use shadcn `Card` with large number + label
2. Only show when at least 1 document has been processed

**Completion Criteria:**
- Stats render with accurate aggregated data
- Updates as new documents are processed
- Hidden when no documents exist
- Numbers formatted nicely (currency, decimals, etc.)

---

## Phase C: Verification [VERIFY]

### Task C.1: Dual Strategy Comparison Test [VERIFY]

**What:** Steven uploads a PDF and verifies both strategies run and the comparison view works.

**Steps:**
1. Upload a text-heavy PDF (e.g., a report or article)
2. Wait for both strategies to complete
3. Verify side-by-side comparison shows both results
4. Check: do the summaries differ? Does multimodal catch anything text extraction missed?
5. Check comparison banner: are the cost/quality metrics reasonable?
6. Submit different feedback for each strategy
7. Go back to home page — verify aggregate stats updated
8. Upload a second PDF — verify stats aggregate correctly
9. If possible, upload a scanned PDF (image-only) — verify text extraction shows "limited text" while multimodal still produces a good summary
10. Check mobile view — tabs should switch between strategies

**Completion:** Both strategies produce results, comparison is visible, stats aggregate, mobile works.
