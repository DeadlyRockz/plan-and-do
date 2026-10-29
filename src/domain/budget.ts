import type { EventBrief } from "./brief";
import { needsCoordinator } from "./context";
import { toMinorUnits, type Money } from "./money";
import {
  BASE_SPLITS,
  MODIFIER_LINES,
  priorityOptions,
  type BudgetLineId,
} from "./reference/budget-lines";

export type BudgetLine = {
  id: BudgetLineId;
  label: string;
  /** Share of the total in basis points, rounded for display. Amounts are the exact figures. */
  basisPoints: number;
  amount: Money;
  /** Why the rules changed this line, in the user's terms. */
  reason?: string;
  /** 1 to 3 when the user ranked this line as a priority. */
  priorityRank?: number;
};

export type Budget = { total: Money; lines: BudgetLine[] };

/** Bonus per priority rank, in basis points (plan/05 §5.3). */
export const PRIORITY_BONUS_BASIS_POINTS = [500, 300, 200] as const;

const BASIS_POINTS = 10_000n;
const MINOR_PER_MAJOR = 100n;
const DONOR_FLOOR_BASIS_POINTS = 100n;
const OWN_VENUE_KEEP_PERCENT = 20n;
const PRIORITY_REASONS = [
  "Your top priority, so it gets an extra 5% of the budget.",
  "Your second priority, so it gets an extra 3% of the budget.",
  "Your third priority, so it gets an extra 2% of the budget.",
];

type WorkingLine = {
  id: BudgetLineId;
  label: string;
  amount: bigint;
  isModifier: boolean;
  reasons: string[];
  priorityRank?: number;
};

/**
 * Splits the budget across lines (plan/05 §5.3). All maths is in integer minor units, so the
 * lines always add up to the exact total. Order: base split, then modifiers M1 to M4, then the
 * priority bonus.
 */
export function allocateBudget(brief: EventBrief): Budget {
  const totalMinor = BigInt(toMinorUnits(brief.budget.amount));
  // A whole-amount budget is split in whole currency units, so no line shows paise or cents.
  const unit = totalMinor % MINOR_PER_MAJOR === 0n ? MINOR_PER_MAJOR : 1n;
  const total = totalMinor / unit;
  const floor = (total * DONOR_FLOOR_BASIS_POINTS) / BASIS_POINTS;
  const lines = baseLines(brief, total);

  if (brief.hasVenue) applyOwnVenue(lines);
  if (brief.setting === "outdoor") addWeatherLine(lines, total, floor);
  if (needsCoordinator(brief)) {
    addModifierLine(
      lines,
      "coordinator",
      total,
      floor,
      "Above 150 guests, a day-of coordinator prevents chaos.",
    );
  }
  if (brief.accessibilityNeeds.length > 0) {
    addModifierLine(
      lines,
      "accessibility",
      total,
      floor,
      "Ramps, interpreters or a quiet room have a cost.",
    );
  }
  applyPriorities(lines, validPriorities(brief), total, floor);

  return toBudget(lines, total, unit, brief.budget.currency);
}

/**
 * Splits `total` across `weights` in proportion, exactly. Each share is floored, then the
 * leftover units go to the largest remainders. Ties go to the larger weight, then the earlier
 * entry, so the result is deterministic.
 */
export function splitProportionally(total: bigint, weights: readonly bigint[]): bigint[] {
  const weightSum = weights.reduce((sum, weight) => sum + weight, 0n);
  if (weightSum === 0n) return weights.map(() => 0n);
  const shares = weights.map((weight) => (total * weight) / weightSum);
  let leftover = total - shares.reduce((sum, share) => sum + share, 0n);
  const order = weights
    .map((weight, index) => ({ index, weight, remainder: (total * weight) % weightSum }))
    .sort(
      (a, b) =>
        compareBigInt(b.remainder, a.remainder) ||
        compareBigInt(b.weight, a.weight) ||
        a.index - b.index,
    );
  for (const { index } of order) {
    if (leftover === 0n) break;
    shares[index] = (shares[index] ?? 0n) + 1n;
    leftover -= 1n;
  }
  return shares;
}

function baseLines(brief: EventBrief, total: bigint): WorkingLine[] {
  const splits = BASE_SPLITS[brief.eventType];
  const amounts = splitProportionally(
    total,
    splits.map((split) => BigInt(split.basisPoints)),
  );
  return splits.map((split, index) => ({
    id: split.id,
    label: split.label,
    amount: amounts[index] ?? 0n,
    isModifier: false,
    reasons: [],
  }));
}

/** M1: the venue line keeps 20% for setup and permits; the rest moves to the other lines. */
function applyOwnVenue(lines: WorkingLine[]): void {
  const venue = findLine(lines, "venue");
  if (!venue) return;
  const kept = (venue.amount * OWN_VENUE_KEEP_PERCENT) / 100n;
  const freed = venue.amount - kept;
  venue.amount = kept;
  venue.label = "Setup, rentals & permits";
  venue.reasons.push("You already have a venue, so most of that money moves to other lines.");
  const recipients = lines.filter((line) => line.id !== "venue" && line.id !== "contingency");
  const shares = splitProportionally(
    freed,
    recipients.map((line) => line.amount),
  );
  recipients.forEach((line, index) => (line.amount += shares[index] ?? 0n));
}

