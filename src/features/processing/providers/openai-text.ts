"use server";

import { openai } from "@/lib/openai";
import { calculateCost } from "@/lib/costs";
import {
  SummaryResponseSchema,
  EvaluationResponseSchema,
  type ModelProvider,
  type SummaryInput,
  type SummaryOutput,
  type EvaluationInput,
  type EvaluationOutput,
  type TokenUsage,
} from "@/types/ai";

const MODEL_ID = "gpt-4.1-mini";
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

async function callWithRetry<T>(
  fn: () => Promise<T>,
  retries = MAX_RETRIES
): Promise<T> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await fn();
    } catch (error: unknown) {
      const isRateLimit =
        error instanceof Error &&
        "status" in error &&
        (error as { status: number }).status === 429;

      if (!isRateLimit || attempt === retries - 1) {
        throw error;
      }

      const delay = BASE_DELAY_MS * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw new Error("Exhausted retries");
}

function buildTokenUsage(
  modelId: string,
  usage: { prompt_tokens: number; completion_tokens: number }
): TokenUsage {
  const inputTokens = usage.prompt_tokens;
  const outputTokens = usage.completion_tokens;
  return {
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens,
    estimatedCostUsd: calculateCost(modelId, { inputTokens, outputTokens }),
  };
}

export const openAITextProvider: ModelProvider = {
  id: MODEL_ID,
  name: "GPT-4.1 Mini",
  supportsVision: false,
  costPerInputToken: 0.4 / 1_000_000,
  costPerOutputToken: 1.6 / 1_000_000,

  async generateSummary(input: SummaryInput): Promise<SummaryOutput> {
    const startTime = performance.now();

    let systemPrompt = `You are a document analysis assistant. Given the contents of a document, generate:

1. A SHORT SUMMARY (2-3 sentences) suitable for inline display. Be specific to THIS document — avoid generic descriptions.
2. A DETAILED SUMMARY (2-4 paragraphs) covering main topics, key findings, and notable details.
3. TAGS — array of relevant tags, each with:
   - label: the tag text
   - category: one of "topic", "document_type", "entity", "methodology", "domain"
   - confidence: 0.0-1.0
4. DOCUMENT TYPE — classify as one of: report, research_paper, invoice, contract, letter, manual, presentation, spreadsheet_export, form, other

Respond in JSON format matching the provided schema.`;

    if (input.projectContext) {
      systemPrompt += `\n\nThe document belongs to a project with this context: ${input.projectContext}\nConsider relevance to this project in your analysis.`;
    }

    const response = await callWithRetry(() =>
      openai.chat.completions.create({
        model: MODEL_ID,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: input.content },
        ],
      })
    );

    const processingTimeMs = performance.now() - startTime;

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("OpenAI returned empty response");
    }

    const parsed = SummaryResponseSchema.parse(JSON.parse(content));

    const tokenUsage = buildTokenUsage(MODEL_ID, {
      prompt_tokens: response.usage?.prompt_tokens ?? 0,
      completion_tokens: response.usage?.completion_tokens ?? 0,
    });

    return {
      shortSummary: parsed.shortSummary,
      detailedSummary: parsed.detailedSummary,
      documentType: parsed.documentType,
      tags: parsed.tags,
      tokenUsage,
      processingTimeMs,
    };
  },

  async evaluateSummary(input: EvaluationInput): Promise<EvaluationOutput> {
    const systemPrompt = `You are an evaluation assistant. Given an original document and an AI-generated summary, evaluate the summary on these dimensions:

1. COMPLETENESS (1-10): Does it capture all main points?
2. CONFIDENCE (1-10): How confident are you in its accuracy?
3. SPECIFICITY (1-10): Is it specific to this document or generic?
4. OVERALL (1-10): Holistic quality assessment.

For each, provide the score AND a brief rationale (1-2 sentences).
Respond in JSON format matching the provided schema.`;

    const userMessage = `ORIGINAL DOCUMENT:\n${input.originalContent}\n\nAI-GENERATED SUMMARY:\n${input.summary}`;

    const response = await callWithRetry(() =>
      openai.chat.completions.create({
        model: MODEL_ID,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
      })
    );

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("OpenAI returned empty response");
    }

    const parsed = EvaluationResponseSchema.parse(JSON.parse(content));

    const tokenUsage = buildTokenUsage(MODEL_ID, {
      prompt_tokens: response.usage?.prompt_tokens ?? 0,
      completion_tokens: response.usage?.completion_tokens ?? 0,
    });

    return {
      completeness: parsed.completeness,
      confidence: parsed.confidence,
      specificity: parsed.specificity,
      overall: parsed.overall,
      tokenUsage,
    };
  },
};
