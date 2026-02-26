"use client";

import Link from "next/link";
import { FileText, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Document, Summary, Evaluation } from "@/types/database";

type DocumentWithScores = Document & {
  summaries: (Summary & { evaluation: Evaluation | null })[];
};

function getStatusVariant(
  status: Document["status"]
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "completed":
      return "default";
    case "processing":
    case "uploading":
      return "secondary";
    case "failed":
      return "destructive";
  }
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) return "just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 30) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function getStrategyScores(
  summaries: DocumentWithScores["summaries"]
): string | null {
  if (summaries.length === 0) return null;

  const parts: string[] = [];
  for (const summary of summaries) {
    const label =
      summary.strategy === "text_extraction" ? "Text" : "Multimodal";
    const score = summary.evaluation?.overall_score;
    parts.push(score != null ? `${label}: ${score.toFixed(1)}` : `${label}: —`);
  }
  return parts.join(" | ");
}

export function DocumentCard({ doc }: { doc: DocumentWithScores }) {
  const scores = doc.status === "completed" ? getStrategyScores(doc.summaries) : null;

  return (
    <Link href={`/documents/${doc.id}`}>
      <Card className="transition-colors hover:bg-muted/50 cursor-pointer">
        <CardContent className="flex items-center gap-4 p-4">
          <FileText className="h-8 w-8 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{doc.filename}</p>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={getStatusVariant(doc.status)}>{doc.status}</Badge>
              {scores && (
                <span className="text-xs text-muted-foreground">{scores}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>{formatRelativeTime(doc.created_at)}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
