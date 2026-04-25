import { definePlugin, runWorker } from "@paperclipai/plugin-sdk";
import manifest from "./manifest.js";

interface HindsightConfig {
  hindsightApiUrl: string;
  bankGranularity: "company+agent";
  autoRetain: boolean;
}

interface RecallResponse {
  results?: Array<{ id: string; text: string; type?: string | null; context?: string | null }>;
}

function bankId(companyId: string, agentId: string): string {
  return `paperclip::${companyId}::${agentId}`;
}

async function recall(baseUrl: string, bank: string, query: string): Promise<string> {
  const url = `${baseUrl}/v1/default/banks/${encodeURIComponent(bank)}/memories/recall`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, budget: "mid", max_tokens: 2048 }),
  });
  if (!res.ok) {
    throw new Error(`Hindsight recall failed: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as RecallResponse;
  const results = data.results ?? [];
  return results
    .map((r) => r.text)
    .filter(Boolean)
    .join("\n\n");
}

async function retain(
  baseUrl: string,
  bank: string,
  content: string,
  runId: string
): Promise<void> {
  const url = `${baseUrl}/v1/default/banks/${encodeURIComponent(bank)}/memories`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      async: true,
      items: [
        {
          content,
          context: "heartbeat",
          document_id: `paperclip-run-${runId}`,
          metadata: { runId, source: "paperclip-plugin" },
        },
      ],
    }),
  });
  if (!res.ok) {
    throw new Error(`Hindsight retain failed: ${res.status} ${await res.text()}`);
  }
}

const plugin = definePlugin({
  async setup(ctx) {
    ctx.events.on("agent.run.started", async (event) => {
      const config = (await ctx.config.get()) as unknown as HindsightConfig;
      if (!config?.hindsightApiUrl) return;

      const payload = event.payload as {
        agentId?: string;
        companyId?: string;
        issueId?: string;
      };
      const agentId = payload.agentId ?? event.actorId;
      const companyId = payload.companyId ?? event.companyId;
      if (!agentId || !companyId) return;

      const bank = bankId(companyId, agentId);
      const runId = event.entityId ?? "unknown";
      const issueId = payload.issueId;

      let query = `Recent heartbeat context for agent ${agentId}`;
      if (issueId) {
        try {
          const issue = await ctx.issues.get(issueId, companyId);
          if (issue?.title) {
            query = `${issue.title} — ${query}`;
          }
        } catch {
          // non-critical, fall back to generic query
        }
      }

      try {
        const memories = await recall(config.hindsightApiUrl, bank, query);
        if (memories && issueId) {
          await ctx.issues.createComment(
            issueId,
            `**[Hindsight]** Recalled memories for run \`${runId}\`:\n\n${memories}`,
            companyId
          );
        }
        ctx.logger.info("[hindsight] recall complete", {
          bank,
          runId,
          chars: memories.length,
          injected: !!(memories && issueId),
        });
      } catch (err) {
        ctx.logger.warn("[hindsight] recall failed", { bank, error: String(err) });
      }
    });

    ctx.events.on("agent.run.finished", async (event) => {
      const config = (await ctx.config.get()) as unknown as HindsightConfig;
      if (!config?.hindsightApiUrl || config.autoRetain === false) return;

      const payload = event.payload as {
        agentId?: string;
        companyId?: string;
        issueId?: string;
        status?: string;
        invocationSource?: string;
        triggerDetail?: string;
        error?: string;
      };
      const agentId = payload.agentId ?? event.actorId;
      const companyId = payload.companyId ?? event.companyId;
      if (!agentId || !companyId) return;

      const bank = bankId(companyId, agentId);
      const runId = event.entityId ?? "unknown";
      const status = payload.status ?? "finished";

      const parts = [
        `Heartbeat run ${runId} completed with status: ${status}.`,
        payload.issueId ? `Working on issue: ${payload.issueId}.` : "",
        payload.invocationSource ? `Source: ${payload.invocationSource}.` : "",
        payload.triggerDetail ? `Trigger: ${payload.triggerDetail}.` : "",
        payload.error ? `Error: ${payload.error.slice(0, 500)}` : "",
      ].filter(Boolean);

      const content = parts.join("\n");

      try {
        await retain(config.hindsightApiUrl, bank, content, runId);
        ctx.logger.info("[hindsight] retained run summary", { bank, runId });
      } catch (err) {
        ctx.logger.warn("[hindsight] retain failed", { bank, error: String(err) });
      }
    });
  },

  async onHealth() {
    return { status: "ok", message: "Hindsight plugin running" };
  },

  async onValidateConfig(config: unknown) {
    const c = config as Partial<HindsightConfig>;
    if (!c.hindsightApiUrl) {
      return { ok: false, errors: ["hindsightApiUrl is required"] };
    }
    try {
      const res = await fetch(`${c.hindsightApiUrl}/health`);
      if (!res.ok) {
        return { ok: false, errors: [`Hindsight health check failed: ${res.status}`] };
      }
    } catch (err) {
      return { ok: false, errors: [`Cannot reach Hindsight API: ${String(err)}`] };
    }
    return { ok: true };
  },
});

export default plugin;
runWorker(plugin, import.meta.url);
