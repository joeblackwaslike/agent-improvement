---
num: "0002"
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
## Variables:

CREDENTIALS_FILE: ~/creds.zsh

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

**API keys — all confirmed present in CREDENTIALS_FILE:**

| Provider | Env var | Dashboard |
| --- | --- | --- |
| Exa | `EXA_API_KEY` ✓ | [dashboard.exa.ai](https://dashboard.exa.ai/api-keys) |
| Context7 | `CONTEXT7_API_KEY` ✓ | [context7.com/settings](https://context7.com/settings) |
| Ref | `REF_API_KEY` ✓ | [ref.tools/settings](https://ref.tools/settings) |
| Perplexity | `PERPLEXITY_API_KEY` ✓ | [perplexity.ai/settings/api](https://www.perplexity.ai/settings/api) |
| Tavily | `TAVILY_API_KEY` ✓ | [app.tavily.com](https://app.tavily.com/home) |
| Brave Search | `BRAVE_API_KEY` ✓ | [api-dashboard.search.brave.com](https://api-dashboard.search.brave.com/app/subscriptions) |
| Firecrawl | `FIRECRAWL_API_KEY` ✓ | [firecrawl.dev/app/api-keys](https://www.firecrawl.dev/app/api-keys) |
| DeepWiki | — no key required ✓ | — |

**Needs action:**

- Install MCP server configs for Tavily, Perplexity, Brave, Firecrawl (see Artifact 3)
- Install provider skills for routing enrichment (see Artifacts 4–8)

## Implementation

### Phase 1 — Install artifacts

1. Write the `web-research` skill to `~/.claude/skills/web-research.md` (full content in Artifacts)
2. Append the routing directive block to `~/.claude/CLAUDE.md` (full content in Artifacts)

### Phase 2 — Provider skills

1. Install Tavily CLI skill to `~/.claude/skills/tavily-cli.md` (Artifact 4)
2. Install Context7 find-docs skill to `~/.claude/skills/context7-find-docs.md` (Artifact 5)
3. Install Context7 MCP skill to `~/.claude/skills/context7-mcp.md` (Artifact 6)
4. Install Exa research skill to `~/.claude/skills/exa-research.md` (Artifact 7)
5. Install Brave web-search skill to `~/.claude/skills/brave-web-search.md` (Artifact 8)

### Phase 3 — MCP server connections

All API keys confirmed in CREDENTIALS_FILE. Merge Artifact 3 `mcpServers` block into `~/.claude/settings.json`.

1. Read current `~/.claude/settings.json`
2. Add each server entry from Artifact 3 under `mcpServers` — do not overwrite existing entries
3. Verify new connections appear in deferred tools: `mcp__tavily__*`, `mcp__perplexity-sonar__*`, `mcp__brave-search__*`, `mcp__firecrawl__*`
4. Re-run validation suite (AC1–AC6) with all providers connected

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

### Artifact 3

- type: mcp-config
- destination: `~/.claude/settings.json` (merge `mcpServers` — do not overwrite the full file)

> **implement-plan note**: Use `jq -s '.[0] * .[1]' ~/.claude/settings.json - <<'JSON' | sponge ~/.claude/settings.json` to merge, or manually add each entry under `mcpServers`.

```json
{
  "mcpServers": {
    "tavily": {
      "type": "http",
      "url": "https://mcp.tavily.com/mcp/",
      "headers": {
        "Authorization": "Bearer ${TAVILY_API_KEY}"
      }
    },
    "exa": {
      "type": "http",
      "url": "https://mcp.exa.ai/mcp",
      "headers": {
        "x-api-key": "${EXA_API_KEY}"
      }
    },
    "context7": {
      "type": "http",
      "url": "https://mcp.context7.com/mcp",
      "headers": {
        "Authorization": "Bearer ${CONTEXT7_API_KEY}"
      }
    },
    "ref": {
      "type": "http",
      "url": "https://api.ref.tools/mcp",
      "headers": {
        "Authorization": "Bearer ${REF_API_KEY}"
      }
    },
    "deepwiki": {
      "type": "http",
      "url": "https://mcp.deepwiki.com/"
    },
    "perplexity-sonar": {
      "command": "npx",
      "args": ["-y", "@felores/perplexity-sonar-mcp"],
      "env": {
        "PERPLEXITY_API_KEY": "${PERPLEXITY_API_KEY}"
      }
    },
    "brave-search": {
      "command": "npx",
      "args": ["-y", "@brave/brave-search-mcp-server", "--transport", "http"],
      "env": {
        "BRAVE_API_KEY": "${BRAVE_API_KEY}"
      }
    },
    "firecrawl": {
      "command": "npx",
      "args": ["-y", "firecrawl-mcp"],
      "env": {
        "FIRECRAWL_API_KEY": "${FIRECRAWL_API_KEY}"
      }
    }
  }
}
```

### Artifact 4

- type: skill
- destination: `~/.claude/skills/tavily-cli.md`
- source: <https://github.com/tavily-ai/skills/blob/main/skills/tavily-cli/SKILL.md>

````markdown
---
name: tavily-cli
description: |
  Web search, content extraction, crawling, and deep research via the Tavily CLI. Use this skill whenever
  the user wants to search the web, find articles, research a topic, look something up online, extract
  content from a URL, grab text from a webpage, crawl documentation, download a site's pages, discover
  URLs on a domain, or conduct in-depth research with citations. Also use when they say "fetch this page",
  "pull the content from", "get the page at https://", "find me articles about", or reference extracting
  data from external websites. Do NOT trigger for local file operations, git commands, deployments, or
  code editing tasks.
compatibility: Requires tavily-cli (`curl -fsSL https://cli.tavily.com/install.sh | bash`) and TAVILY_API_KEY.
allowed-tools: Bash(tvly *)
---

# Tavily CLI

Web search, content extraction, site crawling, URL discovery, and deep research. Returns JSON optimized
for LLM consumption.

## Prerequisites

Check: `tvly --status`. If not ready:

```bash
curl -fsSL https://cli.tavily.com/install.sh | bash
tvly login --api-key "${TAVILY_API_KEY}"
```

## Escalation Workflow

Start simple, escalate when needed:

| Need | Command | When |
|------|---------|------|
| Find pages on a topic | `tvly search` | No specific URL yet |
| Get a page's content | `tvly extract` | Have a URL |
| Find URLs within a site | `tvly map` | Need to locate a subpage |
| Bulk extract a site section | `tvly crawl` | Need many pages (e.g., all /docs/) |
| Deep research with citations | `tvly research` | Need multi-source synthesis |

## Output

All commands support `--json` for machine-readable output and `-o` to save to a file:

```bash
tvly search "react hooks" --json -o results.json
tvly extract "https://example.com/docs" -o docs.md
tvly crawl "https://docs.example.com" --output-dir ./docs/
```

## Tips

- Always quote URLs — shell interprets `?` and `&` as special characters
- Use `--json` in agentic workflows
- Read from stdin: `echo "query" | tvly search -`
- Exit codes: 0=success, 2=bad input, 3=auth error, 4=API error
````

### Artifact 5

- type: skill
- destination: `~/.claude/skills/context7-find-docs.md`
- source: <https://github.com/upstash/context7/blob/master/skills/find-docs/SKILL.md>

````markdown
---
name: find-docs
description: >-
  Retrieves up-to-date documentation, API references, and code examples for any developer technology.
  Use this skill whenever the user asks about a specific library, framework, SDK, CLI tool, or cloud
  service — even for well-known ones like React, Next.js, Prisma, Express, Tailwind, Django, or Spring
  Boot. Your training data may not reflect recent API changes or version updates.

  Always use for: API syntax questions, configuration options, version migration issues, "how do I"
  questions mentioning a library name, debugging involving library-specific behavior, setup instructions,
  and CLI tool usage. Prefer this over web search for library documentation and API details.
---

# Documentation Lookup

Two-step process: resolve the library name to an ID, then query docs with that ID.

## Step 1: Resolve a Library

Call `mcp__context7__resolve-library-id` with `libraryName` and `query` (the user's full question).

Result fields: Library ID (`/org/project`), Name, Description, Code Snippets, Source Reputation,
Benchmark Score, Versions.

Selection: name similarity → description relevance → code snippet count → source reputation →
benchmark score. For version-specific queries use version IDs (e.g., `/vercel/next.js/v14.3.0`).

## Step 2: Query Documentation

Call `mcp__context7__query-docs` with `libraryId` and `query`.

Writing good queries:
- Good: `"How to set up authentication with JWT in Express.js"`
- Bad: `"auth"`, `"hooks"` (too vague — returns generic results)

Use the user's full question as the query. Max 3 attempts per question.

## Fallback

If quota error ("Monthly quota reached"): tell the user, suggest setting `CONTEXT7_API_KEY`,
do not silently fall back to training data.
````

### Artifact 6

- type: skill
- destination: `~/.claude/skills/context7-mcp.md`
- source: <https://github.com/upstash/context7/blob/master/skills/context7-mcp/SKILL.md>

````markdown
---
name: context7-mcp
description: >-
  Use when the user asks about libraries, frameworks, API references, or needs code examples.
  Activates for setup questions, code generation involving libraries, or mentions of specific
  frameworks like React, Vue, Next.js, Prisma, Supabase, etc.
---

When the user asks about libraries or needs code examples, use Context7 to fetch current
documentation instead of relying on training data.

## Workflow

1. Call `mcp__context7__resolve-library-id` with `libraryName` and the user's full question as `query`
2. Select best match: exact name match → higher benchmark score → version-specific ID if version mentioned
3. Call `mcp__context7__query-docs` with `libraryId` and `query`
4. Answer using the fetched docs; include code examples; cite library version when relevant

## Guidelines

- Pass the user's full question as the query — improves result relevance significantly
- For version mentions ("Next.js 15", "React 19"), prefer version-specific library IDs
- When multiple matches exist, prefer official/primary packages over community forks
````

### Artifact 7

- type: skill
- destination: `~/.claude/skills/exa-research.md`
- source: <https://github.com/exa-labs/exa-mcp-server/blob/main/skills/search/SKILL.md>

````markdown
---
name: exa-research
description: >-
  Deep research powered by Exa. Use for lead generation, literature reviews, deep dives, competitive
  analysis, or any query where one search falls short — including phrases like "research this",
  "find everything about", "find me all", or "deep dive on".
---

# Exa Research Orchestrator

Understand the query, plan the work, dispatch the right Exa tool, compile and deliver results.

## Tool Selection

| Query type | Tool |
|------------|------|
| General web research | `mcp__exa__web_search_exa` |
| Code examples in OSS | `mcp__exa__get_code_context_exa` |
| Company / product info | `mcp__exa__company_research_exa` |
| Deep multi-source research | `mcp__exa__deep_researcher_start` + poll `mcp__exa__deep_researcher_check` |
| LinkedIn / people research | `mcp__exa__linkedin_search_exa` |

## Date Handling

For recency queries ("last month", "this year"), calculate the actual date before searching:

```bash
date -u +%Y-%m-%dT%H:%M:%SZ
```

Use this as `startPublishedDate`.

## Source Quality

- Prefer `.edu`, `.gov`, and primary sources
- Prefer recent publications; check publish date
- Discard sources with relevance score < 0.5
- Never fabricate citations — only cite URLs actually returned by the tool
- Never retry the same tool + query more than twice

## Citation Format

```
[Title](URL) — one-line summary of key finding
```

Include at least 3 citations in any research response.
````

### Artifact 8

- type: skill
- destination: `~/.claude/skills/brave-web-search.md`
- source: <https://github.com/brave/brave-search-skills/blob/main/skills/web-search/SKILL.md>

````markdown
---
name: brave-web-search
description: >-
  Web search via Brave Search's independent index (30B+ pages). Use when Exa/Tavily are unavailable,
  for privacy-first search with no Google/Bing dependency, or when news and time-sensitive results are
  needed. Requires BRAVE_API_KEY. If Brave MCP is connected, use MCP tool; otherwise call the REST API.
---

# Brave Web Search

**API key**: `BRAVE_API_KEY` env var — [api-dashboard.search.brave.com](https://api-dashboard.search.brave.com/app/subscriptions/subscribe)

## If Brave MCP is connected

Use `mcp__brave-search__web_search` (or similar — check deferred tools for exact name).

## REST API fallback

```bash
curl -s "https://api.search.brave.com/res/v1/web/search" \
  -H "Accept: application/json" \
  -H "X-Subscription-Token: ${BRAVE_API_KEY}" \
  -G \
  --data-urlencode "q=YOUR_QUERY" \
  --data-urlencode "count=10" \
  --data-urlencode "freshness=pm"
```

## Key Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `q` | Search query (max 400 chars) | required |
| `count` | Results per page (1–20) | 10 |
| `freshness` | `pd` (day), `pw` (week), `pm` (month) | none |
| `country` | Country code, e.g. `US` | auto |
| `safesearch` | `off`, `moderate`, `strict` | moderate |

## When to Use

- Privacy-first search (no Google/Bing dependency)
- News and time-sensitive queries when Tavily is unavailable
- Independent index with broad coverage
- Cost-effective: ~$0.10/100 queries
````

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
- Review provider skill files quarterly against upstream repos (Tavily, Exa, Context7, Brave) for updates

## Open Questions

- Q: Should Perplexity Sonar be added as a connected MCP now? **Resolved: Yes.** `PERPLEXITY_API_KEY` confirmed in CREDENTIALS_FILE. MCP config added in Artifact 3.
- Q: Is Tavily already connected under a different MCP name? **Resolved: No.** Not in the active deferred tools list. `TAVILY_API_KEY` confirmed available. MCP config added in Artifact 3.
- Q: Should Brave Search be added? **Resolved: Yes.** `BRAVE_API_KEY` confirmed available. MCP config added in Artifact 3.
- Q: Which provider skills to install alongside web-research? **Resolved.** Tavily CLI, Context7 find-docs, Context7 MCP, Exa research, Brave web-search added as Artifacts 4–8.

## References

- Exa pricing and tool docs: [exa.ai/pricing](https://exa.ai/pricing)
- Context7 GitHub: [upstash/context7](https://github.com/upstash/context7)
- Ref tool docs: [ref.tools](https://ref.tools/)
- Perplexity Sonar API: [docs.perplexity.ai](https://docs.perplexity.ai/docs/sonar/models)
- Exa vs Tavily comparison: [exa.ai/versus/tavily](https://exa.ai/versus/tavily)
- Tavily skills repo: [tavily-ai/skills](https://github.com/tavily-ai/skills)
- Brave Search skills repo: [brave/brave-search-skills](https://github.com/brave/brave-search-skills)
- Exa MCP server skills: [exa-labs/exa-mcp-server](https://github.com/exa-labs/exa-mcp-server/tree/main/skills/search)
