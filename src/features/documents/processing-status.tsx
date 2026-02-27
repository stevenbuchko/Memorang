"use client";

import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import type { Summary, Evaluation, Feedback } from "@/types/database";

type SummaryWithEval = Summary & {
  evaluation: Evaluation | null;
  feedback: Feedback | null;
};

interface ProcessingStatusProps {
  summaries: SummaryWithEval[];
  documentStatus: string;
}

function getStrategyLabel(strategy: string): string {
  return strategy === "text_extraction" ? "GPT-4.1 Mini (Text)" : "GPT-4o (Multimodal)";
}

function StrategyStatus({ summary }: { summary: SummaryWithEval }) {
  const label = getStrategyLabel(summary.strategy);

  if (summary.status === "processing") {
    return (
      <div className="flex items-center gap-2 text-sm">
        <Loader2 className="h-4 w-4 animate-spin text-yellow-600" />
        <span className="text-yellow-600 font-medium">Processing with {label}...</span>
      </div>
    );
  }

  if (summary.status === "completed") {
    return (
      <div className="flex items-center gap-2 text-sm">
        <CheckCircle2 className="h-4 w-4 text-green-600" />
        <span className="text-green-600 font-medium">{label} — Complete</span>
      </div>
    );
  }

  if (summary.status === "failed") {
    return (
      <div className="flex items-center gap-2 text-sm">
        <XCircle className="h-4 w-4 text-red-600" />
        <span className="text-red-600 font-medium">{label} — Failed</span>
      </div>
    );
  }

  return null;
}

export function ProcessingStatus({ summaries, documentStatus }: ProcessingStatusProps) {
  const isProcessing = documentStatus === "processing" || documentStatus === "uploading";

  if (!isProcessing && summaries.length === 0) return null;
  if (!isProcessing) return null;

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <h3 className="font-semibold text-sm">Processing Document</h3>
      </div>
      {summaries.length > 0 ? (
        <div className="space-y-2 ml-7">
          {summaries.map((s) => (
            <StrategyStatus key={s.id} summary={s} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground ml-7">
          Starting AI analysis...
        </p>
      )}
    </div>
  );
}
