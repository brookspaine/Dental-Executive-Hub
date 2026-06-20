---
name: dental-dashboard api() error shape
description: How the command-center api() client signals HTTP errors and why catch-all alerts mislead users.
---

The `api()` helper in `artifacts/dental-dashboard/src/pages/command-center.tsx` throws
`new Error(`${res.status} ${res.statusText}`)` on any non-2xx. The status code is the
**prefix** of the error message, so client callers can branch with `msg.startsWith("409")`
etc. to show reason-specific messages.

**Why:** a single catch-all alert ("On Deck may be full (max 7)") was shown for *every*
failure on the On Deck add paths. A user hit it in production while On Deck held only 5
items (cap is 7) — the message was simply wrong/confusing because it blamed the cap for a
non-cap error. There is no code-level bug adding a clean task; the misleading message was
the defect.

**How to apply:** for any On Deck / cap-bearing add, (1) do a pre-action cap check against
the live fetched list length so a "full" message carries the real count, and (2) in catch,
map the status prefix to a specific message (409 full / 403 owner-not-in-business / 400
invalid / else generic). Shared helper is `onDeckAddErrorMessage(e)`. Avoid catch-all
alerts that assume one cause.
