# 05: Decision Engine

This is the "logical decision making based on user context" the challenge asks for. It lives in
`src/domain/`: pure TypeScript with no I/O and no AI. "Today" is passed in as an argument, so the
same brief on the same day always gives the same plan.

## 5.1 Why rules plus an LLM

| Concern                                   | Rules engine                    | Claude                                   |
| ----------------------------------------- | ------------------------------- | ---------------------------------------- |
| Money adds up exactly; dates are valid and in order | ✔ deterministic, unit tested | ✘ can make arithmetic or date slips |
| Explains *why* (auditable)                | ✔ every rule has a reason string | partly                                   |
| Creative and personal (themes, menus, cultural nuance, seasons) | ✘ | ✔                                      |
| Works with no key, costs nothing          | ✔                               | ✘                                        |

So the engine decides **what, how much and when**, and Claude adds **ideas and nuance on top of
that frame**. Claude is told that the numbers and dates are final (06 §6.3).

## 5.2 Derived context

`buildPlan(brief, today)` first derives:

| Field           | Rule                                                                                                      |
| --------------- | --------------------------------------------------------------------------------------------------------- |
| `leadTimeDays`  | `eventDate − today` in calendar days. The schema rejects values below 0                                   |
| `perGuest`      | `budget.amount / guestCount`                                                                              |
| `sizeClass`     | `intimate` ≤ 30 · `medium` 31–150 · `large` 151–400 · `very-large` > 400                                  |
| `budgetTier`    | `tight` / `moderate` / `comfortable` from `perGuest` vs. the reference costs (§5.7); `unknown` if the currency has no reference |
| `mode`          | `on-track` if lead time ≥ ideal · `compressed` if critical ≤ lead time < ideal · `urgent` if lead time < critical (§5.4) |
| `isPeakDay`     | The event date is a Friday or Saturday                                                                    |

## 5.3 Budget allocation (`budget.ts`)

All shares are integer **basis points** (1% = 100 bp) and all amounts are integer **minor units**
(paise, cents). There's no floating point in the totals.

### Base splits

| Wedding        | %  | Birthday                  | %  | Community                      | %  |
| -------------- | -- | ------------------------- | -- | ------------------------------ | -- |
| venue          | 25 | venue                     | 20 | venue (venue & permits)        | 25 |
| catering       | 30 | catering (food & cake)    | 35 | catering (food & refreshments) | 20 |
| photography    | 10 | decor                     | 12 | equipment (AV & rentals)       | 15 |
| attire         | 8  | entertainment             | 15 | marketing                      | 10 |
| decor          | 8  | invitations               | 3  | safety (first aid & insurance) | 10 |
| entertainment  | 7  | favors                    | 5  | entertainment (program)        | 8  |
| invitations    | 2  | photography               | 5  | supplies (supplies & signage)  | 5  |
| transport      | 2  | contingency               | 5  | contingency                    | 7  |
| contingency    | 8  |                           |    |                                |    |

### Context modifiers (applied in this order)

| #  | When                                   | Effect                                                                                                         | Why (shown to the user)                                       |
| -- | -------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| M1 | `hasVenue` is true                     | The venue line drops to 20% of its base and is relabelled "Setup, rentals & permits". The freed share goes to the other non-contingency lines in proportion | "You already have a venue, so most of that money moves to other lines" |
| M2 | `setting = outdoor`                    | Add a `weather` line (4%) taken from venue. If venue has too little, take it in proportion from the other lines | "Outdoor events need a tent or indoor fallback"               |
| M3 | `guestCount > 150` and not a birthday  | Add a `coordinator` line (3%) taken in proportion                                                              | "Above 150 guests, a day-of coordinator prevents chaos"       |
| M4 | any `accessibilityNeeds`               | Add an `accessibility` line (2%) taken in proportion                                                           | "Ramps, interpreters or a quiet room have a cost"             |

### Priority rebalancing

