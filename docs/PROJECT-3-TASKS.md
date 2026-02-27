# Project 3: Polish + Deploy
## TASKS.md — Ralph Loop Execution Plan

**Objective:** Handle edge cases, add loading states, add optional project context input, polish the UI for mobile, and deploy to Vercel. After this project, the POC is demo-ready.

**Prerequisites:** Projects 1-2 complete (full dual-strategy pipeline with comparison UI)

**Estimated Time:** 2-3 hours of Ralph loop execution + 10 min manual Vercel setup

---

## What Already Exists

| What | Status |
|---|---|
| Full Next.js app with dual processing pipeline | ✅ |
| Text extraction (GPT-4.1-mini) + multimodal (GPT-4o) strategies | ✅ |
| Side-by-side comparison view with cost/quality metrics | ✅ |
| Feedback (thumbs up/down + comment) per strategy | ✅ |
| Aggregate stats on home page | ✅ |
| Document list with status badges | ✅ |

---

## Task Legend

- `[AUTO]` — Claude Code can execute this autonomously
- `[MANUAL]` — Requires human action (Steven does this)
- `[VERIFY]` — Requires human visual/functional verification

---

## Phase A: Error Handling [AUTO]

### Task A.1: Robust PDF Error Handling [AUTO] ✅

**What:** Improve error handling for problem PDFs — password-protected, corrupted, and scanned documents.

**Files:**
- `src/features/processing/extract-text.ts` (update)
- `src/features/processing/orchestrator.ts` (update)
- `src/features/documents/extraction-alert.tsx` (new)

**Steps:**
1. Update `extractTextFromPdf()` to detect and classify errors:
   - Password-protected: pdf-parse throws specific error → return `{ error: "password_protected" }`
   - Corrupted/invalid: parse failure → return `{ error: "corrupted" }`
   - Scanned/no text: extraction returns < 50 chars → return `{ error: "no_text", text: extractedText }`
   - Success: return full text
2. Update orchestrator to handle each error type:
   - `password_protected`: set document `error_message`, skip text extraction strategy, still attempt multimodal
   - `corrupted`: set document `error_message`, mark document `failed` (neither strategy can work)
   - `no_text`: proceed with both strategies — text extraction will have limited quality (this becomes a data point)
3. Create `ExtractionAlert` component that shows appropriate user-facing messages:
   - Password-protected: warning alert with "Please upload an unlocked version"
   - Corrupted: error alert with "This file couldn't be read"
   - No text (scanned): info alert with "Limited text was extractable. The multimodal strategy may produce better results for this document."
4. Integrate `ExtractionAlert` into the document detail page header

**Completion Criteria:**
- Password-protected PDFs show clear user-facing message
- Corrupted PDFs show error and don't crash the app
- Scanned PDFs show info message and multimodal still processes
- All error types stored in document `error_message` field

---

### Task A.2: Loading and Processing States [AUTO] ✅

**What:** Add proper loading skeletons and processing status indicators throughout the app.

**Files:**
- `src/app/documents/[id]/loading.tsx` (new — Next.js loading file)
- `src/features/documents/processing-status.tsx` (new)
- `src/features/documents/strategy-card.tsx` (update)

**Steps:**
1. Create `loading.tsx` for the document detail route:
   - Skeleton layout matching the detail page structure
   - Two skeleton cards side-by-side (matching strategy card layout)
2. Create `ProcessingStatus` component:
   - Shows which strategies are currently running vs completed vs failed
   - Text like "Processing with GPT-4.1 Mini..." with a spinner
   - Updates as strategies complete (poll every 3 seconds or use real-time — polling is fine for POC)
3. Update `StrategyCard` to handle three states:
   - **Processing:** skeleton content with "Generating summary..." message
   - **Completed:** full results display (existing)
   - **Failed:** error alert with the error message
4. Add polling to the document detail page:
   - If document status is `processing`, poll `GET /api/documents/[id]` every 3 seconds
   - Stop polling when status changes to `completed` or `failed`
   - Use `useEffect` + `setInterval` in a client component wrapper

**Completion Criteria:**
- Document detail page shows skeletons while loading
- Processing strategies show individual progress
- Polling updates the page when processing completes
- Failed strategies show error without breaking the layout
- No infinite polling (stops when processing finishes)

---

## Phase B: UX Enhancements [AUTO]

### Task B.1: Add Project Context Input [AUTO] ✅

**What:** Add an optional project context field so users can test relevance scoring.

**Files:**
- `src/features/upload/upload-zone.tsx` (update)
- `src/features/upload/actions.ts` (update)

**Steps:**
1. Add a collapsible "Project Context" section below the upload zone:
   - Toggle: "Add project context (optional)" — collapsed by default
   - When expanded: shadcn `Textarea` with placeholder "Describe the project this document belongs to..."
   - Plus a few preset buttons for quick testing: "Medical Education", "Legal Compliance", "Software Engineering", "Financial Reporting"
   - Clicking a preset fills the textarea with a relevant context string
