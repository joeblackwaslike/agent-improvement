#!/usr/bin/env tsx
/**
 * Merges MCP server entries (Claude Code JSON format) into a Codex config.toml.
 *
 * Usage: tsx src/lib/aip/toml-merge.ts <toml-file> '<json-content>'
 *
 * <json-content> must be a JSON object of server-name → config pairs — the value
 * of the `mcpServers` key in Claude Code's settings.json. Existing entries in the
 * TOML file are preserved (not overwritten). Creates the file if absent.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";

interface ServerConfig {
  type?: string;
  url?: string;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  headers?: Record<string, string>;
  enabled?: boolean;
}

function tomlString(value: unknown): string {
  if (typeof value === "string") {
    return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  }
  if (typeof value === "boolean") return value.toString();
  if (typeof value === "number") return value.toString();
  if (Array.isArray(value)) return `[${value.map(tomlString).join(", ")}]`;
  if (value !== null && typeof value === "object") {
    const pairs = Object.entries(value as Record<string, unknown>)
      .map(([k, v]) => `${k} = ${tomlString(v)}`)
      .join(", ");
    return `{ ${pairs} }`;
  }
  return String(value);
}

function extractEnvVar(headerValue: string): string | null {
  const m = headerValue.match(/\$\{?([A-Z_][A-Z0-9_]*)\}?/);
  return m ? m[1] : null;
}

function serverToToml(name: string, cfg: ServerConfig): string {
  const lines: string[] = [`[mcp_servers.${name}]`];

  if (cfg.url) {
    lines.push(`url = ${tomlString(cfg.url)}`);
    const auth = cfg.headers?.["Authorization"] ?? cfg.headers?.["authorization"];
    if (auth) {
      const envVar = extractEnvVar(auth);
      if (envVar) lines.push(`bearer_token_env_var = ${tomlString(envVar)}`);
    }
  } else if (cfg.command) {
    lines.push(`command = ${tomlString(cfg.command)}`);
    if (cfg.args?.length) lines.push(`args = ${tomlString(cfg.args)}`);
    if (cfg.env && Object.keys(cfg.env).length > 0) {
      lines.push(`env = ${tomlString(cfg.env)}`);
    }
    lines.push(`enabled = ${cfg.enabled === false ? "false" : "true"}`);
  }

  return lines.join("\n");
}

function main(): void {
  const [, , tomlFile, jsonContent] = process.argv;
  if (!tomlFile || !jsonContent) {
    process.stderr.write(
      "Usage: tsx src/lib/aip/toml-merge.ts <toml-file> '<json-content>'\n",
    );
    process.exit(1);
  }

  const servers = JSON.parse(jsonContent) as Record<string, ServerConfig>;
  const existing = existsSync(tomlFile) ? readFileSync(tomlFile, "utf8") : "";
  const newSections: string[] = [];

  for (const [name, cfg] of Object.entries(servers)) {
    if (existing.includes(`[mcp_servers.${name}]`)) {
      process.stderr.write(`  skip: ${name} already present in ${tomlFile}\n`);
      continue;
    }
    newSections.push(serverToToml(name, cfg));
  }

  if (newSections.length === 0) {
    process.stderr.write("  nothing new to merge\n");
    return;
  }

  const separator =
    existing.length > 0 && !existing.endsWith("\n\n") ? "\n\n" : "";
  writeFileSync(
    tomlFile,
    existing + separator + newSections.join("\n\n") + "\n",
  );
  process.stderr.write(
    `  merged ${newSections.length} server(s) into ${tomlFile}\n`,
  );
}

main();
