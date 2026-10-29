# 08: UI, UX and Accessibility

These rules follow [`engineering-rules/09-ui-ux-design.md`](../engineering-rules/09-ui-ux-design.md)
§9.1–9.9 and §9.11. Sections 9.10 and 9.12 don't apply here (see README).

## 8.1 Screens

### S1: Intake (`/`)

- A short hero: one line on what it does and one primary button, "Plan my event".
- A **3-step form** with a progress indicator ("Step 2 of 3"). Each step is a `<fieldset>`
  with a `<legend>`.
  1. **The event:** type as a radio group of 3 cards (icon and label), subtype, date and an
     optional name.
  2. **Guests and money:** guest count, budget amount and currency, "Do you already have a
     venue?" and setting.
  3. **Make it yours** (can be skipped): up to 3 priorities, dietary needs, accessibility needs,
     traditions, notes, alcohol and sustainability.
- On submit, an error summary at the top takes focus and links to each invalid field. Every field
  also shows its error inline (`aria-describedby`, `aria-invalid`).
- Below the form, a privacy line: "Your event details are sent to Anthropic's Claude API to
  generate ideas. Nothing is stored on our server."

### S2: Plan (`/plan/[id]`)

- **Header:** event name, date, a countdown ("in 136 days"), guests and budget. A mode badge
  (On track / Compressed / Urgent) shows an icon **and** text.
- **Main area** (`lg:col-span-5` of `grid-cols-8`, the golden split from Rule 9.1) holds tabs:
  - **Overview:** summary, warnings (sorted by severity) and the next 3 actions.
  - **Budget:** a table with category, %, amount and a CSS bar (`aria-hidden`; the table carries
    the numbers). It has a total row, marks priority lines, and shows modifier reasons as notes.
  - **Timeline:** milestones grouped by month, each with a checkbox. Badges mark Compressed,
    Optional and Overdue. Buttons: "Add to calendar (.ics)".
  - **Vendors:** a checklist card per vendor: why it's needed, the book-by date, questions to ask
    (in an expandable section) and Claude's tip.
  - **Ideas:** theme cards and saving ideas. States for loading (a skeleton with `aria-busy`),
    error (with retry), out of date ("Your plan changed, refresh ideas") and demo mode.
- **Aside** (`lg:col-span-3`): the "Ask the planner" chat panel. Below `lg` it becomes a button
  that opens a bottom sheet.
- **Actions:** Print / Save as PDF (a print stylesheet that shows all tabs expanded) and Delete
  (with a confirm and an undo toast).

### S3: Saved plans (`/plans`)

A list of saved plans showing name, type, date and last updated. Each can be opened or deleted.
The empty state links back to S1.

## 8.2 Design system

- **Tokens.** The OKLCH tokens in `src/app/globals.css` follow Rule 9.4 exactly: green primary,
  one neutral ramp (hue 260), a dark grey canvas (not black), surfaces that get lighter as they
  rise, and `color-scheme` declared. There are no raw colours or bracket values in any
  `className` (Rule 9.11). Each warning severity maps to a token: `primary` (info),
  `warning` (warning) and `destructive` (critical), always alongside an icon and a label.
- **Theme.** `next-themes` defaults to the system setting, and a toggle in the header switches
  it. The toggle has an accessible name.
- **Type.** One variable sans font, loaded via `next/font` (self-hosted, no layout shift; chosen
  in Phase 4). Font sizes follow the responsive scale in Rule 9.3. Body text is ≥ 16px on
  mobile, and long text is capped at `max-w-prose`.
- **Spacing and radius.** Containers use `px-4 sm:px-6 lg:px-8 xl:px-12`; cards use
  `p-4 sm:p-6 lg:p-8`. Radii follow Rule 9.6 (the non-compact rules), including the nested-radius
  rule. Every border is a plain `border` in the `border` token.
- **Components.** shadcn/ui: Button, Input, Select, RadioGroup, Checkbox, Tabs, Card, Badge,
  Sheet, AlertDialog, Toast and Skeleton. No hand-rolled versions of these.
- **Motion.** Transitions of 150–300 ms with ease-out, disabled under `prefers-reduced-motion`.

## 8.3 Responsive behaviour

| Width       | Layout                                                                                   |
| ----------- | ---------------------------------------------------------------------------------------- |
| < 640 px    | One column; tabs scroll horizontally; chat opens as a bottom sheet; full-width buttons   |
| 640–1024 px | One column with 2-column card grids (vendors, themes)                                    |
| ≥ 1024 px   | Golden split 5/8 + 3/8, with the chat in the aside                                       |
| > 1280 px   | Centred `max-w-7xl`                                                                      |

There is no horizontal page scroll at 320 px, and the layout survives 200% zoom.

## 8.4 Accessibility checklist (WCAG 2.1 AA)

- [ ] Landmarks (`header`, `nav`, `main`, `aside`, `footer`), one `h1` per page, headings in
      order, `lang="en"`, and a distinct `<title>` per route.
- [ ] A skip link to `main`, a visible focus ring on everything (the shared `ring` token), and a
      logical tab order with no keyboard traps.
- [ ] Every input has a `<label>`. Required fields say so in text, and number fields use
      `inputmode="decimal"` or `numeric`.
- [ ] Errors use `aria-invalid` and `aria-describedby`, and an error summary takes focus on
      submit.
- [ ] Tabs, dialog, sheet and radio group come from Radix (correct roles and arrow-key behaviour),
      and focus returns to the trigger on close.
- [ ] Live regions: "Ideas are ready" and each chat reply are announced (`aria-live="polite"`);
      loading regions set `aria-busy`.
- [ ] Status is never shown by colour alone: severity, mode and milestone state each pair an icon
      with text.
- [ ] Contrast is ≥ 4.5:1 for text and ≥ 3:1 for UI and large text in **both** themes.
      `theme-tokens.test.ts` checks every token pair.
- [ ] Touch targets are ≥ 44×44 px (`min-h-11`, `size-11`).
- [ ] Motion respects `prefers-reduced-motion`.
- [ ] Budget bars are `aria-hidden`, and the numbers are in real table cells with `<th scope>`.
- [ ] Automated: axe in every Playwright spec, in both themes, with **zero serious or critical**
      issues. Lighthouse accessibility score ≥ 95.
- [ ] Manual: complete the whole flow with the keyboard only, and do one VoiceOver (macOS)
      smoke pass before submitting.

## 8.5 Copy and tone

The copy is warm, short and plain, with no planning jargon. Numbers are formatted with
`Intl.NumberFormat`, using the currency's locale (`en-IN` for INR, so ₹12,00,000). Dates use
`Intl.DateTimeFormat` ("Sat, 14 Mar 2027"). Warnings say what is wrong, why, and what to do, in
that order.

## 8.6 Feedback states (Rule 9.8)

Every async action shows loading, success and error states:

- Route-level `loading.tsx` and `error.tsx`.
- AI sections recover inside their own section: the rest of the plan always stays usable.
- Deleting asks for confirmation and can be undone for 5 s.
