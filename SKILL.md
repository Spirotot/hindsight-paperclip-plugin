---
name: hindsight-integrations.paperclip
description: Auto-recall relevant memories from Hindsight on heartbeat start; auto-retain session findings on heartbeat completion. Connects to a self-hosted Hindsight server. (plugin)
---

# Hindsight Memory Plugin

Provides automatic memory recall and retention as part of the Paperclip agent lifecycle.

- **On heartbeat start**: recalls relevant memories from the agent's Hindsight bank and injects them into agent context.
- **On heartbeat completion**: retains key session findings back to the Hindsight bank.

## Configuration

| Parameter | Type | Default | Description |
|---|---|---|---|
| `hindsightApiUrl` | string | `http://192.168.5.217:18888` | Base URL for the self-hosted Hindsight API |
| `bankGranularity` | `"company+agent"` | `"company+agent"` | Bank ID pattern: `paperclip::{companyId}::{agentId}` |
| `autoRetain` | boolean | `true` | Retain session context after heartbeat completion |

## Bank ID Pattern

With `bankGranularity: "company+agent"`:

```
paperclip::{companyId}::{agentId}
```

Example for CEO agent:
```
paperclip::bcfddd32-18d2-4045-a4a9-f486c01840cc::a889bed4-5d00-47a1-95cb-84f1d8ca5a70
```
