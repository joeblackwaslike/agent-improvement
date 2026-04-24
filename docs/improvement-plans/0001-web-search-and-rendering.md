---
num: "0001"
title: "Web Research: Expert Search Routing + Rendering Escalation"
area: search
status: approved
priority: high
effort: small
impact: high
created: 2026-04-23
updated: 2026-04-23
tags: [search, browser, mcp, routing, webfetch]
depends-on: []
related: []
---

## Summary

Claude automatically routes every web research and page-fetch task to the best available tool based on query type, eliminating shallow search results and silent SPA rendering failures. Users never need to specify a tool — the routing is invisible.

## Problem

Two distinct silent failures degrade research quality without surfacing any error:

1. **Search quality** — `webSearch` uses a generic search API. For niche technical queries (library internals, obscure bugs, RFCs, implementation patterns) results are shallow or off-target. Claude silently returns poor-quality citations. The user has no visibility into which tool was used or why.

   - Given: "pydantic-ai validator context kwarg type" → Expected: docs/source showing exact signature → Actual: generic blog posts or unrelated results
   - Given: "python 3.12 TypeVarTuple PEP 646 variance rules" → Expected: PEP or CPython source → Actual: introductory tutorial

2. **Dynamic page rendering** — `webFetch` is a plain HTTP GET. SPAs (React, Next.js, Vue, Angular) respond with an unhydrated HTML skeleton — JavaScript-injected content never loads. Claude treats the skeleton as the page content with no error, no warning.

   - Given: fetch `nextjs.org/docs/app` → Expected: full doc content → Actual: `<div id="__next"></div>` (3 chars of body text)
   - Given: fetch `react.dev/reference/react/useState` → Expected: API reference → Actual: empty shell

## Options

Search tools:

| Option | Description | Pros | Cons | Best for |
| --- | --- | --- | --- | --- |
| Exa web_search | Semantic + keyword hybrid; 1B+ embeddings | Best niche technical; 94.9% SimpleQA accuracy; 2–3× faster than Tavily on complex retrieval | Retrieval only, no synthesis | Technical research, code patterns |
| Exa get_code_context | Specialized code index | Token-succinct code excerpts; finds OSS usage examples | Code-only scope | Finding implementation examples in OSS |
| Exa deep_researcher | Multi-step long-running research with synthesis | Exhaustive structured reports | Slow (p50 ~45–90s); expensive ($12–15/1K requests) | Deep multi-source investigations |
| Exa company_research | Structured company data (70M+ companies) | Rich structured output | Narrow scope | Company and product research |
| Context7 | 33K+ OSS library docs indexed | Cached; fast; version-specific queries | Periodic indexing; code snippets only, no prose | Known library/framework docs |
| Ref | Broader docs + private repos + PDFs | Full content (prose + code); adaptive token use; private repo support | Slower than Context7 for cached libs | API reference, private docs, PDFs |
| Perplexity Sonar | LLM-synthesized answers with citations | Synthesized answer directly; citation tokens free | Answer-focused, not raw retrieval; less source control | "What is the current state of X?" |
| Perplexity Deep Research | Exhaustive multi-source synthesis | Most thorough synthesis available | High latency; expensive | Literature reviews, complex comparisons |
| Tavily | AI-optimized RAG search with real-time coverage | Strong news coverage; structured for RAG; fast integration | Less semantic depth than Exa | News, announcements, time-sensitive queries |
| Brave Search | Independent index, 30B+ pages | Privacy-first; no Big Tech dependency; $0.10/100 queries | Not optimized for agent use; smaller ecosystem | When independence from Google/Bing matters |
| Built-in webSearch | Default tool | Zero config | Generic API; shallow niche results | Last resort only |
| ~~Google CSE~~ | Programmable Search Engine | n/a | Deprecated — closed to new customers (sunset Jan 2027) | Do not use |

Rendering/fetch tools (lightest → heaviest):