/** M2: a weather line, taken from the venue first and then from the other lines. */
function addWeatherLine(lines: WorkingLine[], total: bigint, floor: bigint): void {
  const target = (total * BigInt(MODIFIER_LINES.weather.basisPoints)) / BASIS_POINTS;
  const venue = findLine(lines, "venue");
  const fromVenue = venue ? minBigInt(target, maxBigInt(venue.amount - floor, 0n)) : 0n;
  if (venue) venue.amount -= fromVenue;
  const others = baseDonors(lines).filter((line) => line.id !== "venue");
  const fromOthers = takeFromDonors(others, target - fromVenue, floor);
  lines.push(
    modifierLine(
      "weather",
      fromVenue + fromOthers,
      "Outdoor events need a tent or an indoor fallback.",
    ),
  );
}

/** M3 and M4: a fixed share taken in proportion from the base lines. */
function addModifierLine(
  lines: WorkingLine[],
  id: "coordinator" | "accessibility",
  total: bigint,
  floor: bigint,
  reason: string,
): void {
  const target = (total * BigInt(MODIFIER_LINES[id].basisPoints)) / BASIS_POINTS;
  const taken = takeFromDonors(baseDonors(lines), target, floor);
  lines.push(modifierLine(id, taken, reason));
}

/**
 * Priority rebalancing: ranked priorities get +5% / +3% / +2% of the total, funded in proportion
 * by every other base line except contingency. If donors hit their 1% floor, the bonus shrinks
 * rather than breaking the floor.
 */
function applyPriorities(
  lines: WorkingLine[],
  priorities: readonly BudgetLineId[],
  total: bigint,
  floor: bigint,
): void {
  const recipients = priorities
    .map((id) => findLine(lines, id))
    .filter((line): line is WorkingLine => line !== undefined);
  if (recipients.length === 0) return;

  const bonuses = recipients.map(
    (_, rank) => (total * BigInt(PRIORITY_BONUS_BASIS_POINTS[rank] ?? 0)) / BASIS_POINTS,
  );
  const donors = baseDonors(lines).filter((line) => !priorities.includes(line.id));
  const funded = takeFromDonors(
    donors,
    bonuses.reduce((sum, bonus) => sum + bonus, 0n),
    floor,
  );
  const awarded = splitProportionally(funded, bonuses);
  recipients.forEach((line, rank) => {
    line.amount += awarded[rank] ?? 0n;
    line.priorityRank = rank + 1;
    line.reasons.push(PRIORITY_REASONS[rank] ?? "");
  });
}

/**
 * Takes up to `amount` from `donors` in proportion to their size, never leaving a donor below
 * `floor`. When a donor reaches the floor, the rest comes from the others. Returns what was taken.
 */
function takeFromDonors(donors: WorkingLine[], amount: bigint, floor: bigint): bigint {
  let remaining = amount;
  let active = donors.filter((line) => line.amount > floor);
  while (remaining > 0n && active.length > 0) {
    const shares = splitProportionally(
      remaining,
      active.map((line) => line.amount),
    );
    let takenThisRound = 0n;
    active.forEach((line, index) => {
      const take = minBigInt(shares[index] ?? 0n, line.amount - floor);
      line.amount -= take;
      takenThisRound += take;
    });
    remaining -= takenThisRound;
    active = active.filter((line) => line.amount > floor);
    if (takenThisRound === 0n) break;
  }
  return amount - remaining;
}

function toBudget(
  lines: WorkingLine[],
  total: bigint,
  unit: bigint,
  currency: Money["currency"],
): Budget {
  const sorted = [...lines].sort((a, b) => compareBigInt(b.amount, a.amount));
  return {
    total: { minor: Number(total * unit), currency },
    lines: sorted.map((line) => ({
      id: line.id,
      label: line.label,
      basisPoints:
        total === 0n ? 0 : Number((line.amount * BASIS_POINTS * 2n + total) / (total * 2n)),
      amount: { minor: Number(line.amount * unit), currency },
      ...(line.reasons.length > 0 && { reason: line.reasons.join(" ") }),
      ...(line.priorityRank !== undefined && { priorityRank: line.priorityRank }),
    })),
  };
}

function validPriorities(brief: EventBrief): BudgetLineId[] {
  const options = new Set(priorityOptions(brief.eventType).map((line) => line.id));
  return [...new Set(brief.priorities)].filter((id) => options.has(id)).slice(0, 3);
}

function baseDonors(lines: WorkingLine[]): WorkingLine[] {
  return lines.filter((line) => !line.isModifier && line.id !== "contingency");
}

function modifierLine(
  id: keyof typeof MODIFIER_LINES,
  amount: bigint,
  reason: string,
): WorkingLine {
  return { id, label: MODIFIER_LINES[id].label, amount, isModifier: true, reasons: [reason] };
}

function findLine(lines: WorkingLine[], id: BudgetLineId): WorkingLine | undefined {
  return lines.find((line) => line.id === id);
}

function compareBigInt(a: bigint, b: bigint): number {
  if (a === b) return 0;
  return a > b ? 1 : -1;
}

const minBigInt = (a: bigint, b: bigint) => (a < b ? a : b);
const maxBigInt = (a: bigint, b: bigint) => (a > b ? a : b);
