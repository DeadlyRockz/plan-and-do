# 09 - UI / UX Design

Rules for building interfaces that look balanced and feel effortless. These build on
Tailwind / shadcn (Rule 08) and apply to every screen.

---

## 9.1 The Golden Ratio (φ ≈ 1.618)

The golden ratio is a proportion where the larger part relates to the smaller part the
same way the whole relates to the larger part: `a / b = (a + b) / a ≈ 1.618`. Used well,
it makes layouts feel naturally balanced.

- **SHOULD** use φ ≈ **1.618** as the default ratio for relating two sizes: layout
  columns, hero-vs-body, card image-vs-content, heading-vs-body text.
- **SHOULD** size a two-pane layout so the wider pane ≈ 1.618× the narrower one
  (e.g. content `62%` / sidebar `38%` - since `1/1.618 ≈ 0.618`).
- **SHOULD** build a **modular type scale** by multiplying/dividing by φ from a base.
  A softer, common variant is the **1.25 (major third)** scale - use φ for expressive,
  editorial UIs and 1.25 for dense, information-heavy UIs.
- **MAY** approximate φ with adjacent **Fibonacci numbers** (…8, 13, 21, 34, 55, 89…)
  for spacing and sizing, since consecutive Fibonacci ratios converge on φ.
- **MUST NOT** apply φ mechanically at the cost of usability. It is a starting heuristic,
  not a law - round to the spacing scale, respect touch targets, and let content and
  accessibility win when they conflict.

### Practical values

- **Type scale:** φ is applied by picking Tailwind's built-in text steps, never by writing
  sizes: `text-base` (16) → `text-2xl` (24) → `text-4xl` (36) → `text-6xl` (60) → `text-8xl` (96)
  is the nearest φ-like ladder. Softer steps: `text-base` → `text-xl` → `text-2xl` → `text-3xl`.
- **Line length:** aim for **60–75 characters** per line for body text
  (`max-w-prose`), independent of φ.
- **Golden layout split:** use Tailwind's built-in grid columns with Fibonacci spans -
  `grid-cols-8` with `col-span-5` / `col-span-3` (5/3 ≈ 1.67), or `grid-cols-12` with
  `col-span-7` / `col-span-5`.

### Example (Tailwind)

```tsx
// Golden two-column layout: main ≈ 1.618 × aside, built-in Tailwind classes only
<div className="grid grid-cols-1 md:grid-cols-8 gap-8">
  <main className="md:col-span-5">…</main>
  <aside className="md:col-span-3">…</aside>
</div>

// φ-like type ladder from Tailwind's own steps - no custom size variables
<p className="text-base">…</p>
<h3 className="text-2xl">…</h3>
<h2 className="text-4xl">…</h2>
```

---

## 9.2 Spacing, padding, and rhythm

- **MUST** use a single, consistent **spacing scale** (the Tailwind scale, or a
  4/8px base grid) - never ad-hoc pixel values (Rule 8.3).
- **MUST** adjust padding dynamically for responsive breakpoints:
  - **Containers / Page Wrappers:** `px-4 sm:px-6 lg:px-8 xl:px-12`
  - **Section Spacing:** `py-8 sm:py-12 md:py-16 lg:py-24`
  - **Card / Surface Padding:** `p-4 sm:p-6 lg:p-8`
- **SHOULD** keep vertical rhythm consistent: related items close, unrelated items far
  (proximity communicates grouping).
- **SHOULD** give content room to breathe - generous whitespace reads as quality; do not
  fill every pixel on larger screens.

## 9.3 Responsive typography