| Option | Description | Pros | Cons | Best for |
| --- | --- | --- | --- | --- |
| webFetch | Plain HTTP GET | Zero overhead; instant | Fails on SPAs | Static sites, REST APIs, RSS |
| superpowers-chrome | `mcp__plugin_superpowers-chrome_chrome__use_browser` | Lower token cost than headless browser | Less capable than Playwright | First JS-rendering fallback |
| Playwright MCP | Full headless Chromium browser | Handles any SPA; most capable | High token cost | When superpowers-chrome is insufficient |
| Chrome DevTools MCP | Chrome CDP-based browser control | Similar capability to Playwright | High token cost | Alternative to Playwright MCP |
| Firecrawl | Scrape + structured extraction + browser interaction | JSON schema extraction; handles login/form/pagination | Expensive (1–9 credits/page); no credit rollover | Structured data from specific known URLs only |

## Decision

**Core principle**: Claude is the routing expert — the user never specifies a tool. Routing is invisible.

Search routing by query classification:

- Library/framework docs, version-specific API questions → Context7 (`mcp__context7__query-docs`) → Ref as fallback for prose or private repos (`mcp__Ref__ref_search_documentation`)
- Niche technical, code patterns, implementation examples → Exa web_search (`mcp__exa__web_search_exa`) or get_code_context (`mcp__exa__get_code_context_exa`)
- Synthesis / "current state of X" / comparisons → Perplexity Sonar if connected; otherwise Exa + synthesize
- Exhaustive multi-source investigation → Exa deep_researcher (`mcp__exa__deep_researcher_start`)
- News, announcements, time-sensitive → Tavily if connected; otherwise Exa with recency filter
- Company or product research → Exa company_research (`mcp__exa__company_research_exa`)
- General/broad web → Exa or Tavily
- Last resort → built-in `webSearch` + emit visible note: "(using fallback search — results may be less targeted)"

Rendering escalation (automatic, in token-cost order):

1. `webFetch` — always first
2. If body is < ~200 chars of real text or matches SPA skeleton patterns (`<div id="root">`, `<div id="app">`, `<div id="__next">` with empty body) → escalate
3. `superpowers-chrome` next
4. If still insufficient → Playwright MCP or Chrome DevTools MCP
5. Firecrawl only when: structured JSON extraction required, or browser interaction needed (login, forms, pagination). Never for general search.

CLAUDE.md targeting: routing rules apply across all projects → global `~/.claude/CLAUDE.md`. Project-specific tool preferences → project `CLAUDE.md`.

Rejected: hook wrapper intercepting webFetch — harder to debug, doesn't improve search quality, adds indirection. Rejected: exposing routing choices to user — user shouldn't need to be an expert in these tools.

## Acceptance Criteria

- [ ] A niche technical query (e.g., "pydantic-ai validator context kwarg type") routes to Exa without the user specifying any tool
- [ ] A library doc query (e.g., "Next.js 15 `use server` directive") routes to Context7 or Ref
- [ ] A synthesis query (e.g., "current state of AI agent memory in 2026") routes to Perplexity Sonar if connected, or Exa otherwise
- [ ] Fetching a known SPA (`nextjs.org/docs/app`) escalates past webFetch and returns hydrated content
- [ ] `webFetch` is always attempted before superpowers-chrome
- [ ] Falling back to built-in webSearch surfaces a visible note to the user
- [ ] Firecrawl is never invoked for general search queries

## Requirements

**Already satisfied:**

- Exa MCP: `mcp__exa__web_search_exa`, `mcp__exa__get_code_context_exa`, `mcp__exa__deep_researcher_start`, `mcp__exa__deep_researcher_check`, `mcp__exa__company_research_exa`
- Context7: `mcp__context7__query-docs`
- Ref: `mcp__Ref__ref_search_documentation`, `mcp__Ref__ref_read_url`
- superpowers-chrome: `mcp__plugin_superpowers-chrome_chrome__use_browser`
- Playwright MCP: `mcp__playwright__browser_navigate` and related tools
- Chrome DevTools MCP: `mcp__chrome-devtools__*`

