"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { FlaskConical, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProcessingStatus } from "@/features/documents/processing-status";
import { CommentThreadPreview } from "@/features/documents/comment-thread-preview";
import { KnowledgeBasePreview } from "@/features/documents/knowledge-base-preview";
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

function getBestSummary(summaries: SummaryWithEval[]): SummaryWithEval | null {
  const completed = summaries.filter((s) => s.status === "completed");
  if (completed.length === 0) return null;
  if (completed.length === 1) return completed[0];
  return completed.reduce((best, current) => {
    const bestScore = best.evaluation?.overall_score ?? 0;
    const currentScore = current.evaluation?.overall_score ?? 0;
    return currentScore > bestScore ? current : best;
  });
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

  const bestSummary = getBestSummary(doc.summaries);

  return (
    <>
      {/* Processing status indicator */}
      {isProcessing && (
        <ProcessingStatus
          summaries={doc.summaries}
          documentStatus={doc.status}
        />
      )}

      {/* Preview — main view showing AI intelligence in context */}
      {bestSummary && (
        <div className="space-y-8 mt-6">
          <CommentThreadPreview
            document={doc}
            bestSummary={bestSummary}
          />
          <KnowledgeBasePreview
            document={doc}
            bestSummary={bestSummary}
          />

          {/* CTA to analysis deep dive */}
          <Card className="border-dashed">
            <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-5">
              <div>
                <p className="text-sm font-semibold">
                  Want to compare models or try a different approach?
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  See how {doc.summaries.filter(s => s.status === "completed").length > 1
                    ? "GPT-4.1 Mini and GPT-4o compared"
                    : "the AI model scored"}{" "}
                  on this document, with detailed metrics and feedback.
                </p>
              </div>
              <Link href={`/documents/${doc.id}/analysis`}>
                <Button className="gap-1.5 shrink-0 min-h-[44px]">
                  <FlaskConical className="h-4 w-4" />
                  Deep Dive
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