2. Update the upload server action to accept and store `projectContext` in the document record
3. The processing orchestrator already passes `projectContext` to the AI if present (from PRD prompt spec)

**Completion Criteria:**
- Context input is collapsible and doesn't clutter the default upload experience
- Preset buttons fill realistic context text
- Context is stored on the document and passed to the AI pipeline
- Summaries generated with context should reference relevance to the project

---

### Task B.2: Mobile Responsiveness Pass [AUTO] ✅

**What:** Ensure the full app works well on mobile viewports.

**Steps:**
1. Review and fix all pages at 375px width (iPhone SE) and 390px width (iPhone 14):
   - **Home page:** upload zone should be full-width, document cards stack vertically, aggregate stats wrap to 2x2 grid
   - **Document detail:** strategy cards stack vertically with tabs to switch (should already work from Project 2), comparison banner stacks metrics vertically
   - **Feedback form:** full-width, no horizontal overflow
2. Fix any text overflow, horizontal scrolling, or touch target issues
3. Ensure drag-and-drop still works on mobile (or gracefully falls back to tap-to-browse)
4. Test with browser dev tools responsive mode

**Completion Criteria:**
- No horizontal scroll on any page at 375px
- All interactive elements have adequate touch targets (≥44px)
- Content is readable without zooming
- Tabs work for strategy switching on mobile

---

### Task B.3: UI Polish Pass [AUTO] ✅

**What:** Final UI cleanup — empty states, toast notifications, visual consistency.

**Steps:**
1. **Empty states:**
   - Home page with no documents: show a centered illustration or icon + "Upload your first PDF to get started" message
   - Document detail with no feedback yet: show subtle "Rate this summary" prompt
2. **Toast notifications** (install shadcn `toast` + `sonner`):
   - Upload success: "Document uploaded. Processing started..."
   - Upload error: "Upload failed: [reason]"
   - Feedback submitted: "Feedback saved"
   - Processing complete (if user is on the page): "Processing complete"
3. **Visual consistency:**
   - Consistent spacing and padding across all cards
   - Status badge colors: processing=yellow, completed=green, failed=red
   - Evaluation score colors: 1-3=red, 4-6=yellow, 7-10=green on progress bars
   - Cost displayed consistently as "$0.0123" format everywhere
4. **Page title and metadata:**
   - Set page titles: "Attachment Intelligence" (home), "{filename} — Attachment Intelligence" (detail)

**Completion Criteria:**
- No blank/broken states anywhere in the app
- Toast notifications fire for key actions
- Visual styling is consistent across all pages
- Page titles are set correctly

---

## Phase C: Deploy [MANUAL + AUTO]

### Task C.1: Prepare for Production Build [AUTO] ✅

**What:** Ensure the app builds successfully for production deployment.

**Steps:**
1. Run `npm run build` and fix any build errors
2. Run `npx tsc --noEmit` and fix any type errors
3. Verify environment variables are referenced correctly (no hardcoded values)
4. Add `.env.example` file documenting required env vars (without actual values)
5. Update `next.config.js` if any config is needed for production (e.g., `serverExternalPackages` for `pdf-parse` or `canvas`)
6. Test `npm run start` (production mode) locally

**Completion Criteria:**
- `npm run build` succeeds with zero errors
- `npm run start` serves the app correctly
- `.env.example` documents all required environment variables

---

### Task C.2: Deploy to Vercel [MANUAL]

**What:** Deploy the POC to Vercel.

**Steps:**
1. Push the repo to GitHub (if not already)
2. Go to https://vercel.com → Import the repository
3. Set environment variables in Vercel project settings:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `OPENAI_API_KEY`
4. Deploy
5. Note: if `canvas` or `pdf-parse` has issues in Vercel's serverless environment, may need to add them to `serverExternalPackages` in `next.config.js` or switch PDF-to-image approach

**Completion:** App is live at a `.vercel.app` URL.

---

## Phase D: Final Verification [VERIFY]

### Task D.1: Production Smoke Test [VERIFY]

**What:** Test the deployed app end-to-end on the production URL.

**Steps:**
1. Navigate to the Vercel deployment URL
2. Upload a text-heavy PDF → verify both strategies run and produce results
3. Upload a scanned PDF (if available) → verify error handling and multimodal advantage
4. Test with project context enabled → verify summaries reference the context
5. Submit feedback on multiple strategies
6. Check aggregate stats are tracking
7. Test on a mobile device (real phone, not just dev tools)
8. Share the URL with someone else to test (no auth, so anyone with the link can use it)

**Completion:** POC is live, functional, and demo-ready.