The user ranks up to 3 categories. Each gets a bonus of **+500 / +300 / +200 bp** by rank.
The bonus is funded **in proportion** by the *donor* lines: every line except the priorities,
`contingency` and the modifier lines (`weather`, `coordinator`, `accessibility`). No donor drops
below 100 bp. If a donor hits that floor, the rest of the bonus comes from the other donors. A
priority that doesn't exist for this event type is ignored.

### Rounding

1. `amount_i = floor(total × bp_i / 10 000)` in minor units.
2. Hand out the leftover minor units by the largest-remainder method, so the lines sum to the
   total exactly. Ties go to the larger line.

### Worked example (also a golden test fixture)

A wedding for 120 guests, budget ₹12,00,000, outdoor, priorities `[catering, photography]`:

| Line           | Base | After M2 | After priorities | Amount     |
| -------------- | ---- | -------- | ---------------- | ---------- |
| catering       | 30%  | 30%      | 35%              | ₹4,20,000  |
| venue          | 25%  | 21%      | 17.5%            | ₹2,10,000  |
| photography    | 10%  | 10%      | 13%              | ₹1,56,000  |
| contingency    | 8%   | 8%       | 8%               | ₹96,000    |
| attire         | 8%   | 8%       | 6.67%            | ₹80,000    |
| decor          | 8%   | 8%       | 6.67%            | ₹80,000    |
| entertainment  | 7%   | 7%       | 5.83%            | ₹70,000    |
| weather        | n/a  | 4%       | 4%               | ₹48,000    |
| invitations    | 2%   | 2%       | 1.67%            | ₹20,000    |
| transport      | 2%   | 2%       | 1.67%            | ₹20,000    |
| **Total**      |      |          | **100%**         | **₹12,00,000** |

## 5.4 Timeline (`timeline.ts`)

Each event type has a template of milestones. Each milestone has an `offset` (days before the
event; negative means after it) and a `critical` flag (★).

| Wedding (ideal 365 d, critical 45 d)        | Offset | Birthday (ideal 42 d, critical 5 d) | Offset | Community (ideal 120 d, critical 21 d) | Offset |
| ------------------------------------------- | -----: | ----------------------------------- | -----: | -------------------------------------- | -----: |
| ★ Set budget & draft guest list             | 365    | ★ Set budget, guest list & theme    | 42     | ★ Define goals, budget & core team     | 120    |
| ★ Book venue                                | 300    | ★ Book venue / confirm home setup   | 35     | ★ Apply for permits & insurance        | 100    |
| ★ Book caterer                              | 270    | Book entertainer / activities       | 28     | ★ Book venue                           | 90     |
| Book photographer / videographer            | 240    | ★ Send invitations                  | 21     | Recruit volunteers                     | 75     |
| Book music / entertainment                  | 210    | ★ Order cake                        | 14     | Secure sponsors & vendors              | 60     |
| Order attire                                | 180    | Plan menu / order food              | 10     | ★ Launch promotion                     | 45     |
| Send save-the-dates                         | 180    | Buy decor & favours                 | 7      | ★ Safety & accessibility plan          | 30     |
| Book decor / florist                        | 150    | ★ Confirm RSVPs & dietary needs     | 5      | ★ Confirm vendors, AV & rentals        | 14     |
| Arrange transport & guest stay              | 120    | Prep & set up                       | 1      | Volunteer briefing                     | 7      |
| ★ Send invitations                          | 60     | ★ Event day                         | 0      | Set up                                 | 1      |
| Hair & make-up trial                        | 45     | Thank-you messages                  | −3     | ★ Event day                            | 0      |
| Menu tasting & final menu                   | 30     |                                     |        | Debrief & impact report                | −7     |
| ★ Final headcount to caterer                | 14     |                                     |        |                                        |        |
| ★ Confirm all vendors & day-of schedule     | 7      |                                     |        |                                        |        |
| ★ Event day                                 | 0      |                                     |        |                                        |        |
| Thank-you notes & settle payments           | −14    |                                     |        |                                        |        |

