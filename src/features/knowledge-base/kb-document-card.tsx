"use client";

import { useState } from "react";
import Link from "next/link";
import {
  FileText,
  FileBarChart,
  BookOpen,
  Receipt,
  FileSignature,
  FileSpreadsheet,
  ClipboardList,
  Sparkles,
  Loader2,
  ChevronDown,
  ChevronUp,
  ArrowRight,
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
import type { Document, Summary, Evaluation, Feedback } from "@/types/database";

interface KBDocumentCardProps {
  document: Document;
  bestSummary: (Summary & { evaluation: Evaluation | null; feedback: Feedback | null }) | null;
}

function getDocTypeIcon(docType: string | null) {
  switch (docType) {
    case "report": return FileBarChart;
    case "research_paper": return BookOpen;
    case "invoice": return Receipt;
    case "contract": return FileSignature;
    case "spreadsheet_export": return FileSpreadsheet;
    case "form": return ClipboardList;
    default: return FileText;
  }
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

export function KBDocumentCard({ document: doc, bestSummary }: KBDocumentCardProps) {
  const [expanded, setExpanded] = useState(false);
  const isProcessing = doc.status === "processing" || doc.status === "uploading";

  if (isProcessing) {
    return (
      <div className="rounded-lg border bg-background shadow-sm p-4 sm:p-5 space-y-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 shrink-0 rounded-lg bg-muted flex items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{doc.filename}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Analyzing...</p>
          </div>
        </div>
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    );
  }

  if (!bestSummary || doc.status === "failed") {
    return (
      <div className="rounded-lg border bg-background shadow-sm p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 shrink-0 rounded-lg bg-muted flex items-center justify-center">
            <FileText className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{doc.filename}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {doc.status === "failed" ? "Analysis failed" : "No analysis available"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const overallScore = bestSummary.evaluation?.overall_score;
  const DocIcon = getDocTypeIcon(bestSummary.document_type);
  const topTags = [...(bestSummary.tags ?? [])]
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 4);

  return (
    <div className="rounded-lg border bg-background shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      <div className="p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 shrink-0 rounded-lg bg-muted flex items-center justify-center">
            <DocIcon className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold leading-tight truncate">
              {doc.filename}
            </h3>
            <div className="flex flex-wrap items-center gap-2 mt-1.5">
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
                  {overallScore}/10
                </Badge>
              )}
            </div>
          </div>
        </div>

        <p className="text-sm leading-relaxed text-muted-foreground mt-3">
          {bestSummary.summary_short ?? bestSummary.summary_detailed?.slice(0, 200)}
        </p>

        {topTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
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

        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-3 flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
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

      {expanded && (
        <>
          <Separator />
          <div className="p-4 sm:p-5 space-y-4">
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

            {(bestSummary.tags ?? []).length > 4 && (
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

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span>{formatFileSize(doc.file_size)}</span>
              {doc.page_count != null && <span>{doc.page_count} pages</span>}
              {bestSummary.model_name && <span>{bestSummary.model_name}</span>}
              {bestSummary.processing_time_ms != null && (
                <span>{(bestSummary.processing_time_ms / 1000).toFixed(1)}s</span>
              )}
            </div>
          </div>

          <Separator />
          <div className="p-4 sm:p-5">
            <FeedbackForm
              summaryId={bestSummary.id}
              existingFeedback={bestSummary.feedback}
            />
          </div>
        </>
      )}

      <Separator />
      <div className="px-4 sm:px-5 py-2.5 flex items-center justify-between">
        <span className="inline-flex items-center gap-1 text-xs text-indigo-600">
          <Sparkles className="h-3 w-3" />
          AI-enriched
        </span>
        <Link
          href={`/documents/${doc.id}/analysis`}
          className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
        >
          Deep Dive
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
