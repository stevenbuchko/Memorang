"use server";

import { supabaseAdmin } from "@/lib/supabase";
import { extractTextFromPdf } from "./extract-text";
import { openAITextProvider } from "./providers/openai-text";
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
    })
    .eq("id", documentId);

  // If extraction has no usable text at all, mark failed
  if (!extraction.text || extraction.text.trim().length === 0) {
    await supabaseAdmin
      .from("documents")
      .update({ status: "failed", error_message: extraction.error || "No text extracted" })
      .eq("id", documentId);
    return;
  }

  // --- Text Extraction Strategy ---
  const summaryId = randomUUID();
  let strategySucceeded = false;

  // Create summary record (status: processing)
  await supabaseAdmin.from("summaries").insert({
    id: summaryId,
    document_id: documentId,
    strategy: "text_extraction",
    model_id: openAITextProvider.id,
    model_name: openAITextProvider.name,
    status: "processing",
  });

  try {
    // Generate summary with timeout
    const summaryResult = await withTimeout(
      openAITextProvider.generateSummary({
        content: extraction.text,
        contentType: "text",
        projectContext: document.project_context ?? undefined,
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

    strategySucceeded = true;

    // --- Self-Evaluation ---
    try {
      const evalResult = await withTimeout(
        openAITextProvider.evaluateSummary({
          originalContent: extraction.text,
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
      console.error(`Evaluation failed for summary ${summaryId}:`, message);
      // Partial failure: summary succeeded but eval failed — still counts as success
    }
  } catch (summaryError: unknown) {
    const message = summaryError instanceof Error ? summaryError.message : String(summaryError);
    console.error(`Summary generation failed for document ${documentId}:`, message);

    await supabaseAdmin
      .from("summaries")
      .update({
        status: "failed",
        error_message: message,
      })
      .eq("id", summaryId);
  }

  // --- Update Document Status ---
  await supabaseAdmin
    .from("documents")
    .update({ status: strategySucceeded ? "completed" : "failed" })
    .eq("id", documentId);
}