**Milestones added by context** (inserted in offset order):

| When                     | Milestone                                       | Offset (W / B / C) |
| ------------------------ | ----------------------------------------------- | ------------------ |
| `setting = outdoor`      | Weather backup plan (tent / indoor fallback)    | 30 / 7 / 30        |
| any accessibility need   | Confirm accessibility arrangements with venue   | 60 / 7 / 30        |
| M3 applies (> 150 guests) | Hire day-of coordinator                        | 90 / n/a / 90      |

### Scheduling algorithm

Let `L = leadTimeDays`.

1. **On track (L ≥ ideal).** `due = eventDate − offset` for every milestone.
2. **Compressed (L < ideal).** Late milestones stay at their ideal offsets; only the ones that
   no longer fit get squeezed:
   - `K` = the milestones with `offset > L`, in order. These are already late.
   - `anchor` = the largest offset that is still `≤ L` (event day guarantees one exists).
   - Spread the `K` milestones evenly across `[anchor, L]`:
     `offset'_i = L − floor(i × (L − anchor) / |K|)`, for `i = 0…|K|−1`.
   - Mark each one `compressed: true`. The first is due **today**.
3. **Urgent (L < critical).** Apply step 2, then mark every non-critical milestone
   `optional: true`. The UI groups those under "If time allows".
4. Post-event milestones (negative offsets) are never moved.

*Example:* a wedding 136 days away (2026-10-29 → 2027-03-14). The 8 milestones from 365 d to
150 d are squeezed into days 136 → 122, two days apart. "Book venue" moves from 300 to 134 days
before, so it's due **2026-10-31**. "Send invitations" stays at 60 days before.

**Invariants (tested):** offsets never increase down the list; no pre-event milestone is due
before today; the template's relative order is kept; post-event offsets don't change.

## 5.5 Vendor & service checklist (`vendors.ts`)

Each catalog entry has an `id`, an inclusion condition, the budget line it draws on, the milestone
that sets its **book-by** date, a one-line *why*, and 3–5 standard questions to ask. Claude adds a
personal tip per vendor on top (06 §6.4).

| id                       | Included when                                                       | Budget line    | Book-by milestone              |
| ------------------------ | ------------------------------------------------------------------- | -------------- | ------------------------------ |
| `venue`                  | `!hasVenue`                                                         | venue          | Book venue                     |
| `caterer`                | wedding; birthday or community with > 20 guests                     | catering       | Book caterer / Plan menu       |
| `baker`                  | wedding, birthday                                                   | catering       | Order cake / Menu tasting      |
| `photographer`           | wedding; or `photography` is a priority                             | photography    | Book photographer              |
| `entertainment`          | wedding; adult or milestone birthday; community                     | entertainment  | Book music / entertainer       |
| `kids-entertainer`       | birthday with subtype `child`                                       | entertainment  | Book entertainer / activities  |
| `decor`                  | wedding, birthday                                                   | decor          | Book decor / Buy decor         |
| `attire-beauty`          | wedding                                                             | attire         | Order attire                   |
| `officiant`              | wedding                                                             | n/a            | Book venue                     |
| `stationery`             | wedding, birthday                                                   | invitations    | Send invitations               |
| `transport`              | wedding with > 100 guests                                           | transport      | Arrange transport              |
| `permits`                | community; or outdoor in a public place; or community serving alcohol (adds a liquor licence) | venue | Apply for permits      |
| `insurance`              | community; or wedding with > 150 guests                             | safety / contingency | Apply for permits      |
| `av-rentals`             | community; or > 100 guests                                          | equipment / entertainment | Confirm vendors, AV |
| `security`               | > 300 guests; or community with > 150 guests                        | safety         | Confirm vendors                |
| `first-aid`              | community; or > 150 guests                                          | safety         | Safety plan                    |
| `weather-cover`          | `setting = outdoor`                                                 | weather        | Weather backup plan            |
| `accessibility-services` | any accessibility need                                              | accessibility  | Confirm accessibility          |
| `coordinator`            | M3 applies                                                          | coordinator    | Hire day-of coordinator        |
| `waste-recycling`        | community; or `sustainability`                                      | supplies / contingency | Confirm vendors        |

