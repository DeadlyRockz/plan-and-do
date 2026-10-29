import { InfoIcon, StarIcon } from "@phosphor-icons/react/ssr";
import type { Budget } from "@/domain/budget";
import type { PlanIdeas } from "@/domain/contracts";
import { Badge } from "@/components/ui/badge";
import { formatCount, formatMoney, formatShare } from "@/lib/format";
import { PanelHeading } from "./panel-heading";

const RANK_LABELS = ["Top priority", "2nd priority", "3rd priority"];

/**
 * The budget as a real table: the numbers live in cells with row and column headers, and each
 * bar is decorative (aria-hidden) with no background track (plan/08 §8.4).
 */
export function BudgetTab({
  budget,
  guestCount,
  perGuest,
  savingIdeas,
}: {
  budget: Budget;
  guestCount: number;
  perGuest: Budget["total"];
  savingIdeas: PlanIdeas["savingIdeas"];
}) {
  const largest = Math.max(...budget.lines.map((line) => line.basisPoints), 1);
  return (
    <div className="flex flex-col gap-4">
      <PanelHeading>Budget</PanelHeading>
      <div className="overflow-x-auto rounded-xl border bg-card sm:rounded-2xl">
        <table className="w-full text-sm">
          <caption className="p-4 text-left text-base sm:p-6">
            <span className="font-semibold">{formatMoney(budget.total)}</span>
            <span className="text-muted-foreground">
              {" "}
              for {formatCount(guestCount)} guests, about {formatMoney(perGuest)} each
            </span>
          </caption>
          <thead>
            <tr className="border-t text-left text-muted-foreground">
              <th scope="col" className="px-4 py-3 font-medium sm:px-6">
                Category
              </th>
              <th scope="col" className="px-4 py-3 text-right font-medium">
                Share
              </th>
              <th scope="col" className="px-4 py-3 text-right font-medium sm:px-6">
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            {budget.lines.map((line) => {
              const saving = savingIdeas.find((idea) => idea.budgetLineId === line.id);
              return (
                <tr key={line.id} className="border-t align-top">
                  <th scope="row" className="px-4 py-4 text-left font-normal sm:px-6">
                    <span className="flex flex-wrap items-center gap-2 text-base font-medium">
                      {line.label}
                      {line.priorityRank !== undefined && (
                        <Badge variant="primary">
                          <StarIcon size={12} weight="fill" aria-hidden="true" />
                          {RANK_LABELS[line.priorityRank - 1]}
                        </Badge>
                      )}
                    </span>
                    {line.reason && (
                      <span className="mt-1 block text-sm text-muted-foreground">
                        {line.reason}
                      </span>
                    )}
                    {saving && (
                      <span className="mt-1 block text-sm">
                        <span className="font-medium">To save: </span>
                        {saving.idea}
                      </span>
                    )}
                    <span
                      aria-hidden="true"
                      className="mt-3 block h-1.5 rounded-full bg-primary print:hidden"
                      style={{ width: `${(line.basisPoints / largest) * 100}%` }}
                    />
                  </th>
                  <td className="px-4 py-4 text-right tabular-nums">
                    {formatShare(line.basisPoints)}
                  </td>
                  <td className="px-4 py-4 text-right font-medium tabular-nums sm:px-6">
                    {formatMoney(line.amount)}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t text-base font-semibold">
              <th scope="row" className="px-4 py-4 text-left sm:px-6">
                Total
              </th>
              <td className="px-4 py-4 text-right tabular-nums">100%</td>
              <td className="px-4 py-4 text-right tabular-nums sm:px-6">
                {formatMoney(budget.total)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="flex gap-2 text-sm text-muted-foreground">
        <InfoIcon size={18} aria-hidden="true" className="shrink-0" />
        Shares come from rules of thumb in common planning guides. Treat them as a starting point,
        not quotes.
      </p>
    </div>
  );
}
