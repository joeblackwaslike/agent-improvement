import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";

interface PostToolUseInput {
  tool_name: string;
  tool_input: Record<string, unknown>;
  tool_response: unknown;
}

function getFilePath(input: PostToolUseInput): string | null {
  const fp = input.tool_input?.file_path;
  if (typeof fp === "string" && fp.length > 0) return fp;
  return null;
}

function prettierAvailable(): boolean {
  try {
    execSync("prettier --version", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function format(filePath: string): void {
  const args = `--write --parser markdown "${filePath}"`;
  if (prettierAvailable()) {
    execSync(`prettier ${args}`, { stdio: "inherit" });
  } else {
    execSync(`npx --yes prettier ${args}`, { stdio: "inherit" });
  }
}

const raw = readFileSync("/dev/stdin", "utf8").trim();
if (!raw) process.exit(0);

const input = JSON.parse(raw) as PostToolUseInput;
const filePath = getFilePath(input);

if (!filePath || !filePath.endsWith(".md")) process.exit(0);

try {
  format(filePath);
} catch (err) {
  process.stderr.write(`[md-format] error formatting ${filePath}: ${err}\n`);
}

process.exit(0);
