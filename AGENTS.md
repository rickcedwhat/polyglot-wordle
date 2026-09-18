# Local Dev Dashboard — Agent Protocol

**Protocol version: 1**

Tool-agnostic (Cursor, Antigravity, Claude Code, Copilot Chat, etc.). Canonical copy lives on the dashboard — **pull it**, don’t rely on pasted prompts staying fresh.

## Session start (required)

```bash
curl -sS http://localhost:4000/api/agent-protocol
```

1. Read `protocol` + `instructions`.
2. Write `instructions` to **`AGENTS.md`** in this project root (optional: also mirror to your editor’s rules file).
3. Use that `protocol` number on every later dashboard POST.

If any dashboard response has `"stale": true`, repeat this pull, update `AGENTS.md`, then retry with the new protocol. Do **not** expect full instructions in the stale POST body — only `protocolUrl` / `message`.

Dashboard: `/Users/cedrick/Documents/Projects/local-dev-dashboard`  
Base URL: `http://localhost:4000`

---

## Register a project

```bash
node "/Users/cedrick/Documents/Projects/local-dev-dashboard/register.mjs" "<Project Name>" "<absolute-directory>" <port>
```

Or:

```bash
curl -sS -X POST http://localhost:4000/api/register \
  -H 'Content-Type: application/json' \
  -d '{"protocol":1,"name":"Project Name","directory":"/absolute/path","port":5180}'
```

Confirm name, directory, and port after registering.

---

## Agent activity (required when working on a PR)

Tell the dashboard when you **start** and **finish** work so the card shows “agent working” and humans don’t interrupt mid-fix.

### Start

```bash
curl -sS -X POST http://localhost:4000/api/agent-activity \
  -H 'Content-Type: application/json' \
  -d '{
    "protocol": 1,
    "phase": "start",
    "directory": "/absolute/path/to/this/project",
    "pr": 129,
    "summary": "Fixing CodeRabbit actionable comments",
    "agent": "cursor"
  }'
```

Use `"agent": "antigravity"` / `"claude-code"` / etc. when relevant. Identify the project with `directory` (preferred), `projectId`, or `repo`.

### Heartbeat (optional)

Send another `phase: "start"` with an updated `summary` during long sessions so activity doesn’t auto-expire (~45 minutes).

### Finish

```bash
curl -sS -X POST http://localhost:4000/api/agent-activity \
  -H 'Content-Type: application/json' \
  -d '{
    "protocol": 1,
    "phase": "finish",
    "directory": "/absolute/path/to/this/project",
    "summary": "CR comments addressed; waiting on CI"
  }'
```

---

## Manual projects.json shape (rare)

```json
{
  "id": "my-project",
  "name": "My Project",
  "directory": "/Users/cedrick/Documents/Projects/my-project",
  "description": "Short description",
  "services": [
    {
      "id": "my-project-dev",
      "name": "Dev Server",
      "command": "npm",
      "args": ["run", "dev", "--", "--port", "5180"],
      "port": 5180,
      "url": "http://localhost:5180"
    }
  ]
}
```

The dashboard hot-reloads `projects.json`.
