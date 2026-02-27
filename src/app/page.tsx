import { FileText } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase";
import { UploadZone } from "@/features/upload/upload-zone";
import { DocumentCard } from "@/features/documents/document-card";
import { AggregateStats } from "@/features/documents/aggregate-stats";
import type { Document, Summary, Evaluation } from "@/types/database";

type DocumentWithScores = Document & {
  summaries: (Summary & { evaluation: Evaluation | null })[];
};

async function getDocuments(): Promise<DocumentWithScores[]> {
  const { data: documents, error } = await supabaseAdmin
    .from("documents")
    .select("*")
    .order("created_at", { ascending: false });

  if (error || !documents) return [];

  const docIds = documents.map((d: Document) => d.id);
  if (docIds.length === 0) return documents.map((d: Document) => ({ ...d, summaries: [] }));

  const { data: summaries } = await supabaseAdmin
    .from("summaries")
    .select("*")
    .in("document_id", docIds);

  const summaryIds = (summaries ?? []).map((s: Summary) => s.id);

  let evaluations: Evaluation[] = [];
  if (summaryIds.length > 0) {
    const { data } = await supabaseAdmin
      .from("evaluations")
      .select("*")
      .in("summary_id", summaryIds);
    evaluations = data ?? [];
  }

  const evalMap = new Map<string, Evaluation>();
  for (const e of evaluations) {
    evalMap.set(e.summary_id, e);
  }

  const summaryMap = new Map<string, (Summary & { evaluation: Evaluation | null })[]>();
  for (const s of (summaries ?? []) as Summary[]) {
    const arr = summaryMap.get(s.document_id) ?? [];
    arr.push({ ...s, evaluation: evalMap.get(s.id) ?? null });
    summaryMap.set(s.document_id, arr);
  }

  return documents.map((d: Document) => ({
    ...d,
    summaries: summaryMap.get(d.id) ?? [],
  }));
}

export const dynamic = "force-dynamic";

export default async function Home() {
  const documents = await getDocuments();

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-6 sm:mb-8">
          Attachment Intelligence
        </h1>

        <AggregateStats />

        <div className="mt-6">
          <UploadZone />
        </div>

        <div className="mt-10">
          {documents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
              <FileText className="h-12 w-12 mb-4" />
              <p className="text-sm font-medium">No documents yet</p>
              <p className="text-xs mt-1">
                Upload a PDF to get started
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold">Documents</h2>
              {documents.map((doc) => (
                <DocumentCard key={doc.id} doc={doc} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
