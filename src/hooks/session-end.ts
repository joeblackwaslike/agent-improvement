import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { createClient, MODEL } from "../lib/anthropic.js";

interface StopHookInput {
  hook_event_name: string;
  session_id: string;
  transcript_path?: string;
  cwd?: string;
}

export function buildPrompt(transcript: string): string {
  const tail = transcript.slice(-10000);
  return `Based on this Claude session transcript, write a concise continuation note with three sections:

**In progress** (2-3 bullets): What was actively being worked on
**Next steps** (2-3 bullets): What should happen in the next session
**Unresolved** (0-2 bullets): Open decisions or blockers (omit section if none)

Be specific. Use exact file names and task descriptions where visible.

Transcript:
${tail}`;
}

export function formatContinuation(summary: string, timestamp: string): string {
  return `# Session Continuation\n\n_Generated: ${timestamp}_\n\n${summary}\n`;
}

async function main(): Promise<void> {
  const raw = readFileSync("/dev/stdin", "utf8").trim();
  if (!raw) process.exit(0);

  const input = JSON.parse(raw) as StopHookInput;
  const { cwd, transcript_path } = input;

  if (!transcript_path || !cwd) process.exit(0);

  let transcript: string;
  try {
    transcript = readFileSync(transcript_path, "utf8");
  } catch {
    process.exit(0);
  }

  const client = createClient();
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 600,
    messages: [{ role: "user", content: buildPrompt(transcript) }],
  });

  const summary =
    response.content[0].type === "text" ? response.content[0].text : "";

  const continuation = formatContinuation(summary, new Date().toISOString());
  writeFileSync(join(cwd, "_continuation.md"), continuation, "utf8");
}

if (!process.env.VITEST) {
  main().catch((err) => {
    console.error("[stop_continuation] error:", err);
    process.exit(0); // never block the session from ending
  });
}
