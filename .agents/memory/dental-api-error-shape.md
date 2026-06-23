---
name: API error observability (dental api-server)
description: Why mutating routes in artifacts/api-server must log their own errors, and how client error messages map HTTP status.
---

# Mutating routes must log their own errors

`artifacts/api-server` has **no custom global Express error handler**. An unhandled
rejection in a route bubbles to Express's default handler → a bare 500 with no
stack in the deployment logs. So a production-only failure (e.g. a DB error on
insert) is effectively invisible — you cannot diagnose it after the fact.

**Rule:** wrap the DB work of any mutating route in `try/catch` and
`req.log.error({ err, ... }, "message")` before returning the 500. `req.log` is
attached by `pino-http`. Keep the specific status returns (400/403/409) inside
the try so their behavior is unchanged.

**Why:** a user hit "can't add a 7th On Deck item" only in prod; code/data/schema
all checked out and dev reproduced success, but there were zero logs to confirm
the real cause. The gap was missing per-route logging, not a found bug.

# Client error-message mapping

The dental-dashboard `api()` helper throws `new Error("<status> <statusText>")`
on non-ok responses, and `fetch()` rejects with a `TypeError` (no leading status)
on network/timeout failures. Error-message mappers (e.g. `onDeckAddErrorMessage`)
should branch on `msg.startsWith("409"/"403"/"400")`, treat "no leading 3-digit
code" as a network error, and surface the status for any other code instead of a
blind "try again" — otherwise every 500/network failure looks identical to the user.

# On Deck specifics

- Cap is 7, enforced both client (`ON_DECK_CAP`) and server. `count >= cap` → 409.
  Adding the 7th (from 6) is allowed and works.
- Append uses `max(sort_order)+1` (not row count) so mid-list deletes don't create
  colliding sort_order values. There is no unique constraint on sort_order.