Sample questions for `caterer`: Can every dish be labelled for the dietary needs we listed? What
is the per-plate price at our headcount, and what's included (staff, crockery, tax)? When is the
final headcount due? What's the cancellation policy?

The rules also personalise the questions. If `dietaryNeeds` is set, the caterer's first question
names each need. If `accessibilityNeeds` is set, the venue's first question asks about step-free
access, accessible toilets and seating.

## 5.6 Warnings and suggestions (`warnings.ts`)

Each warning has an `id`, a `severity` (`info` · `warning` · `critical`), a `title`, a `reason`
that quotes the user's own numbers, and a **computed** `suggestion`.

| id                    | Fires when                                         | Severity | Computed suggestion                                                                              |
| --------------------- | -------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------ |
| `budget-tight`        | `budgetTier = tight`                               | critical | "Raise the budget to `comfortable × guests`, or cut guests to `floor(budget / comfortable)`"     |
| `budget-moderate`     | `budgetTier = moderate`                            | info     | "Your top priorities are protected; consider trimming `<largest donor line>`"                    |
| `off-peak-saving`     | tight or moderate **and** `isPeakDay`              | info     | "A Sunday–Thursday date often lowers venue cost; the nearest one is `<date>`"                    |
| `timeline-compressed` | `mode = compressed`                                | warning  | "`n` milestones were compressed; book `<first 3 critical>` this week"                            |
| `timeline-urgent`     | `mode = urgent`                                    | critical | "Focus on the `n` critical steps; `m` optional ones are under 'If time allows'"                  |
| `outdoor`             | `setting = outdoor`                                | info     | "A weather line of `<amount>` is reserved; settle a fallback by `<date>`"                        |
| `large-event`         | `sizeClass` is `large` or `very-large`             | warning  | "Plan crowd flow, security and permits; these are on your checklist"                             |
| `dietary-scale`       | `dietaryNeeds` set **and** guests > 50             | info     | "Ask the caterer to label every dish and to count each dietary need on the RSVP"                 |

Severity is always shown with an icon **and** a text label, never colour alone (Rule 9.4).

## 5.7 Reference costs (`reference/costs.ts`)

These are rough per-guest figures used **only** to set `budgetTier`. They are labelled as
assumptions in the UI and README, and can be edited in this one file.

| Currency | Wedding tight / comfortable | Birthday tight / comfortable | Community tight / comfortable |
| -------- | --------------------------: | ---------------------------: | ----------------------------: |
| INR      | 1,500 / 4,000               | 400 / 1,200                  | 150 / 500                     |
| USD      | 100 / 250                   | 15 / 40                      | 5 / 20                        |
| EUR      | 90 / 230                    | 15 / 40                      | 5 / 20                        |
| GBP      | 80 / 200                    | 12 / 35                      | 4 / 15                        |

Below `tight`, the tier is `tight`; from `tight` up to `comfortable` it is `moderate`; at or
above `comfortable` it is `comfortable`. Any other currency gives `unknown`: no budget warning
fires, and Claude comments on the budget in words.

## 5.8 Output: `PlanSkeleton`

```ts
type PlanSkeleton = {
  context: { leadTimeDays: number; perGuest: Money; sizeClass: SizeClass;
             budgetTier: BudgetTier; mode: PlanMode; isPeakDay: boolean };
  budget: { total: Money; lines: BudgetLine[] };   // BudgetLine: id, label, bp, amount, reason?, isPriority
  milestones: Milestone[];                          // id, title, due (YYYY-MM-DD), critical, compressed, optional
  vendors: VendorItem[];                            // id, label, why, bookBy, budgetLineId, questions[]
  warnings: Warning[];                              // id, severity, title, reason, suggestion
};
```

The full list of invariants and test names is in 10 §10.3.