**Needs action (Phase 2 enhancements only):**

- Perplexity: `PERPLEXITY_API_KEY` — needed only if adding Perplexity MCP
- Tavily: API key — needed only if adding Tavily MCP

## Implementation

### Phase 1 — Install artifacts

1. Write the `web-research` skill to `~/.claude/skills/web-research.md` (full content in Artifacts)
2. Append the routing directive block to `~/.claude/CLAUDE.md` (full content in Artifacts)

### Phase 2 — Optional provider additions

1. If `PERPLEXITY_API_KEY` is available: add Perplexity MCP; update the routing table in the skill
2. If Tavily API key is available: add Tavily MCP; update the routing table in the skill

## Artifacts

### Artifact 1

- type: skill
- destination: `~/.claude/skills/web-research.md`

```markdown
---
name: web-research
description: >
  Expert web research router. Automatically selects the best search and page-fetch
  tool for any research task. Invoke whenever performing web search, fetching documentation,
  looking up library APIs, or retrieving any external web content. The user never needs
  to specify which tool to use — routing is handled invisibly.
---

## Web Research Routing Rules

Apply these rules automatically — never ask the user which search or fetch tool to use.
Never explain the routing unless the user explicitly asks. If routing fails, surface the
failure clearly; never silently return inferior results.

### Search Tool Selection

Classify the query intent first, then route to the appropriate tool.

**Library / framework documentation (known library, version-specific API)**

1. Try Context7 first: `mcp__context7__query-docs`
2. If Context7 doesn't have the library, or prose/explanation is needed: `mcp__Ref__ref_search_documentation`

**Niche technical query (library internals, obscure bugs, RFCs, edge cases, implementation patterns)**

- Default: `mcp__exa__web_search_exa`
- For finding code examples in OSS specifically: `mcp__exa__get_code_context_exa`

**Synthesis query ("what is the current state of X", "compare A vs B", "explain how X works in 2025/2026")**

- If Perplexity Sonar is connected: use it
- Otherwise: `mcp__exa__web_search_exa` and synthesize the results yourself

**Exhaustive research task (deep investigation, literature review, comprehensive comparison)**

- Use `mcp__exa__deep_researcher_start`, then poll `mcp__exa__deep_researcher_check` until complete
- Only when the task explicitly requires comprehensive multi-source synthesis — it is slow (~45–90s) and expensive

**News / announcements / time-sensitive information**

- If Tavily is connected: use it
- Otherwise: `mcp__exa__web_search_exa` with a recency filter

**Company or product research**

- Use `mcp__exa__company_research_exa`

**General / broad web lookup**

- `mcp__exa__web_search_exa`, or Tavily if connected

**Last resort** (no specialized tool is available for the query type):

- Use built-in `webSearch`
- Always emit a visible note to the user: "(using fallback search — results may be less targeted than usual)"

### Page Fetch / Rendering Escalation

Apply in order. Stop at the first step that returns sufficient content.

1. **`webFetch`** — always try first. Zero overhead, instant.

2. **Detect unhydrated SPA** — if the response body meets any of these conditions, escalate:
   - Total body text content < ~200 characters
   - Body contains `<div id="root">`, `<div id="app">`, or `<div id="__next">` with no meaningful content inside
   - Body is dominated by `<script>` tags with little visible text

3. **`superpowers-chrome`** — lower token cost than headless browser:
   `mcp__plugin_superpowers-chrome_chrome__use_browser`

4. **Playwright MCP** — full headless Chromium if superpowers-chrome was insufficient:
   `mcp__playwright__browser_navigate` → `mcp__playwright__browser_snapshot`
   Or Chrome DevTools MCP as an alternative.

5. **Firecrawl** — only when:
   - Structured JSON data extraction from a specific URL is needed
   - Browser interaction is required (login flows, form submissions, pagination)
   - **Never** use Firecrawl for general search or exploratory fetching

### Fallback Behavior

- If a preferred tool is unavailable (not connected): skip it silently, use the next in routing order
- If a tool returns an error: note the tool name and error internally, escalate to the next option
- Never retry the same tool + same query more than twice
- Never fabricate citations — only reference URLs actually returned by a tool
- Never silently return a result you know to be degraded — surface the issue to the user
```

