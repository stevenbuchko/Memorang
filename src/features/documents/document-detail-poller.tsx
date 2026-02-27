"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ProcessingStatus } from "@/features/documents/processing-status";
import { StrategyComparison } from "@/features/documents/strategy-comparison";
import { ComparisonBanner } from "@/features/documents/comparison-banner";
import type {
  Document,
  Summary,
  Evaluation,
  Feedback,
} from "@/types/database";

type SummaryWithEval = Summary & {
  evaluation: Evaluation | null;
  feedback: Feedback | null;
};

type DocumentDetail = Document & {
  summaries: SummaryWithEval[];
};

interface DocumentDetailPollerProps {
  initialDocument: DocumentDetail;
}

export function DocumentDetailPoller({ initialDocument }: DocumentDetailPollerProps) {
  const [doc, setDoc] = useState<DocumentDetail>(initialDocument);
  const router = useRouter();
  const isProcessing = doc.status === "processing" || doc.status === "uploading";

  const fetchDocument = useCallback(async () => {
    try {
      const res = await fetch(`/api/documents/${doc.id}`);
      if (!res.ok) return;
      const data: DocumentDetail = await res.json();
      setDoc(data);

      if (data.status === "completed") {
        toast.success("Processing complete");
        router.refresh();
      } else if (data.status === "failed") {
        toast.error("Processing failed");
        router.refresh();
      }
    } catch {
      // Silently fail — polling will retry
    }
  }, [doc.id, router]);

  useEffect(() => {
    if (!isProcessing) return;

    const interval = setInterval(fetchDocument, 3000);
    return () => clearInterval(interval);
  }, [isProcessing, fetchDocument]);

  const textResult = doc.summaries.find(
    (s) => s.strategy === "text_extraction" && s.status === "completed"
  );
  const multiResult = doc.summaries.find(
    (s) => s.strategy === "multimodal" && s.status === "completed"
  );

  return (
    <>
      {/* Processing status indicator */}
      {isProcessing && (
        <ProcessingStatus
          summaries={doc.summaries}
          documentStatus={doc.status}
        />
      )}

      {/* Comparison banner — only when both strategies completed */}
      {textResult && multiResult && (
        <div className="mt-6">
          <ComparisonBanner
            textSummary={textResult}
            multimodalSummary={multiResult}
          />
        </div>
      )}

      {/* Strategy comparison */}
      {doc.summaries.length > 0 && (
        <div className="mt-6">
          <StrategyComparison summaries={doc.summaries} />
        </div>
      )}
    </>
  );
}
