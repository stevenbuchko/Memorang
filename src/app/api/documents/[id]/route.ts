import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import type { Summary, Evaluation, Feedback } from "@/types/database";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { data: doc, error } = await supabaseAdmin
    .from("documents")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !doc) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

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

  const enrichedSummaries = ((summaries ?? []) as Summary[]).map((s) => ({
    ...s,
    evaluation: evalMap.get(s.id) ?? null,
    feedback: feedbackMap.get(s.id) ?? null,
  }));

  return NextResponse.json({ ...doc, summaries: enrichedSummaries });
}
