import { supabaseAdmin } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import type { Summary, Evaluation } from "@/types/database";

interface StrategyStats {
  avgScore: number | null;
  avgCost: number;
  count: number;
}

function computeStrategyStats(
  summaries: Summary[],
  evaluations: Map<string, Evaluation>
): StrategyStats {
  if (summaries.length === 0) return { avgScore: null, avgCost: 0, count: 0 };

  let scoreSum = 0;
  let scoreCount = 0;
  let costSum = 0;

  for (const s of summaries) {
    const summaryCost = s.estimated_cost_usd ?? 0;
    const eval_ = evaluations.get(s.id);
    const evalCost = eval_?.estimated_cost_usd ?? 0;
    costSum += summaryCost + evalCost;

    if (eval_?.overall_score != null) {
      scoreSum += eval_.overall_score;
      scoreCount++;
    }
  }

  return {
    avgScore: scoreCount > 0 ? scoreSum / scoreCount : null,
    avgCost: costSum / summaries.length,
    count: summaries.length,
  };
}

function formatCurrency(value: number): string {
  if (value < 0.01) return `$${value.toFixed(4)}`;
  return `$${value.toFixed(2)}`;
}

function formatScore(value: number | null): string {
  if (value == null) return "-";
  return value.toFixed(1);
}

export async function AggregateStats() {
  const { data: completedDocs } = await supabaseAdmin
    .from("documents")
    .select("id")
    .eq("status", "completed");

  if (!completedDocs || completedDocs.length === 0) return null;

  const docIds = completedDocs.map((d: { id: string }) => d.id);

  const { data: summaries } = await supabaseAdmin
    .from("summaries")
    .select("*")
    .in("document_id", docIds)
    .eq("status", "completed");

  if (!summaries || summaries.length === 0) return null;

  const summaryIds = summaries.map((s: Summary) => s.id);
  const { data: evalData } = await supabaseAdmin
    .from("evaluations")
    .select("*")
    .in("summary_id", summaryIds);

  const evalMap = new Map<string, Evaluation>();
  for (const e of (evalData ?? []) as Evaluation[]) {
    evalMap.set(e.summary_id, e);
  }

  const textSummaries = summaries.filter(
    (s: Summary) => s.strategy === "text_extraction"
  );
  const multimodalSummaries = summaries.filter(
    (s: Summary) => s.strategy === "multimodal"
  );

  const textStats = computeStrategyStats(textSummaries, evalMap);
  const multimodalStats = computeStrategyStats(multimodalSummaries, evalMap);

  let totalCost = 0;
  for (const s of summaries as Summary[]) {
    totalCost += s.estimated_cost_usd ?? 0;
    const eval_ = evalMap.get(s.id);
    totalCost += eval_?.estimated_cost_usd ?? 0;
  }

  const stats = [
    {
      label: "Documents Processed",
      value: docIds.length.toString(),
    },
    {
      label: "Avg Score (Text)",
      value: formatScore(textStats.avgScore),
      sublabel: textStats.count > 0 ? `/10` : undefined,
    },
    {
      label: "Avg Score (Multimodal)",
      value: formatScore(multimodalStats.avgScore),
      sublabel: multimodalStats.count > 0 ? `/10` : undefined,
    },
    {
      label: "Total Cost",
      value: formatCurrency(totalCost),
    },
    {
      label: "Avg Cost/Doc (Text)",
      value: textStats.count > 0 ? formatCurrency(textStats.avgCost) : "-",
    },
    {
      label: "Avg Cost/Doc (Multimodal)",
      value:
        multimodalStats.count > 0
          ? formatCurrency(multimodalStats.avgCost)
          : "-",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 sm:gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {stats.map((stat) => (
        <Card key={stat.label}>
          <CardContent className="p-3 sm:p-4">
            <p className="text-xl sm:text-2xl font-bold tracking-tight truncate">
              {stat.value}
              {stat.sublabel && (
                <span className="text-xs sm:text-sm font-normal text-muted-foreground">
                  {stat.sublabel}
                </span>
              )}
            </p>
            <p className="text-[11px] sm:text-xs text-muted-foreground mt-1 leading-tight">{stat.label}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
