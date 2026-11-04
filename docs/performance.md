# Model-preserving latency improvements

The Spark model remains `muse-spark-1.3-contributor`. These changes do not alter
the deterministic decision rules, daily request limit, evidence schemas or the
contributor privacy notice in ten languages.

- **Search reasoning:** all three steps default to minimal. Production explicitly
  sets `META_REASONING_EFFORT_SEARCH=minimal`; the existing per-step overrides
  still work. Search context stays low. Validate source discovery separately
  from reading and direct-URL comparison: a faster direct check does not prove
  faster or equally complete automatic search.
- **Prompt reuse:** extraction-image, extraction-text, comparison and search use
  different stable, versioned `prompt_cache_key` strings. They contain no notice,
  user or session identifiers. Stable developer instructions precede variable
  input as before. Provider caching is already automatic; these keys can improve
  routing, but do not guarantee a hit or a speedup. No extended cache retention
  is requested. Logs add only numeric cached-input and reasoning-token counts.
- **Photo input:** remove only near-white blank outer margins, leaving a 2%
  margin (at least 12 pixels). All nonblank pixels, faint marks and gaps between
  notices stay inside the bounding box at their existing scale. Colored/detailed
  backgrounds, blank/sparse inputs and gains below 10% area are left alone.
  ImageData inspection is skipped above six million pixels to bound temporary
  memory. The existing 2400-pixel preparation ceiling is unchanged; no blanket
  low-detail setting or extra SAM call is introduced. Hand cropping, rotation
  and optional SAM selection remain available.
- **Source input:** strip explicitly marked navigation, breadcrumb, pagination,
  share and related-post components, retaining alert/status containers even
  inside these components. Do not choose evidence by keywords, remove generic
  asides/sections, truncate notice text or summarize it. The existing page-size
  limit still fails closed. Compact JSON instructions reduce formatting and
  needless prose; full photo transcription and complete evidence sentences or
  table rows, including conditions and negations, remain required.
- **Pipeline:** fetch up to three candidates concurrently, accept them in the
  same priority order, and start comparison for each accepted related source
  before later fetches finish. At most two related sources are compared, with
  no speculative model calls on candidates that would have been discarded.
  Started failures are settled safely and retained for the same final decision.
  After source collection, the existing 30-second comparison grace still applies;
  an unfinished comparison remains review. Cancellation propagates to all work.
  `fetchMs` and `compareMs` may overlap: use overall elapsed time for totals.
- **Optional search bound:** `META_SEARCH_MAX_TOOL_CALLS=1..5` is supported and
  reported by status. It limits built-in tool calls within one paid API request,
  not the global daily API-call allowance. It is deliberately unset in Production:
  a hard one-search limit could miss amendments or cancellations. Enable only
  after validating retrieval completeness against representative known sources.

No `fast`, `verbosity`, `prediction`, unsupported reasoning `none`, forced low
image detail, smaller output budget or shorter provider deadline is sent as a
speed shortcut. Streaming is already used for check progress; it changes when
progress is visible rather than total generation time. Priority-tier access,
cost and latency are unverified and no priority tier is enabled.

Run `npm run check`, `npm run build`, `npm run test:browser-image` and the existing
browser suites. Real provider measurements must use an announced call budget,
report extraction, search and comparison separately, retain expected verdicts
and disclose input provenance and sample size. Browser fixtures and synthetic
images do not establish camera-photo performance or general accuracy.

Official references:

- https://dev.meta.ai/docs/reasoning
- https://dev.meta.ai/docs/features/prompt-caching
- https://dev.meta.ai/docs/image-understanding
- https://dev.meta.ai/docs/protocols/chat-completions
- https://dev.meta.ai/docs/api-reference/responses/schemas

## Request efficiency in the current application

The following additions are covered by offline regression checks. A new live-model
latency study has not been run for this revision; no completion-time guarantee or
accuracy improvement is inferred from the code changes.

- Search candidates are ranked for registered authority and notice relevance
  **before** the three-page cap. Later official citations are not discarded simply
  because three raw search results preceded them.
- Source retrieval has a **15-second aggregate budget**, including DNS, redirects
  and body retrieval, in addition to the 12-second per-request limit. Unread sources
  remain explicit warnings.
- Eligible pages among the first two candidates can start comparison on arrival,
  even when an earlier fetch is still pending. Final source selection retains
  priority order and the two-source ceiling. Exact matches of final URL, title,
  body and authority share comparison work; similar pages at different URLs do not.
- Background checking starts after **350 ms** and is aborted if the reading,
  usage region or source link changes. Display-language changes can reuse the
  same factual check. Aborting cannot guarantee a refund for a provider call
  already received.
- One clear extraction is reusable for identical input and country for **10 minutes
  in tab memory**. Reset/unmount clears it; uncertain readings are not cached.
  This cache does not store source freshness or final validity decisions.

The earlier 205-unit / 7-harness-test release verification and seven browser
suites cover the implemented behaviour. Screenshots in the refreshed READMEs are
production UI with built-in synthetic examples, not new latency measurements.
