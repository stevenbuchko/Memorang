"use client";

import { useMemo } from "react";
import { MOCK_MESSAGES, type MockMessage } from "@/data/mock-thread";
import { ThreadMessage } from "@/features/thread/thread-message";
import { ThreadDocumentMessage } from "@/features/thread/thread-document-message";
import { ThreadUploadZone } from "@/features/thread/thread-upload-zone";
import type { Document, Summary, Evaluation, Feedback } from "@/types/database";

type DocumentWithSummaries = Document & {
  summaries: (Summary & { evaluation: Evaluation | null; feedback: Feedback | null })[];
};

interface ThreadViewProps {
  documents: DocumentWithSummaries[];
}

type TimelineEntry =
  | { type: "mock"; message: MockMessage; timestamp: number }
  | { type: "document"; document: DocumentWithSummaries; timestamp: number };

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

export function ThreadView({ documents }: ThreadViewProps) {
  const timeline = useMemo(() => {
    const entries: TimelineEntry[] = [
      ...MOCK_MESSAGES.map((m) => ({
        type: "mock" as const,
        message: m,
        timestamp: new Date(m.timestamp).getTime(),
      })),
      ...documents.filter((d) => d.source === "thread").map((d) => ({
        type: "document" as const,
        document: d,
        timestamp: new Date(d.created_at).getTime(),
      })),
    ];
    entries.sort((a, b) => a.timestamp - b.timestamp);
    return entries;
  }, [documents]);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-muted/20 p-4 sm:p-5 space-y-5">
        {timeline.map((entry) => {
          if (entry.type === "mock") {
            return (
              <ThreadMessage
                key={entry.message.id}
                user={entry.message.user}
                content={entry.message.content}
                timestamp={entry.message.timestamp}
                mockAttachment={entry.message.mockAttachment}
              />
            );
          }
          const best = getBestSummary(entry.document.summaries);
          return (
            <ThreadDocumentMessage
              key={entry.document.id}
              document={entry.document}
              bestSummary={best}
            />
          );
        })}
      </div>

      <ThreadUploadZone />
    </div>
  );
}
