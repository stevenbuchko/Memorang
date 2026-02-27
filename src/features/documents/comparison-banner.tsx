import { Card, CardContent } from "@/components/ui/card";
import type { Summary, Evaluation } from "@/types/database";

type SummaryWithEval = Summary & {
  evaluation: Evaluation | null;
};

interface ComparisonBannerProps {
  textSummary: SummaryWithEval;
  multimodalSummary: SummaryWithEval;
}

function formatCost(cost: number): string {
  if (cost < 0.001) return `$${cost.toFixed(6)}`;
  if (cost < 0.01) return `$${cost.toFixed(5)}`;
  return `$${cost.toFixed(4)}`;
}

function formatTime(ms: number | null): string {
  if (ms == null) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function getTotalCost(summary: SummaryWithEval): number {
  return (summary.estimated_cost_usd ?? 0) + (summary.evaluation?.estimated_cost_usd ?? 0);
}

type Winner = "text" | "multimodal" | "tie";

function getWinner(
  textVal: number | null,
  multiVal: number | null,
  higherIsBetter: boolean
): Winner {
  if (textVal == null || multiVal == null) return "tie";
  if (textVal === multiVal) return "tie";
  if (higherIsBetter) {
    return textVal > multiVal ? "text" : "multimodal";
  }
  return textVal < multiVal ? "text" : "multimodal";
}

function WinnerCell({
  value,
  isWinner,
}: {
  value: string;
  isWinner: boolean;
}) {
  return (
    <td
      className={`px-4 py-2.5 text-center text-sm ${
        isWinner ? "font-semibold text-green-600" : "text-muted-foreground"
      }`}
    >
      {value}
    </td>
  );
}

export function ComparisonBanner({
  textSummary,
  multimodalSummary,
}: ComparisonBannerProps) {
  const textScore = textSummary.evaluation?.overall_score ?? null;
  const multiScore = multimodalSummary.evaluation?.overall_score ?? null;

  const textCost = getTotalCost(textSummary);
  const multiCost = getTotalCost(multimodalSummary);

  const textTime = textSummary.processing_time_ms;
  const multiTime = multimodalSummary.processing_time_ms;

  const textCostPerPoint =
    textScore != null && textScore > 0 ? textCost / textScore : null;
  const multiCostPerPoint =
    multiScore != null && multiScore > 0 ? multiCost / multiScore : null;

  const scoreWinner = getWinner(textScore, multiScore, true);
  const costWinner = getWinner(textCost, multiCost, false);
  const timeWinner = getWinner(textTime, multiTime, false);
  const cppWinner = getWinner(textCostPerPoint, multiCostPerPoint, false);

  const rows: {
    label: string;
    textVal: string;
    multiVal: string;
    winner: Winner;
  }[] = [
    {
      label: "Overall Score",
      textVal: textScore != null ? `${textScore}/10` : "—",
      multiVal: multiScore != null ? `${multiScore}/10` : "—",
      winner: scoreWinner,
    },
    {
      label: "Cost",
      textVal: formatCost(textCost),
      multiVal: formatCost(multiCost),
      winner: costWinner,
    },
    {
      label: "Time",
      textVal: formatTime(textTime),
      multiVal: formatTime(multiTime),
      winner: timeWinner,
    },
    {
      label: "Cost per Point",
      textVal: textCostPerPoint != null ? formatCost(textCostPerPoint) : "—",
      multiVal: multiCostPerPoint != null ? formatCost(multiCostPerPoint) : "—",
      winner: cppWinner,
    },
  ];

  return (
    <Card>
      <CardContent className="pt-6">
        <h3 className="text-sm font-semibold mb-3">Strategy Comparison</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="px-4 py-2 text-left font-medium text-muted-foreground" />
                <th className="px-4 py-2 text-center font-medium">Text Extraction</th>
                <th className="px-4 py-2 text-center font-medium">Multimodal</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label} className="border-b last:border-0">
                  <td className="px-4 py-2.5 text-sm font-medium">{row.label}</td>
                  <WinnerCell
                    value={row.textVal}
                    isWinner={row.winner === "text"}
                  />
                  <WinnerCell
                    value={row.multiVal}
                    isWinner={row.winner === "multimodal"}
                  />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