- **MUST** limit to **1–2 typefaces** and a defined set of weights.
- **MUST** scale typography fluidly across responsive breakpoints (Mobile → Tablet → Desktop):
  | Element | Mobile (`<640px`) | Tablet (`640–1024px`) | Desktop (`1024px+`) | Tailwind Example |
  | ------------------- | ------------------ | --------------------- | -------------------- | ---------------------------------- |
  | **Display / Hero** | 36px / 2.25rem | 48px / 3.0rem | 64–72px / 4.0–4.5rem | `text-4xl sm:text-5xl lg:text-7xl` |
  | **H1** | 28px / 1.75rem | 36px / 2.25rem | 48px / 3.0rem | `text-3xl sm:text-4xl lg:text-5xl` |
  | **H2** | 22px / 1.375rem | 28px / 1.75rem | 36px / 2.25rem | `text-2xl sm:text-3xl lg:text-4xl` |
  | **H3** | 18px / 1.125rem | 22px / 1.375rem | 24px / 1.5rem | `text-lg sm:text-xl lg:text-2xl` |
  | **Body** | 15–16px / 1rem | 16px / 1rem | 16–18px / 1–1.125rem | `text-base lg:text-lg` |
  | **Caption / Small** | 12–14px / 0.875rem | 14px / 0.875rem | 14px / 0.875rem | `text-xs sm:text-sm` |
- **MUST** establish a clear hierarchy (size, weight, color) so a user can scan a screen
  in seconds.
- **MUST** keep body text **≥ 16px** on mobile to prevent iOS auto-zoom on input focus.
- **MUST** adjust line-height proportionally (~1.1–1.2 for large headings, ~1.4–1.6 for body text).
- **SHOULD** constrain body text line length to 60–75 characters (`max-w-prose`).

## 9.4 Color and contrast

- **MUST** support both **Dark Mode** and **Light Mode** seamlessly across all application interfaces using semantic design tokens and CSS variables.
- **MUST** use **Green** as the primary brand and interactive accent color across all themes (e.g. Tailwind `green-700` / `green-600`, HSL `142 71% 29%`).
- **MUST NOT** use random, uncurated, or arbitrary color schemes for primary buttons, active states, focus rings, or main brand accents.
- **MUST** meet **WCAG 2.1 AA** contrast: ≥ 4.5:1 for normal text, ≥ 3:1 for large text and meaningful UI/icons.
- **MUST NOT** use color as the **only** means of conveying information (add icon, label, or pattern) - colorblind users must not be excluded.
- **SHOULD** follow a 60/30/10 visual balance: dominant base surface (60%), secondary structural surface (30%), and green primary accent (10%).
- **MUST** build the dark set to the dark-theme rules Material, Apple's HIG, and WCAG agree on,
  not by inverting the light set:
  - **one neutral ramp** in OKLCH for both modes (hue 260, chroma ≤ 0.012) - only lightness
    moves between steps; no second ramp, no HSL;
  - a **dark grey canvas, never near-black** (`--background` L 0.19), with raised surfaces
    stepping **up** in lightness (card L 0.23, popover L 0.26) and borders, not shadows, drawing
    the edges;
  - a **lighter, slightly desaturated primary** in dark mode (`oklch(0.72 0.175 150)`) with
    dark on-primary text - a darker green under white text fails 4.5:1 as link text and 3:1 as
    the active nav row on a dark surface;
  - **off-white body text** (L 0.93) and L 0.70 secondary text, not pure white;
  - `color-scheme` declared on `:root` and `.dark`, so native controls and scrollbars follow.
- **MUST NOT** write a colour in code. Every colour is a token from `globals.css`: `primary`
  for positive/healthy, `destructive` for failure, `warning` for needs-attention, `muted` for
  off, `rating` for stars, `overlay` for a modal backdrop, `chart-1` … `chart-5` for series. A
  raw palette class (`text-emerald-600`, `bg-amber-500/10`, `text-white`, `bg-black/60`) or a
  hex (`bg-[#030914]`, `fill="#157E3C"`) is a review rejection. A band that is always dark - a
  photo hero, a scrim, a footer - wraps in `dark` and uses `background` / `foreground` like any
  other surface, so it is the dark theme, not a third palette. Text on a tint sits on
  `bg-accent` (an opaque surface) so its contrast is fixed. Code that cannot read CSS (a canvas, a
  PDF, an email, a payment dialog) reads the token at runtime or carries rule 9.4's hex with a
  comment naming the token it mirrors.
