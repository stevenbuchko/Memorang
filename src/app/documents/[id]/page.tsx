import Link from "next/link";
import {
  ArrowLeft,
  FileText,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ExtractionAlert } from "@/features/documents/extraction-alert";
import { DocumentDetailPoller } from "@/features/documents/document-detail-poller";
import type {
  Document,
  Summary,
  Evaluation,
  Feedback,
  ExtractionErrorType,
} from "@/types/database";

export const dynamic = "force-dynamic";

type SummaryWithEval = Summary & {
  evaluation: Evaluation | null;
  feedback: Feedback | null;
};

type DocumentDetail = Document & {
  summaries: SummaryWithEval[];
};

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

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleString();
}

export default async function DocumentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const doc = await getDocument(id);

  if (!doc) {
    notFound();
  }

  const isFailed = doc.status === "failed";
  const hasMultipleStrategies = doc.summaries.length > 1;
  const isProcessing = doc.status === "processing" || doc.status === "uploading";

  return (
    <div className="min-h-screen bg-background">
      <div className={`mx-auto px-4 py-8 sm:py-12 ${hasMultipleStrategies || isProcessing ? "max-w-6xl" : "max-w-3xl"}`}>
        {/* Back button */}
        <Link href="/">
          <Button variant="ghost" size="sm" className="mb-6 -ml-2 min-h-[44px]">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        </Link>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-start gap-3">
            <FileText className="h-8 w-8 shrink-0 text-muted-foreground mt-0.5" />
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight break-all">
                {doc.filename}
              </h1>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-2 text-xs sm:text-sm text-muted-foreground">
                {doc.page_count != null && (
                  <span>{doc.page_count} page{doc.page_count !== 1 ? "s" : ""}</span>
                )}
                <span>{formatFileSize(doc.file_size)}</span>
                <span>{formatDate(doc.created_at)}</span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Badge
                  variant={
                    doc.status === "completed"
                      ? "default"
                      : doc.status === "failed"
                        ? "destructive"
                        : "secondary"
                  }
                >
                  {doc.status}
                </Badge>
                {doc.extraction_success ? (
                  <span className="flex items-center gap-1 text-xs text-green-600">
                    <CheckCircle2 className="h-3 w-3" />
                    Text extracted
                  </span>
                ) : doc.status === "completed" || doc.status === "failed" ? (
                  <span className="flex items-center gap-1 text-xs text-yellow-600">
                    <AlertTriangle className="h-3 w-3" />
                    Text extraction limited
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        {/* Extraction error alert */}
        {doc.error_type && doc.error_type !== "unknown" && (
          <div className="mb-4">
            <ExtractionAlert
              errorType={doc.error_type as ExtractionErrorType}
              errorMessage={doc.error_message}
            />
          </div>
        )}

        {/* Failed state */}
        {isFailed && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertTitle>Processing Failed</AlertTitle>
            <AlertDescription>
              {doc.error_message ?? "An error occurred while processing this document."}
            </AlertDescription>
          </Alert>
        )}

        {/* Dynamic content with polling */}
        <DocumentDetailPoller initialDocument={doc} />

        {/* No summaries yet (and not processing or failed) */}
        {doc.summaries.length === 0 && !isProcessing && !isFailed && (
          <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
            <FileText className="h-12 w-12 mb-4" />
            <p className="text-sm">No summaries available for this document.</p>
          </div>
        )}
      </div>
    </div>
  );
}
