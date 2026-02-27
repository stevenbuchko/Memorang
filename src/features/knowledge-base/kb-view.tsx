"use client";

import { FileText } from "lucide-react";
import { KBDocumentCard } from "@/features/knowledge-base/kb-document-card";
import { ThreadUploadZone } from "@/features/thread/thread-upload-zone";
import type { Document, Summary, Evaluation, Feedback } from "@/types/database";

type DocumentWithSummaries = Document & {
  summaries: (Summary & { evaluation: Evaluation | null; feedback: Feedback | null })[];
};

interface KBViewProps {
  documents: DocumentWithSummaries[];
}

function getBestSummary(
  summaries: (Summary & { evaluation: Evaluation | null; feedback: Feedback | null })[]
) {
  const completed = summaries.filter((s) => s.status === "completed");
  if (completed.length === 0) return null;
  if (completed.length === 1) return completed[0];
  return completed.reduce((best, current) => {
    const bestScore = best.evaluation?.overall_score ?? 0;
    const currentScore = current.evaluation?.overall_score ?? 0;
    return currentScore > bestScore ? current : best;
  });
}

export function KBView({ documents }: KBViewProps) {
  const kbDocs = documents.filter((d) => d.source === "knowledge_base");

  return (
    <div className="space-y-4">
      <ThreadUploadZone source="knowledge_base" />

      {kbDocs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
          <FileText className="h-10 w-10 mb-3" />
          <p className="text-sm font-medium">No documents yet</p>
          <p className="text-xs mt-1">
            Upload a PDF to see it enriched with AI metadata
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {kbDocs.map((doc) => (
            <KBDocumentCard
              key={doc.id}
              document={doc}
              bestSummary={getBestSummary(doc.summaries)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
