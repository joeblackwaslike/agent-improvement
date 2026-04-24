import { describe, it, expect, vi } from "vitest";

vi.mock("@anthropic-ai/sdk", () => ({
  default: vi.fn().mockImplementation(() => ({ messages: {} })),
}));

import { createClient } from "./anthropic.js";

describe("createClient", () => {
  it("returns an Anthropic instance", () => {
    const client = createClient();
    expect(client).toBeDefined();
    expect(client.messages).toBeDefined();
  });

  it("throws if ANTHROPIC_API_KEY is missing", () => {
    const original = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    expect(() => createClient()).toThrow("ANTHROPIC_API_KEY is not set");
    if (original !== undefined) process.env.ANTHROPIC_API_KEY = original;
  });
});