- **MUST** draw chart series from `--chart-1` … `--chart-5` in slot order (green, blue, orange,
  purple, yellow), never cycled - the order is what keeps neighbouring marks apart for
  colour-blind readers, and it was validated in both modes including a donut's wrap-around pair.
- **MUST** keep the contrast table green: `packages/ui/src/styles/__tests__/theme-tokens.test.ts`
  asserts every pair above in both modes. A new token is a new row in that test.

### Theme tokens (green primary, both modes)

`packages/ui/src/styles/globals.css` is the source; this is the shape, not a second copy.

```css
:root {
  color-scheme: light;
  --background: oklch(0.975 0.003 260); /* grey canvas: white cards, buttons and inputs sit on it */
  --foreground: oklch(0.17 0.012 260);
  --card: oklch(1 0 0);
  --primary: oklch(0.521 0.135 150); /* = hsl(142 71% 29%), the brand green */
  --primary-foreground: oklch(0.985 0.002 260);
  --muted: oklch(0.955 0.004 260);
  --muted-foreground: oklch(0.5 0.015 260);
  --accent: oklch(0.97 0.03 153); /* green surface tint */
  --warning: oklch(0.52 0.155 47); /* amber-700 */
}

.dark {
  color-scheme: dark;
  --background: oklch(0.19 0.008 260); /* dark grey, not black */
  --foreground: oklch(0.93 0.006 260); /* off-white */
  --card: oklch(0.23 0.008 260); /* raised = lighter */
  --primary: oklch(0.72 0.175 150); /* lighter, desaturated green */
  --primary-foreground: oklch(0.17 0.02 150); /* dark text on it */
  --muted: oklch(0.27 0.009 260);
  --muted-foreground: oklch(0.7 0.012 260);
  --accent: oklch(0.31 0.04 152);
  --warning: oklch(0.829 0.171 81); /* amber-400 */
}
```

## 9.5 Layout, responsive breakpoints, and device targets

- **MUST** design mobile-first - base styles target mobile screens, enhanced with media queries for larger displays:
  - **Mobile:** `< 640px` (single column, full-width cards, bottom sheets or mobile drawer menus)
  - **Tablet:** `640px – 1024px` (`sm:` / `md:`: 2-column grids, collapsible sidebars)
  - **Desktop / Laptop:** `1024px – 1280px` (`lg:` / `xl:`: 3-column layouts, expanded sidebars, φ grid split)
  - **Ultra-wide:** `> 1280px` (`2xl:`: centered container with `max-w-7xl` or `max-w-full px-12`)
- **MUST** guide the eye to the primary action on each screen - one clear focal point.
- **SHOULD** align elements to the grid; consistent alignment reads as intentional.
- **SHOULD** use size, contrast, and position (top-left in LTR) to signal importance.

## 9.6 Border radii and rounded corners (responsive & nested)

- **MUST** scale border radius proportionally with surface size and screen scale:
  - **Small UI Elements (Buttons, Inputs, Badges):** `rounded-md sm:rounded-lg` (6px – 8px)
  - **Medium Elements (Cards, Dropdowns, Popovers):** `rounded-xl sm:rounded-2xl` (12px – 16px)
  - **Large Containers / Modals / Drawers:** `rounded-2xl sm:rounded-3xl lg:rounded-4xl` (16px – 32px)
  - **Full Pills / Badges / Avatars:** `rounded-full`
- **MUST** enforce the **nested border radius rule** to ensure visual symmetry:
  $$\text{Radius}_{\text{inner}} = \text{Radius}_{\text{outer}} - \text{Padding}_{\text{container}}$$
  _Example:_ If a card has an outer radius of `24px` (`rounded-3xl`) and internal padding of `16px` (`p-4`), the nested image or inner header MUST have a radius of `24 - 16 = 8px` (`rounded-lg`). If outer radius is smaller than or equal to padding, set inner radius to `0` / `rounded-none`.

