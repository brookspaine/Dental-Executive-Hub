# Hub Capture — Claude.ai → Dental Executive Hub

Capture ideas into the Hub from any Claude.ai conversation. A remote MCP
endpoint (`POST /api/mcp`) exposes one write-only tool, `create_action_item`,
which files each idea as a task in the shared **Ideas** project — visible in
the Command view under both business pills, in an EDGE / Urgent Dental /
Other section Claude infers from the conversation.

**Content policy: business/ops ideas only. Never capture PHI.**

## 1. Set the token (one time)

Generate a strong token (32+ bytes):

```bash
openssl rand -hex 32
```

Set it in both places — never commit it:

- **Railway**: api-server service → Variables → add `MCP_CAPTURE_TOKEN=<token>` → redeploy.
- **Local dev**: add `MCP_CAPTURE_TOKEN=<token>` to `artifacts/api-server/.env`.

If the variable is unset the endpoint rejects everything with 401.

## 2. Register the connector in Claude.ai (one time)

1. Claude.ai → **Settings → Connectors → Add custom connector**
2. URL: `https://ceodashboard.up.railway.app/api/mcp?key=<MCP_CAPTURE_TOKEN>`
   (the token rides in the URL — Claude.ai's dialog has no bearer-token
   field and its OAuth flow doesn't apply here; leave OAuth fields empty)
3. Save, then enable the connector for your chats.

Other MCP clients that do support headers can instead use the bare URL
`https://ceodashboard.up.railway.app/api/mcp` with
`Authorization: Bearer <MCP_CAPTURE_TOKEN>` — both paths are accepted.

## 3. Use it

From any Claude.ai chat (desktop or phone):

> "Add an idea to my hub for Urgent Dental: evaluate the new sterilizer."

The idea appears in the Command view → **Ideas** project → URGENT DENTAL
section, as a normal task (priority pill, due date, On Deck / Top 3
promotion, checkbox). Ideas with no clear business land in OTHER.

Tool inputs Claude can pass: `title` (required), `detail`, `priority`
(low/normal/high), `owner`, `kr_link`, `source_ref`, `business`
(edge/urgent_dental/other).

## 4. Verify

Local smoke test (api-server running on :3001):

```bash
./scripts/test-mcp.sh          # reads the token from artifacts/api-server/.env
```

Production check: same script against the live URL —

```bash
./scripts/test-mcp.sh https://ceodashboard.up.railway.app
```

## Notes

- Rate limit: 30 requests/minute → 429.
- The endpoint is stateless (fresh MCP session per request); only POST is
  accepted.
- Rotating the token = generate a new value, update Railway + Claude.ai.
- There is deliberately no list/read tool — a leaked token cannot read Hub
  data *through this endpoint*. Be aware, however, that the Hub itself
  currently runs without login (a deliberate choice), so the rest of the API
  is not private; this endpoint's token protects the write path, not overall
  data privacy.
