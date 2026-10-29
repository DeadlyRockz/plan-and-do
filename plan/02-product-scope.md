# 02: Product Scope

## 2.1 Personas

| Persona                  | Situation                                                                                            | What they need most                                                     |
| ------------------------ | ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| **First-time host**      | Planning a wedding or a milestone birthday with no professional planner. Has never run an event this size | What to do and when; where the money should go; which vendors to book |
| **Community organiser**  | A volunteer running a fundraiser, festival, clean-up or meetup                                        | Permits, safety, volunteers, promotion, a defensible budget             |
| **Busy parent**          | A child's birthday party in 2–3 weeks                                                                 | A short, realistic to-do list and fun ideas that fit a small budget     |

## 2.2 User stories and acceptance criteria

| ID  | As a…              | I want to…                                               | Accepted when…                                                                                                                         |
| --- | ------------------ | -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| U1  | any user           | describe my event in under 2 minutes                     | The 3-step form needs 6 required fields at most; step 3 (preferences) can be skipped                                                   |
| U2  | any user           | see a budget split that fits my priorities               | The lines add up to the exact total; my top 3 priorities get a bigger share; every line shows its % and amount                         |
| U3  | any user           | get a timeline that works back from my date              | Milestones are dated, in order, and none falls before today. If time is short, I'm told and the plan is compressed sensibly            |
| U4  | any user           | know which vendors to book, by when, and what to ask      | Each vendor shows *why* it's included, a book-by date and 3–5 questions to ask                                                          |
| U5  | any user           | get ideas that feel made for my event                    | 2–3 themes that reflect my traditions, dietary and accessibility needs, setting, season and budget tier                                 |
| U6  | any user           | be warned about problems early                           | A tight budget, a rushed timeline, or a large or outdoor event each raises a warning with the reason and a concrete suggestion          |
| U7  | any user           | change the plan by just saying so                        | "We're now 80 guests and the budget is ₹6 lakh" updates the brief, recalculates the plan and explains what changed                     |
| U8  | any user           | keep track and come back later                           | Checkboxes on milestones and vendors persist; plans are saved in my browser and listed on `/plans`                                     |
| U9  | any user           | take the plan with me                                    | Milestones export to `.ics` (calendar), and the plan prints cleanly or saves as PDF                                                    |
| U10 | keyboard or screen-reader user | do all of the above without a mouse          | The full flow works with the keyboard only; axe reports zero serious or critical issues                                                |

## 2.3 MVP features (must ship)

| ID  | Feature                                                                                    | Stories      |
| --- | ------------------------------------------------------------------------------------------ | ------------ |
| F1  | 3-step intake form with inline validation and an error summary                             | U1, U10      |
| F2  | Rules-based budget allocation with priority rebalancing and context modifiers              | U2           |
| F3  | Back-scheduled timeline with compressed and urgent modes                                   | U3           |
| F4  | Vendor checklist driven by conditions, with book-by dates and questions                    | U4           |
| F5  | Warnings engine with computed suggestions                                                  | U6           |
| F6  | Claude ideas: themes, food, activities, vendor tips, savings, considerations               | U5           |
| F7  | Refine chat that edits the brief through tool use                                          | U7           |
| F8  | Progress checkboxes and saved plans (localStorage)                                         | U8           |
| F9  | `.ics` export and a print stylesheet                                                       | U9           |
| F10 | Mock AI mode, so the app runs with no key                                                  | evaluators   |
| F11 | Dark and light themes, responsive from 320px                                               | U10          |

## 2.4 Stretch (only after the MVP passes every check in 12)

- S1: Edit the budget table inline (change one line, the others rebalance).
- S2: Ideas streamed in as they generate, instead of appearing all at once.
- S3: JSON export and import of a plan.
- S4: Ideas written in the user's language (Hindi, Tamil and so on), keeping numbers and dates
  in their locale format.
- S5: A guest-list helper (count RSVPs, dietary tally).

## 2.5 Out of scope

- Booking, payments, or contacting vendors.
- **Named real-world vendors or live prices.** We have no trustworthy data source, and an LLM
  would invent them. We describe the *kind* of vendor and what to ask instead.
- User accounts, server-side storage, or sharing a plan with other people.
- A native mobile app (the web app is responsive instead).

## 2.6 Assumptions (copied into the README)

1. The user is a planner, not a guest; one person plans one event at a time.
2. A plan lives in one browser. Clearing site data deletes it, and the UI says so.
3. Budget splits and per-guest reference costs are rough rules of thumb taken from common
   planning guides. They are a starting point, not quotes, and can be edited in one file
   (05 §5.7).
4. Reference costs exist for INR, USD, EUR and GBP. For any other currency, the budget-tier check
   is skipped and Claude comments on the budget in words instead.
5. Dates are calendar dates in the user's local timezone; times of day aren't modelled.
6. The event details the user types are sent to Anthropic's Claude API to generate ideas. The UI
   and README say so. We never ask for names of private people, phone numbers or street
   addresses.
7. The rate limiter runs in memory, so its limits apply per server instance. That is fine for a
   single-instance demo (09 §9.4).