## 9.7 Accessibility (non-negotiable)

- **MUST** use semantic HTML and preserve keyboard navigability and focus order.
- **MUST** provide visible focus states, `alt` text for meaningful images, and labels
  for every input.
- **MUST** keep interactive targets **≥ 44×44px** on touch devices.
- **MUST** respect `prefers-reduced-motion` for animations.

## 9.8 Interaction and feedback

- **MUST** give feedback for every action: loading, success, and error states (pair with
  Next.js `loading.tsx` / `error.tsx`, Rule 8.1).
- **SHOULD** keep animation subtle and purposeful (~150–300ms, ease-out); motion should
  clarify, not decorate.
- **MUST** make destructive actions confirmable and reversible where possible.

## 9.9 Consistency

- **MUST** reuse shared components (shadcn/ui + app components) rather than reinventing
  patterns - consistency lowers cognitive load.
- **SHOULD** keep a single place (tokens, theme, component library) that defines the look
  so the whole product stays coherent.

## 9.10 Compact density (the admin web portal)

The admin portal (`apps/web`) is a dense, information-heavy tool used all day on a laptop. It
follows a compact scale that **overrides §9.2 page/card padding, the §9.3 heading sizes, and the
§9.6 radius scale**, by setting `data-density="compact"` on `<html>`. The worker app follows
§9.12 instead.

- **MUST** use ONE corner radius on every surface: buttons, inputs, badges, chips, cards, panels,
  dialogs, sheets, and sidebar items. The portal sets `data-density="compact"` on `<html>`, which
  flattens every `rounded-sm` … `rounded-4xl` step (and plain `rounded`) to `--radius-compact`
  (`0.375rem`). Write radii as usual; the token does the flattening. `rounded-full` is only for
  true circles and bars: avatars, dots, progress tracks, switches. A chip is `rounded-md`, not a pill.
  The §9.6 nested-radius rule does not apply: a nested surface uses the same radius.
- **MUST** use ONE spacing step for surfaces: `p-4` inside every card, panel, sheet header, and
  sheet body, and `gap-4` (or `space-y-4`) between blocks and grid cells. No `p-5`/`p-6` and no
  `sm:`/`lg:` padding bumps. Tighter steps (`p-3`, `gap-2`, `gap-3`) are for the inside of a
  control or a list row, not for a surface.
- **MUST NOT** add padding to `CardHeader` / `CardContent` / `CardFooter`. The `Card` primitive
  already owns it (`py-4` on the card, `px-4` on each section, `gap-4` between them); a `p-4`,
  `pt-*` or `pb-*` on a section stacks on top and doubles the inset. Adjust a whole card with
  `size="sm"` or `[--card-spacing:...]`, never per section.

- **MUST** scroll the page inside the shell, never the window: the shell is `h-dvh overflow-hidden`
  and the body is `PageScrollArea` (`@repo/ui/components/scroll-area`), so the sidebar and mobile
  bar stay put and `PageHeader` / `StickySaveBar` pin to that box.
- **MUST** use this type scale:
  | Element | Classes |
  | --- | --- |
  | Page title (`PageHeader` h1, every screen including the dashboard) | `text-xl font-bold leading-tight` |
  | Stat / KPI value | `text-2xl font-semibold` |
  | Page description | `text-xs text-muted-foreground` |
  | Section heading / card title | `text-base font-semibold` |
  | Sheet / dialog / alert title (set by the primitive - never override it) | `text-lg font-semibold leading-tight` |
  | Form-section heading in a sheet | `text-sm font-semibold` |
  | Body, table, labels | `text-sm` (inputs stay `text-base md:text-sm` for iOS zoom, §9.3) |
  | Meta, pager, captions | `text-xs text-muted-foreground` |
- **MUST NOT** hardcode a size as an arbitrary value (`text-[11px]`, `p-[3px]`, `w-[400px]`,
  `min-h-[18rem]`), in any app. Use the standard Tailwind steps: named sizes (`text-xs`, `w-sm`,
  `max-w-xs`) or whole/half spacing steps (`p-1`, `min-h-72`), never odd fractions like `p-0.75`.
  The smallest font is `text-xs`. Only a `calc()` that no step can express stays in brackets.
