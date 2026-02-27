import { supabaseAdmin } from "@/lib/supabase";
import { extractTextFromPdf } from "./extract-text";
import { convertPdfToImages } from "./pdf-to-images";
import { openAITextProvider } from "./providers/openai-text";
import { openAIMultimodalProvider } from "./providers/openai-multimodal";
import type { ModelProvider, SummaryOutput } from "@/types/ai";
import { randomUUID } from "crypto";

const STRATEGY_TIMEOUT_MS = 60_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Timed out after ${ms}ms`)),
      ms
    );
    promise
      .then((val) => {
        clearTimeout(timer);
        resolve(val);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

async function runStrategy(params: {
  documentId: string;
  strategy: "text_extraction" | "multimodal";
  provider: ModelProvider;
  content: string;
  contentType: "text" | "image";
  evalContent?: string;
  projectContext?: string;
}): Promise<boolean> {
  const { documentId, strategy, provider, content, contentType, evalContent, projectContext } = params;
  const summaryId = randomUUID();

  // Create summary record (status: processing)
  await supabaseAdmin.from("summaries").insert({
    id: summaryId,
    document_id: documentId,
    strategy,
    model_id: provider.id,
    model_name: provider.name,
    status: "processing",
  });

  try {
    // Generate summary with timeout
    const summaryResult: SummaryOutput = await withTimeout(
      provider.generateSummary({
        content,
        contentType,
        projectContext,
      }),
      STRATEGY_TIMEOUT_MS
    );

    // Update summary record with results
    await supabaseAdmin
      .from("summaries")
      .update({
        summary_short: summaryResult.shortSummary,
        summary_detailed: summaryResult.detailedSummary,
        document_type: summaryResult.documentType,
        tags: summaryResult.tags,
        processing_time_ms: Math.round(summaryResult.processingTimeMs),
        input_tokens: summaryResult.tokenUsage.inputTokens,
        output_tokens: summaryResult.tokenUsage.outputTokens,
        total_tokens: summaryResult.tokenUsage.totalTokens,
        estimated_cost_usd: summaryResult.tokenUsage.estimatedCostUsd,
        status: "completed",
      })
      .eq("id", summaryId);

    // --- Self-Evaluation ---
    try {
      const evalResult = await withTimeout(
        provider.evaluateSummary({
          originalContent: evalContent ?? content,
          summary: summaryResult.shortSummary + "\n\n" + summaryResult.detailedSummary,
        }),
        STRATEGY_TIMEOUT_MS
      );

      await supabaseAdmin.from("evaluations").insert({
        id: randomUUID(),
        summary_id: summaryId,
        completeness_score: evalResult.completeness.score,
        completeness_rationale: evalResult.completeness.rationale,
        confidence_score: evalResult.confidence.score,
        confidence_rationale: evalResult.confidence.rationale,
        specificity_score: evalResult.specificity.score,
        specificity_rationale: evalResult.specificity.rationale,
        overall_score: evalResult.overall.score,
        overall_rationale: evalResult.overall.rationale,
        input_tokens: evalResult.tokenUsage.inputTokens,
        output_tokens: evalResult.tokenUsage.outputTokens,
        total_tokens: evalResult.tokenUsage.totalTokens,
        estimated_cost_usd: evalResult.tokenUsage.estimatedCostUsd,
      });
    } catch (evalError: unknown) {
      const message = evalError instanceof Error ? evalError.message : String(evalError);
      console.error(`Evaluation failed for ${strategy} summary ${summaryId}:`, message);
      // Partial failure: summary succeeded but eval failed — still counts as success
    }

    return true;
  } catch (summaryError: unknown) {
    const message = summaryError instanceof Error ? summaryError.message : String(summaryError);
    console.error(`${strategy} strategy failed for document ${params.documentId}:`, message);

    await supabaseAdmin
      .from("summaries")
      .update({
        status: "failed",
        error_message: message,
      })
      .eq("id", summaryId);

    return false;
  }
}

export async function processDocument(documentId: string): Promise<void> {
  // Fetch document record
  const { data: document, error: fetchError } = await supabaseAdmin
    .from("documents")
    .select("*")
    .eq("id", documentId)
    .single();

  if (fetchError || !document) {
    console.error(`Failed to fetch document ${documentId}:`, fetchError);
    return;
  }

  // --- Text Extraction ---
  const extraction = await extractTextFromPdf(document.file_path);

  await supabaseAdmin
    .from("documents")
    .update({
      extracted_text: extraction.text || null,
      page_count: extraction.pageCount || null,
      extraction_success: extraction.success,
      error_message: extraction.error || null,
      error_type: extraction.errorType || null,
    })
    .eq("id", documentId);

  // --- Handle corrupted PDFs early ---
  // Corrupted files can't be processed by either strategy
  if (extraction.errorType === "corrupted") {
    await supabaseAdmin
      .from("documents")
      .update({
        status: "failed",
        error_message: extraction.error || "This file is corrupted and cannot be read",
      })
      .eq("id", documentId);
    return;
  }

  // --- PDF-to-Image Conversion ---
  const imageConversion = await convertPdfToImages(document.file_path);

  // --- Determine which strategies to run ---
  const hasText = extraction.text && extraction.text.trim().length > 0;
  const hasImages = imageConversion.success && imageConversion.images.length > 0;

  // Password-protected: skip text extraction strategy, still attempt multimodal
  const skipTextStrategy = extraction.errorType === "password_protected";

  // If neither extraction method produced usable content, mark failed
  if (!hasText && !hasImages) {
    await supabaseAdmin
      .from("documents")
      .update({
        status: "failed",
        error_message: extraction.error || imageConversion.error || "No content could be extracted",
      })
      .eq("id", documentId);
    return;
  }

  // Update page count from image conversion if text extraction didn't provide it
  if (!extraction.pageCount && imageConversion.pageCount) {
    await supabaseAdmin
      .from("documents")
      .update({ page_count: imageConversion.pageCount })
      .eq("id", documentId);
  }

  // Build strategy promises
  const strategyPromises: Promise<boolean>[] = [];

  if (hasText && !skipTextStrategy) {
    strategyPromises.push(
      runStrategy({
        documentId,
        strategy: "text_extraction",
        provider: openAITextProvider,
        content: extraction.text!,
        contentType: "text",
        projectContext: document.project_context ?? undefined,
      })
    );
  }

  if (hasImages) {
    strategyPromises.push(
      runStrategy({
        documentId,
        strategy: "multimodal",
        provider: openAIMultimodalProvider,
        content: JSON.stringify(imageConversion.images),
        contentType: "image",
        evalContent: hasText ? extraction.text! : undefined,
        projectContext: document.project_context ?? undefined,
      })
    );
  }

  // Run strategies sequentially (safer for POC — avoids concurrent rate limits)
  const results: boolean[] = [];
  for (const strategyPromise of strategyPromises) {
    const result = await strategyPromise;
    results.push(result);
  }

  const anySucceeded = results.some((r) => r);

  // --- Update Document Status ---
  await supabaseAdmin
    .from("documents")
    .update({ status: anySucceeded ? "completed" : "failed" })
    .eq("id", documentId);
}
