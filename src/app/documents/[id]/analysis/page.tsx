import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, FileText, FlaskConical } from "lucide-react";
import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StrategyComparison } from "@/features/documents/strategy-comparison";
import { ComparisonBanner } from "@/features/documents/comparison-banner";
import type {
  Document,
  Summary,
  Evaluation,
  Feedback,
} from "@/types/database";

export const dynamic = "force-dynamic";

type SummaryWithEval = Summary & {
  evaluation: Evaluation | null;
  feedback: Feedback | null;
};

type DocumentDetail = Document & {
  summaries: SummaryWithEval[];
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const { data: doc } = await supabaseAdmin
    .from("documents")
    .select("filename")
    .eq("id", id)
    .single();

  return {
    title: doc
      ? `Analysis — ${doc.filename} — Attachment Intelligence`
      : "Analysis — Attachment Intelligence",
  };
}

async function getDocument(id: string): Promise<DocumentDetail | null> {
  const { data: doc, error } = await supabaseAdmin
    .from("documents")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !doc) return null;

  const { data: summaries } = await supabaseAdmin
    .from("summaries")
    .select("*")
    .eq("document_id", id);

  const summaryIds = (summaries ?? []).map((s: Summary) => s.id);

  let evaluations: Evaluation[] = [];
  let feedbacks: Feedback[] = [];

  if (summaryIds.length > 0) {
    const [evalResult, feedbackResult] = await Promise.all([
      supabaseAdmin
        .from("evaluations")
        .select("*")
        .in("summary_id", summaryIds),
      supabaseAdmin
        .from("feedback")
        .select("*")
        .in("summary_id", summaryIds),
    ]);
    evaluations = evalResult.data ?? [];
    feedbacks = feedbackResult.data ?? [];
  }

  const evalMap = new Map<string, Evaluation>();
  for (const e of evaluations) {
    evalMap.set(e.summary_id, e);
  }

  const feedbackMap = new Map<string, Feedback>();
  for (const f of feedbacks) {
    feedbackMap.set(f.summary_id, f);
  }

  const enrichedSummaries: SummaryWithEval[] = (
    (summaries ?? []) as Summary[]
  ).map((s) => ({
    ...s,
    evaluation: evalMap.get(s.id) ?? null,
    feedback: feedbackMap.get(s.id) ?? null,
  }));

  return { ...(doc as Document), summaries: enrichedSummaries };
}

export default async function AnalysisPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const doc = await getDocument(id);

  if (!doc) {
    notFound();
  }

  const textResult = doc.summaries.find(
    (s) => s.strategy === "text_extraction" && s.status === "completed"
  );
  const multiResult = doc.summaries.find(
    (s) => s.strategy === "multimodal" && s.status === "completed"
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto px-4 py-8 sm:py-12 max-w-6xl">
        {/* Back to document */}
        <Link href="/">
          <Button variant="ghost" size="sm" className="mb-6 -ml-2 min-h-[44px]">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        </Link>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <FlaskConical className="h-5 w-5 text-muted-foreground" />
            <Badge variant="secondary" className="text-xs">Deep Dive</Badge>
          </div>
          <div className="flex items-start gap-3">
            <FileText className="h-8 w-8 shrink-0 text-muted-foreground mt-0.5" />
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight break-all">
                {doc.filename}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Compare how different AI models analyzed this document — scores, costs, and quality side by side.
              </p>
            </div>
          </div>
        </div>

        {/* Comparison banner — only when both strategies completed */}
        {textResult && multiResult && (
          <div className="mb-6">
            <ComparisonBanner
              textSummary={textResult}
              multimodalSummary={multiResult}
            />
          </div>
        )}

        {/* Strategy comparison cards */}
        {doc.summaries.length > 0 && (
          <StrategyComparison summaries={doc.summaries} />
        )}

        {/* No summaries */}
        {doc.summaries.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
            <FileText className="h-12 w-12 mb-4" />
            <p className="text-sm">No analysis results available for this document.</p>
          </div>
        )}
      </div>
    </div>
  );
}
