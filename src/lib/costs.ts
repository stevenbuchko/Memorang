import type { TokenUsage } from "@/types/ai";

export const MODEL_PRICING: Record<string, { input: number; output: number }> =
  {
    "gpt-4.1-mini": { input: 0.4 / 1_000_000, output: 1.6 / 1_000_000 },
    "gpt-4o": { input: 2.5 / 1_000_000, output: 10.0 / 1_000_000 },
  };

export function calculateCost(
  modelId: string,
  usage: Pick<TokenUsage, "inputTokens" | "outputTokens">
): number {
  const pricing = MODEL_PRICING[modelId];
  if (!pricing) {
    throw new Error(`Unknown model: ${modelId}`);
  }
  return usage.inputTokens * pricing.input + usage.outputTokens * pricing.output;
}
