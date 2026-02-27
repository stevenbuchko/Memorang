"use client";

import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { StrategyCard } from "@/features/documents/strategy-card";
import type { Summary, Evaluation, Feedback } from "@/types/database";

type SummaryWithEval = Summary & {
  evaluation: Evaluation | null;
  feedback: Feedback | null;
};

interface StrategyComparisonProps {
  summaries: SummaryWithEval[];
}

function StrategyCardSkeleton({ label }: { label: string }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <span className="text-lg font-semibold">{label}</span>
          <Skeleton className="h-5 w-24" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-4 w-48" />
        <div className="flex gap-2">
          <Skeleton className="h-6 w-16 rounded-md" />
          <Skeleton className="h-6 w-20 rounded-md" />
        </div>
      </CardContent>
    </Card>
  );
}

function FailedStrategyCard({ label, error }: { label: string; error?: string | null }) {
  return (
    <Card className="border-destructive/50">
      <CardHeader>
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          <span className="text-lg font-semibold">{label}</span>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          {error ?? "This strategy failed to produce results."}
        </p>
      </CardContent>
    </Card>
  );
}

function ProcessingStrategyCard({ label }: { label: string }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <span className="text-lg font-semibold">{label}</span>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Processing in progress. Refresh to check for updates.
        </p>
      </CardContent>
    </Card>
  );
}

function getStrategyLabel(strategy: string): string {
  return strategy === "text_extraction" ? "Text Extraction" : "Multimodal";
}

export function StrategyComparison({ summaries }: StrategyComparisonProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia("(max-width: 767px)");
    setIsMobile(mql.matches);
    function handler(e: MediaQueryListEvent) {
      setIsMobile(e.matches);
    }
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  const textSummary = summaries.find((s) => s.strategy === "text_extraction");
  const multimodalSummary = summaries.find((s) => s.strategy === "multimodal");

  // Single strategy — render full-width with note
  if (summaries.length === 1) {
    const summary = summaries[0];
    return (
      <div className="space-y-4">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Only the {getStrategyLabel(summary.strategy)} strategy produced results for this
            document. The other strategy is unavailable.
          </AlertDescription>
        </Alert>
        <StrategyCard summary={summary} />
      </div>
    );
  }

  // Build cards for each strategy slot
  function renderCard(
    summary: SummaryWithEval | undefined,
    label: string
  ) {
    if (!summary) {
      return <FailedStrategyCard label={label} error="This strategy was not run." />;
    }
    if (summary.status === "processing") {
      return <ProcessingStrategyCard label={label} />;
    }
    if (summary.status === "failed") {
      return <FailedStrategyCard label={label} error={summary.error_message} />;
    }
    return <StrategyCard summary={summary} />;
  }

  // Mobile: Tabs
  if (isMobile) {
    const defaultTab = textSummary?.status === "completed" ? "text" : "multimodal";
    return (
      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="text">Text Extraction</TabsTrigger>
          <TabsTrigger value="multimodal">Multimodal</TabsTrigger>
        </TabsList>
        <TabsContent value="text">
          {renderCard(textSummary, "Text Extraction")}
        </TabsContent>
        <TabsContent value="multimodal">
          {renderCard(multimodalSummary, "Multimodal")}
        </TabsContent>
      </Tabs>
    );
  }

  // Desktop: Side-by-side grid
  return (
    <div className="grid grid-cols-2 gap-6">
      {renderCard(textSummary, "Text Extraction")}
      {renderCard(multimodalSummary, "Multimodal")}
    </div>
  );
}
