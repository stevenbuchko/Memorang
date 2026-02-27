import Image from "next/image";
import { supabaseAdmin } from "@/lib/supabase";
import { HomeTabs } from "@/features/home/home-tabs";
import type { Document, Summary, Evaluation, Feedback } from "@/types/database";

type DocumentWithSummaries = Document & {
  summaries: (Summary & { evaluation: Evaluation | null; feedback: Feedback | null })[];
};

async function getDocuments(): Promise<DocumentWithSummaries[]> {
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

  const summaryMap = new Map<string, (Summary & { evaluation: Evaluation | null; feedback: Feedback | null })[]>();
  for (const s of (summaries ?? []) as Summary[]) {
    const arr = summaryMap.get(s.document_id) ?? [];
    arr.push({ ...s, evaluation: evalMap.get(s.id) ?? null, feedback: feedbackMap.get(s.id) ?? null });
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
        <div className="flex items-center gap-2.5 mb-6 sm:mb-8">
          <Image
            src="/memorang-logo.png"
            alt="Memorang"
            width={36}
            height={36}
            className="h-9 w-9"
          />
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            memorang
          </h1>
        </div>

        <HomeTabs documents={documents} />
      </div>
    </div>
  );
}
