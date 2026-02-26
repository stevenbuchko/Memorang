"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Clock, Coins, Hash } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { FeedbackForm } from "@/features/feedback/feedback-form";
import type { Summary, Evaluation, Feedback, Tag } from "@/types/database";

interface StrategyCardProps {
  summary: Summary & { evaluation: Evaluation | null; feedback: Feedback | null };
}

function formatProcessingTime(ms: number | null): string {
  if (ms == null) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatTokens(tokens: number | null): string {
  if (tokens == null) return "—";
  return tokens.toLocaleString();
}

function formatCost(cost: number | null): string {
  if (cost == null) return "—";
  return `$${cost.toFixed(4)}`;
}

function getScoreColor(score: number): string {
  if (score >= 8) return "text-green-600";
  if (score >= 5) return "text-yellow-600";
  return "text-red-600";
}

function getCategoryColor(category: Tag["category"]): string {
  switch (category) {
    case "topic":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "document_type":
      return "bg-purple-100 text-purple-800 border-purple-200";
    case "entity":
      return "bg-green-100 text-green-800 border-green-200";
    case "methodology":
      return "bg-orange-100 text-orange-800 border-orange-200";
    case "domain":
      return "bg-pink-100 text-pink-800 border-pink-200";
  }
}

function EvalScore({
  label,
  score,
  rationale,
}: {
  label: string;
  score: number | null;
  rationale: string | null;
}) {
  if (score == null) return null;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        <span className={`text-sm font-semibold ${getScoreColor(score)}`}>
          {score}/10
        </span>
      </div>
      <Progress value={score * 10} className="h-2" />
      {rationale && (
        <p className="text-xs text-muted-foreground">{rationale}</p>
      )}
    </div>
  );
}

export function StrategyCard({ summary }: StrategyCardProps) {
  const [showDetailed, setShowDetailed] = useState(false);
  const evaluation = summary.evaluation;
  const strategyLabel =
    summary.strategy === "text_extraction" ? "Text Extraction" : "Multimodal";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{strategyLabel}</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{summary.model_name}</Badge>
            {summary.document_type && (
              <Badge variant="outline">{summary.document_type}</Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Short Summary */}
        {summary.summary_short && (
          <div>
            <p className="text-sm leading-relaxed">{summary.summary_short}</p>
          </div>
        )}

        {/* Detailed Summary (collapsible) */}
        {summary.summary_detailed && (
          <div>
            <button
              onClick={() => setShowDetailed(!showDetailed)}
              className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {showDetailed ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
              {showDetailed ? "Hide" : "Show"} detailed summary
            </button>
            {showDetailed && (
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
                {summary.summary_detailed}
              </p>
            )}
          </div>
        )}

        {/* Tags */}
        {summary.tags && summary.tags.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2">Tags</h4>
            <TooltipProvider>
              <div className="flex flex-wrap gap-1.5">
                {summary.tags.map((tag, i) => (
                  <Tooltip key={i}>
                    <TooltipTrigger asChild>
                      <div
                        className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${getCategoryColor(tag.category)}`}
                      >
                        {tag.label}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>
                        {tag.category} &middot; {(tag.confidence * 100).toFixed(0)}%
                        confidence
                      </p>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </TooltipProvider>
          </div>
        )}

        <Separator />

        {/* Evaluation Scores */}
        {evaluation && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-medium">Self-Evaluation</h4>
              {evaluation.overall_score != null && (
                <span
                  className={`text-2xl font-bold ${getScoreColor(evaluation.overall_score)}`}
                >
                  {evaluation.overall_score}/10
                </span>
              )}
            </div>
            <div className="space-y-4">
              <EvalScore
                label="Completeness"
                score={evaluation.completeness_score}
                rationale={evaluation.completeness_rationale}
              />
              <EvalScore
                label="Confidence"
                score={evaluation.confidence_score}
                rationale={evaluation.confidence_rationale}
              />
              <EvalScore
                label="Specificity"
                score={evaluation.specificity_score}
                rationale={evaluation.specificity_rationale}
              />
              <EvalScore
                label="Overall"
                score={evaluation.overall_score}
                rationale={evaluation.overall_rationale}
              />
            </div>
          </div>
        )}

        <Separator />

        {/* Metrics */}
        <div>
          <h4 className="text-sm font-medium mb-3">Metrics</h4>
          <div className="grid grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Time</p>
                <p className="text-sm font-medium">
                  {formatProcessingTime(summary.processing_time_ms)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Hash className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Tokens</p>
                <p className="text-sm font-medium">
                  {formatTokens(summary.total_tokens)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Coins className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Cost</p>
                <p className="text-sm font-medium">
                  {formatCost(
                    (summary.estimated_cost_usd ?? 0) +
                      (summary.evaluation?.estimated_cost_usd ?? 0)
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Feedback */}
        <FeedbackForm summaryId={summary.id} existingFeedback={summary.feedback} />
      </CardContent>
    </Card>
  );
}