- **MUST** use one control height per size step. `Button`, `Input`, and `SelectTrigger` all read
  the `--control-h*` tokens, which compact density sets to 28 / 32 / **36 (default)** / 40px for
  `xs` / `sm` / default / `lg`. Pick a `Button` `size`. **Never** override `h-*`, `size-*`, `text-*`,
  `px-*`, or `rounded-*` on a `Button` at a call site. A link that acts as a button is a
  `<Button asChild>`.
- **MUST** keep every font size on the scale above. No arbitrary sizes (`text-[10px]`,
  `text-[0.95rem]`) and no `text-lg` / `text-3xl` headings outside the sheet, dialog, and alert titles. Stat values are `text-2xl
font-semibold`. The only exception is SVG chart tick labels.
- **MUST** use the shared sidebar pieces: `SidebarNavItem` rows (36px, 16px icon, solid primary
  when active) in a 208px sidebar that folds to a 60px icon rail from the footer's
  `SidebarCollapseButton`. The layout persists the folded state through the `sidebar_state`
  cookie.
- **MUST** open every add / edit form in a right-side `Sheet`, never a centred `Dialog`: `SheetHeader`
  (title + description), the fields in `SheetBody` (it scrolls on its own), and the buttons in
  `SheetFooter`, which is styled exactly like `DialogFooter`. Width is `w-full sm:max-w-md`
  (`sm:max-w-lg` for a wide form). `Dialog` / `AlertDialog` are for confirmations and short
  read-only messages only.
- **MUST** render list data through `DataTable`. From `md` up its frame fits the screen under the
  page header, scrolls its rows under a sticky header row, scrolls wide tables sideways inside the
  frame, and truncates long text cells with a tooltip. Pass `fitToScreen={false}` only for a short
  table that should flow with the page.
- **SHOULD** use `scrollbar-thin` on any other native scroll box (a sheet body) and `ScrollArea` for
  a large scrolling region, so every scrollbar in the dashboards looks alike.

## 9.11 One border, one type scale, no arbitrary values (every app)

This applies to **every app and package** (`apps/*`, `packages/ui`), marketing pages included.
The whole product must look like one system: the same border, the same font sizes, the same
line-heights and letter-spacing everywhere.

### Borders

- **MUST** draw every border the same way: the plain `border` utility (1px) in the `border` token
  colour. Side borders use the same width (`border-b`, `border-t`, `border-l`, `border-r`).
- **MUST NOT** use any other width or colour: no `border-2`, `border-4`, `border-[1.5px]`,
  `border-gray-200`, `border-[#e5e7eb]`, or `divide-*` with a different colour. A state border uses
  a token only: `border-primary` (selected / active), `border-destructive` (error),
  `border-input` (form controls, set by the primitive).
- **MUST** take the corner radius from §9.10 (one radius on every surface) - never pick a radius
  per component.
- **MUST** draw focus with the shared `ring` token the primitives already apply - do not add a
  custom ring width or colour at a call site.

### Font size, line-height, letter-spacing

- **MUST** use only the named Tailwind steps from the type scales in §9.3 / §9.10:
  `text-xs`, `text-sm`, `text-base`, `text-lg`, `text-xl`, `text-2xl` … for size. The same element
  gets the same size on every screen (a card title is `text-base font-semibold` everywhere, a page
  title is `text-xl font-bold leading-tight` everywhere).
- **MUST** use only the named line-height steps: `leading-none`, `leading-tight`, `leading-snug`,
  `leading-normal`, `leading-relaxed`. Headings use `leading-tight`; body text keeps the size's
  default line-height (do not add a `leading-*` to body text).
- **MUST** use only the named letter-spacing steps: `tracking-tight` (large display headings only),
  `tracking-normal`, `tracking-wide` (uppercase labels / eyebrows only). Body text gets no
  `tracking-*`.
