"use client";

import { useState } from "react";
import {
  FileText,
  FileBarChart,
  BookOpen,
  Receipt,
  FileSignature,
  FileSpreadsheet,
  ClipboardList,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  getCategoryColor,
  getCategoryLabel,
  getScoreBadgeColor,
  formatFileSize,
} from "@/features/documents/preview-utils";
import type { Document, Summary, Evaluation, Feedback, Tag } from "@/types/database";

type SummaryWithEval = Summary & {
  evaluation: Evaluation | null;
  feedback: Feedback | null;
};

interface KnowledgeBasePreviewProps {
  document: Document;
  bestSummary: SummaryWithEval;
}

function getDocTypeIcon(docType: string | null) {
  switch (docType) {
    case "report":
      return FileBarChart;
    case "research_paper":
      return BookOpen;
    case "invoice":
      return Receipt;
    case "contract":
      return FileSignature;
    case "spreadsheet_export":
      return FileSpreadsheet;
    case "form":
      return ClipboardList;
    default:
      return FileText;
  }
}

function groupTagsByCategory(tags: Tag[]): Record<string, Tag[]> {
  const groups: Record<string, Tag[]> = {};
  for (const tag of tags) {
    if (!groups[tag.category]) groups[tag.category] = [];
    groups[tag.category].push(tag);
  }
  return groups;
}

export function KnowledgeBasePreview({
  document: doc,
  bestSummary,
}: KnowledgeBasePreviewProps) {
  const [showFull, setShowFull] = useState(false);
  const overallScore = bestSummary.evaluation?.overall_score;
  const DocIcon = getDocTypeIcon(bestSummary.document_type);
  const tagGroups = groupTagsByCategory(bestSummary.tags ?? []);
  const categoryOrder: Tag["category"][] = ["topic", "entity", "domain", "methodology", "document_type"];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Knowledge Base Card</CardTitle>
        <CardDescription>
          How AI metadata enriches a document in a searchable library
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border bg-background shadow-sm">
          {/* Card header */}
          <div className="p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 shrink-0 rounded-lg bg-muted flex items-center justify-center">
                <DocIcon className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold leading-tight break-all">
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
                      {overallScore}/10 AI Confidence
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="mt-4">
              <p className="text-sm leading-relaxed text-muted-foreground">
                {bestSummary.summary_short ?? bestSummary.summary_detailed?.slice(0, 200)}
              </p>
              {bestSummary.summary_detailed && (
                <>
                  <button
                    onClick={() => setShowFull(!showFull)}
                    className="flex items-center gap-1 mt-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showFull ? (
                      <ChevronUp className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5" />
                    )}
                    {showFull ? "Show less" : "Show full summary"}
                  </button>
                  {showFull && (
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
                      {bestSummary.summary_detailed}
                    </p>
                  )}
                </>
              )}
            </div>

            {/* Tags by category */}
            {Object.keys(tagGroups).length > 0 && (
              <div className="mt-4 space-y-2.5">
                {categoryOrder.map((cat) => {
                  const tags = tagGroups[cat];
                  if (!tags || tags.length === 0) return null;
                  return (
                    <div key={cat} className="flex flex-wrap items-center gap-1.5">
                      <span className="text-xs font-medium text-muted-foreground w-20 shrink-0">
                        {getCategoryLabel(cat)}
                      </span>
                      {tags.map((tag, i) => (
                        <span
                          key={i}
                          className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs ${getCategoryColor(tag.category)}`}
                        >
                          {tag.label}
                        </span>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <Separator />

          {/* Metadata footer */}
          <div className="px-4 sm:px-5 py-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span>{formatFileSize(doc.file_size)}</span>
            {doc.page_count != null && (
              <span>{doc.page_count} page{doc.page_count !== 1 ? "s" : ""}</span>
            )}
            <span>{new Date(doc.created_at).toLocaleDateString()}</span>
            <span>Analyzed by {bestSummary.model_name}</span>
            <span className="inline-flex items-center gap-1 text-indigo-600">
              <Sparkles className="h-3 w-3" />
              AI-enriched
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
