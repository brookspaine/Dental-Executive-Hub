---
name: Command Center business scoping
description: All /api/command-center/* requests must send x-business-id or they silently hit business 1.
---

The Command Center data (cc_top3, cc_on_deck, direct-reports, projects, tasks, life-areas) is scoped per business on the server via the `x-business-id` header; when the header is absent the server defaults to business 1.

**Rule:** Any client request to `/api/command-center/*` must send `x-business-id` from the `cc-business` localStorage key (default 1). The Command Center page does this through its shared `api()` helper. Other pages that reuse Command Center components or call those endpoints with raw `fetch` (e.g. the Ideal Week page's `useCcTop3` / `useOnDeck`) must send the same header.

**Why:** If reads use raw `fetch` (no header → business 1) while writes go through `api()` (header → business N), reads and writes diverge — edits appear not to save and state looks inconsistent. This is invisible while only business 1 is selected.

**How to apply:** When sharing planner components (Top3Card, OnDeckCard) across pages, make every read hook on the consuming page send `x-business-id` too, not just the writes.
