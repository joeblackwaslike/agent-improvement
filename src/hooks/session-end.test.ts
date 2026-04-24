import { describe, it, expect } from "vitest";
import { formatContinuation, buildPrompt } from "./session-end.js";

describe("formatContinuation", () => {
  it("wraps summary in continuation markdown with timestamp", () => {
    const result = formatContinuation("- Did X\n- Next: Y", "2026-04-23T12:00:00.000Z");
    expect(result).toContain("# Session Continuation");
    expect(result).toContain("2026-04-23T12:00:00.000Z");
    expect(result).toContain("- Did X");
    expect(result).toContain("- Next: Y");
  });
});

describe("buildPrompt", () => {
  it("includes the transcript tail in the prompt", () => {
    const prompt = buildPrompt("some transcript content here");
    expect(prompt).toContain("some transcript content here");
    expect(prompt).toContain("In progress");
    expect(prompt).toContain("Next steps");
  });

  it("truncates very long transcripts to last 10000 chars", () => {
    const long = "x".repeat(20000);
    const prompt = buildPrompt(long);
    expect(prompt).toContain("x".repeat(100));
    expect(prompt.length).toBeLessThan(15000);
  });
});