- **MUST NOT** hardcode any of these in a class name or a style: no `text-[18px]`,
  `text-[1.1rem]`, `leading-[1.15]`, `leading-[22px]`, `tracking-[-0.02em]`, `tracking-[0.2em]`,
  and no `style={{ fontSize, lineHeight, letterSpacing }}`.

### No arbitrary values anywhere in `className`

- **MUST NOT** put a hardcoded value in square brackets in any class name: sizes, spacing,
  colours, radii, borders, shadows, z-index, font sizes, line-heights, letter-spacing
  (`w-[400px]`, `p-[3px]`, `mt-[13px]`, `rounded-[10px]`, `shadow-[0_2px_8px_...]`, `z-[999]`,
  `bg-[#030914]`). Use the standard Tailwind step or the design token.
- **MUST** use Tailwind's own built-in scale for every size: spacing (`p-4`, `gap-6`, `mt-8`),
  widths/heights (`w-64`, `max-w-md`, `h-10`, `size-4`), font size (`text-sm`), radius
  (`rounded-md`), shadow (`shadow-sm`), z-index (`z-10`, `z-50`), grid (`grid-cols-8`,
  `col-span-5`). If the exact pixel value isn't a step, pick the **nearest step** - do not write
  the value by hand.
- **MUST NOT** create custom size tokens, `@theme` size variables, or `@utility` classes to stand
  in for a hand-picked value (e.g. a `--step-1: 1.618rem` or a `text-hero` at 26px). Tailwind's
  default scale is the scale. Colour tokens (§9.4) and the existing primitive tokens
  (`--radius-compact`, `--control-h*`) are the only theme variables.
- The only bracket values allowed are a `calc()` that no step can express (§9.10), the
  shadcn CSS-variable hooks the primitives define (`[--card-spacing:...]`), and the §9.10
  exception (SVG chart tick labels).
- A bracket value outside those exceptions is a **review rejection**, the same as a raw colour
  (§9.4).

```tsx
// ✗ Rejected
<h2 className="text-[18px] leading-[1.2] tracking-[-0.01em] border-2 border-gray-300 rounded-[10px]">

// ✓ Accepted
<h2 className="text-base font-semibold leading-tight">
<div className="border rounded-md">
```

## 9.12 The worker mobile app (`apps/mobile`)

React Native cannot read `globals.css` or Tailwind classes, so the app applies this rule's intent
natively (plan/02 §2.3):

- **MUST** take every colour from `apps/mobile/src/theme/tokens.ts`, the hex mirror of the
  `globals.css` tokens with each value commented with the token it mirrors. Change a colour in
  `globals.css` first, then in `tokens.ts`. No other hex or named colour in a component.
- **MUST** follow the system light/dark setting through those tokens, keep WCAG AA contrast,
  make touch targets at least 44×44, keep body text at least 16 and support system font scaling
  up to 130%, and respect reduced motion (§9.7).
- **MUST** show status with an icon and text, never colour alone (§9.4).
- **MUST** put every visible string in `src/i18n/en.ts` (plan/08 §8.5).
- **SHOULD** use the shared pieces in `src/components/ui.tsx` and spacing in steps of 4.
- **MUST** take corner radii from `radius` in `tokens.ts`, which follows §9.6, not §9.10's single
  compact radius: `radius.control` (8) for buttons and inputs, `radius.card` (12) for cards and
  callouts, `radius.full` for chips and icon badges.
- **SHOULD** start every tab screen with `ScreenHeader`, show inline status with `StatusLabel`
  (icon + text), and keep `Notice` (a tinted callout) for messages that need the worker's attention.
- Web-only patterns map to native ones: a right-side `Sheet` becomes a screen or bottom sheet,
  `DataTable` becomes a list, the sidebar becomes bottom tabs.
- Whether to adopt NativeWind is still open (plan/11 Phase 0); until then styles are
  `StyleSheet` objects built from the tokens.
