"use client";

import { Sparkles, FileText, Paperclip } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  getCategoryColor,
  getScoreBadgeColor,
  formatFileSize,
} from "@/features/documents/preview-utils";
import type { Document, Summary, Evaluation, Feedback } from "@/types/database";

type SummaryWithEval = Summary & {
  evaluation: Evaluation | null;
  feedback: Feedback | null;
};

interface CommentThreadPreviewProps {
  document: Document;
  bestSummary: SummaryWithEval;
}

export function CommentThreadPreview({
  document: doc,
  bestSummary,
}: CommentThreadPreviewProps) {
  const overallScore = bestSummary.evaluation?.overall_score;
  const topTags = [...(bestSummary.tags ?? [])]
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 5);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Comment Thread</CardTitle>
        <CardDescription>
          How attachment intelligence surfaces when a file is shared in a thread
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-5 rounded-lg border bg-muted/20 p-4 sm:p-5">
          {/* User message */}
          <div className="flex gap-3">
            <div className="h-9 w-9 shrink-0 rounded-full bg-blue-600 flex items-center justify-center">
              <span className="text-xs font-semibold text-white">AM</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-semibold">Alex M.</span>
                <span className="text-xs text-muted-foreground">Today at 2:34 PM</span>
              </div>
              <p className="text-sm mt-1">Attached this file:</p>
              <div className="mt-2 inline-flex items-center gap-2 rounded-md border bg-background px-3 py-2">
                <Paperclip className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium truncate max-w-[200px] sm:max-w-none">
                  {doc.filename}
                </span>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {formatFileSize(doc.file_size)}
                  {doc.page_count != null && ` \u00B7 ${doc.page_count} pg`}
                </span>
              </div>
            </div>
          </div>

          {/* AI bot reply */}
          <div className="flex gap-3">
            <div className="h-9 w-9 shrink-0 rounded-full bg-indigo-600 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-semibold">Memorang AI</span>
                <span className="text-xs text-muted-foreground">Today at 2:34 PM</span>
              </div>

              {/* Intelligence card */}
              <div className="mt-2 rounded-lg border bg-background p-4 space-y-3">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                  <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">
                    Attachment Intelligence
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {bestSummary.document_type && (
                    <Badge variant="secondary" className="text-xs">
                      {bestSummary.document_type.replace(/_/g, " ")}
                    </Badge>
                  )}
                  {overallScore != null && (
                    <Badge
                      variant="outline"
                      className={`text-xs ${getScoreBadgeColor(overallScore)}`}
                    >
                      {overallScore}/10 confidence
                    </Badge>
                  )}
                </div>

                <p className="text-sm leading-relaxed">
                  {bestSummary.summary_short ?? bestSummary.summary_detailed?.slice(0, 200)}
                </p>

                {topTags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {topTags.map((tag, i) => (
                      <span
                        key={i}
                        className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs ${getCategoryColor(tag.category)}`}
                      >
                        {tag.label}
                      </span>
                    ))}
                  </div>
                )}

                {doc.project_context && (
                  <p className="text-xs text-muted-foreground">
                    Relevant to:{" "}
                    <span className="font-medium text-foreground">
                      {doc.project_context.length > 80
                        ? doc.project_context.slice(0, 80) + "..."
                        : doc.project_context}
                    </span>
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
