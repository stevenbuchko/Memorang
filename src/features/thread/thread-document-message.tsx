"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  Paperclip,
  ArrowRight,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getCategoryColor,
  getScoreBadgeColor,
  getScoreColor,
  formatFileSize,
} from "@/features/documents/preview-utils";
import { FeedbackForm } from "@/features/feedback/feedback-form";
import { AI_USER } from "@/data/mock-thread";
import type { Document, Summary, Evaluation, Feedback } from "@/types/database";

type SummaryWithEval = Summary & {
  evaluation: Evaluation | null;
  feedback: Feedback | null;
};

interface ThreadDocumentMessageProps {
  document: Document;
  bestSummary: SummaryWithEval | null;
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function ScoreRow({ label, score }: { label: string; score: number | null | undefined }) {
  if (score == null) return null;
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full ${score >= 7 ? "bg-green-500" : score >= 4 ? "bg-yellow-500" : "bg-red-500"}`}
            style={{ width: `${score * 10}%` }}
          />
        </div>
        <span className={`font-medium ${getScoreColor(score)}`}>{score}/10</span>
      </div>
    </div>
  );
}

export function ThreadDocumentMessage({
  document: doc,
  bestSummary,
}: ThreadDocumentMessageProps) {
  const [expanded, setExpanded] = useState(false);
  const overallScore = bestSummary?.evaluation?.overall_score;
  const topTags = [...(bestSummary?.tags ?? [])]
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 5);
  const isProcessing = doc.status === "processing" || doc.status === "uploading";

  return (
    <div className="space-y-5">
      {/* User uploaded a file */}
      <div className="flex gap-3">
        <div className="h-9 w-9 shrink-0 rounded-full bg-slate-600 flex items-center justify-center">
          <span className="text-xs font-semibold text-white">You</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-semibold">You</span>
            <span className="text-xs text-muted-foreground">
              {formatTimestamp(doc.created_at)}
            </span>
          </div>
          <p className="text-sm mt-1">Uploaded a file:</p>
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
        <div className={`h-9 w-9 shrink-0 rounded-full ${AI_USER.color} flex items-center justify-center`}>
          <Sparkles className="h-4 w-4 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-semibold">{AI_USER.name}</span>
            <span className="text-xs text-muted-foreground">
              {formatTimestamp(doc.created_at)}
            </span>
          </div>

          {isProcessing ? (
            <div className="mt-2 rounded-lg border bg-background p-4 flex items-center gap-3">
              <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
              <span className="text-sm text-muted-foreground">Analyzing attachment...</span>
            </div>
          ) : bestSummary ? (
            <div className="mt-2 rounded-lg border bg-background overflow-hidden">
              <div className="p-4 space-y-3">
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

                {/* Expandable details toggle */}
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  {expanded ? (
                    <>
                      <ChevronUp className="h-3 w-3" />
                      Show less
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-3 w-3" />
                      Show more
                    </>
                  )}
                </button>
              </div>

              {/* Expanded details section */}
              {expanded && (
                <>
                  <Separator />
                  <div className="p-4 space-y-4">
                    {/* Detailed summary */}
                    {bestSummary.summary_detailed && (
                      <div className="space-y-1.5">
                        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Detailed Summary
                        </h4>
                        <p className="text-sm leading-relaxed">
                          {bestSummary.summary_detailed}
                        </p>
                      </div>
                    )}

                    {/* Evaluation scores */}
                    {bestSummary.evaluation && (
                      <div className="space-y-2">
                        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Quality Scores
                        </h4>
                        <div className="space-y-1.5">
                          <ScoreRow label="Completeness" score={bestSummary.evaluation.completeness_score} />
                          <ScoreRow label="Confidence" score={bestSummary.evaluation.confidence_score} />
                          <ScoreRow label="Specificity" score={bestSummary.evaluation.specificity_score} />
                          <ScoreRow label="Overall" score={bestSummary.evaluation.overall_score} />
                        </div>
                      </div>
                    )}

                    {/* All tags (not just top 5) */}
                    {(bestSummary.tags ?? []).length > 5 && (
                      <div className="space-y-1.5">
                        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          All Tags
                        </h4>
                        <div className="flex flex-wrap gap-1.5">
                          {[...(bestSummary.tags ?? [])]
                            .sort((a, b) => b.confidence - a.confidence)
                            .map((tag, i) => (
                              <span
                                key={i}
                                className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs ${getCategoryColor(tag.category)}`}
                              >
                                {tag.label}
                              </span>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* Metadata */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span>{formatFileSize(doc.file_size)}</span>
                      {doc.page_count != null && <span>{doc.page_count} pages</span>}
                      {bestSummary.model_name && <span>{bestSummary.model_name}</span>}
                      {bestSummary.processing_time_ms != null && (
                        <span>{(bestSummary.processing_time_ms / 1000).toFixed(1)}s</span>
                      )}
                    </div>
                  </div>

                  {/* Feedback section */}
                  <Separator />
                  <div className="p-4">
                    <FeedbackForm
                      summaryId={bestSummary.id}
                      existingFeedback={bestSummary.feedback}
                    />
                  </div>
                </>
              )}

              {/* Deep dive link (always visible) */}
              <Separator />
              <div className="px-4 py-2.5">
                <Link
                  href={`/documents/${doc.id}/analysis`}
                  className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
                >
                  Deep Dive
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          ) : doc.status === "failed" ? (
            <div className="mt-2 rounded-lg border border-destructive/50 bg-background p-4">
              <p className="text-sm text-muted-foreground">
                Could not analyze this attachment.
              </p>
            </div>
          ) : (
            <Skeleton className="mt-2 h-32 w-full rounded-lg" />
          )}
        </div>
      </div>
    </div>
  );
}