### Artifact 2

- type: claude-md-addition
- destination: `~/.claude/CLAUDE.md`

```markdown

## Web Research

For all web search and page fetch tasks, use the `web-research` skill. It contains
the complete routing logic for selecting the right tool automatically. Never default
to `webSearch` or `webFetch` without consulting the routing rules first.
```

## Agent-Specific Considerations

- **Silent failures**: If a preferred tool returns empty/error, escalate — never silently use an inferior result. The failure of a tool is not a reason to skip validation of the result.
- **Hallucination of sources**: Only reference URLs actually returned by a search tool. Do not invent plausible-sounding citations.
- **Loop risk**: Do not retry the same tool with the same query more than twice. If two attempts fail, move to the next tool in routing order.
- **Tool unavailability**: Skip unavailable tools silently; surface a note only when falling back to last-resort built-in webSearch.
- **Token cost**: Exa deep_researcher and full Playwright/Chrome DevTools renders are expensive — only escalate when lighter tools genuinely failed, not as a precaution.
- **Backwards compatibility**: The routing skill adds behavior on top of existing tools — it does not remove access to webFetch or webSearch. Users who explicitly request a specific tool should still be able to use it.

## Validation

- AC1 (niche technical routing): Query "pydantic-ai validator context kwarg type 2025" → confirm Exa is used, ≥3 relevant results returned, no tool specified by user
- AC2 (library doc routing): Query "Next.js 15 `use server` directive syntax" → confirm Context7 or Ref is used
- AC3 (SPA rendering): Fetch `nextjs.org/docs/app` → confirm escalation occurs and body contains real doc content (not `<div id="__next">`)
- AC4 (webFetch first): Fetch any static page → confirm webFetch is used first, not superpowers-chrome
- AC5 (fallback note): With Exa skipped (tool unavailable simulation) → confirm visible note is emitted before falling back to webSearch
- AC6 (Firecrawl exclusion): Run AC1–AC3 queries → confirm Firecrawl is never invoked

## Rollback

Trigger: rollback if fallback-to-built-in-webSearch rate exceeds 10% of research queries in a session (indicates routing is broken or tools have disconnected).

Procedure:

1. Delete `~/.claude/skills/web-research.md`
2. Remove the `## Web Research` block appended to `~/.claude/CLAUDE.md`
3. Reload Claude Code (skills take effect on next session)

## Maintenance

- Review the routing table when a new search or browser MCP is added or removed
- Re-validate the SPA detection heuristic if webFetch response format changes
- Re-run validation suite (AC1–AC6) after any changes to `~/.claude/CLAUDE.md`
- Check quarterly whether Perplexity or Tavily should be added as connected providers

## Open Questions

- Q: Should Perplexity Sonar be added as a connected MCP now? Resolved by: checking whether `PERPLEXITY_API_KEY` is available in the environment.
- Q: Is Tavily already connected under a different MCP name? Resolved by: checking the active deferred tools list for Tavily-related tool names.

## References

- Exa pricing and tool docs: https://exa.ai/pricing
- Context7 GitHub: https://github.com/upstash/context7
- Ref tool docs: https://ref.tools/
- Perplexity Sonar API: https://docs.perplexity.ai/docs/sonar/models
- Exa vs Tavily comparison: https://exa.ai/versus/tavily
