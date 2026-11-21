# Veyra

A local-first research MVP for examining unusual YouTube engagement and comment patterns. Built with **Next.js App Router, React 19, TypeScript, and Tailwind CSS v4**. The app ships with a polished dashboard and a fully functional **fictional demo dataset**, so it is usable immediately without credentials.

> **Research aid, not a fraud detector.** Public YouTube data cannot prove that individual views or comments are purchased. This project surfaces reviewable, uncalibrated anomalies and does not assign bot probabilities.

## Start

Requirements: Node.js 20.9+ and pnpm.

```bash
pnpm install
pnpm dev
```

Open **http://localhost:3000**. An illustrative demo report is loaded automatically. Click **Load demo analysis** to regenerate it at any time.

For live API requests:

```bash
cp .env.example .env.local
```

Enable **YouTube Data API v3** in your Google Cloud project, create an API key and set `YOUTUBE_API_KEY=...` in `.env.local`. Restart `pnpm dev`; paste a public YouTube video URL and click **Analyze video**. The key is used server-side only. Restrict it to YouTube Data API v3 and use deployment-appropriate restrictions. No OAuth is needed for this public-data MVP.

## Included functionality

- Responsive dark dashboard with instant fictional demo mode.
- Paste a YouTube `watch`, `shorts`, `live`, `youtu.be` or embed URL (or an 11-character ID).
- Public video statistics and channel information from YouTube Data API v3.
- Up to 100 recent public channel uploads as candidate history; up to 50 comparable videos (duration band, category when possible, at least seven days old).
- Like/view, comment/view and comment/like ratios with historical median, deviation, and median-absolute-deviation heuristic flags.
- Engagement timeline chart, finding cards, sortable historical uploads table.
- Up to 200 latest public **top-level** comments, with optional author-channel creation dates.
- Exact/near-duplicate clusters, generic comments, contextual five-minute bursts, new accounts, conservative username patterns, and external-link signals.
- Reviewable, filterable, searchable comments with reason chips and links to real YouTube comments.
- Activity chart for comments in the last seven days, and JSON report export.
- Methodology and privacy pages explaining the exact criteria and limitations.
- Unit tests for parsing, statistics and bot-pattern heuristics.
- No database, no login, no paid external AI provider, and no persistent user-profile storage.

## Commands

```bash
pnpm dev
pnpm build
pnpm start
pnpm lint
pnpm typecheck
pnpm test
```

## File structure

```text
src/
  app/
    api/analyze/route.ts     POST /api/analyze (demo + live)
    methodology/page.tsx     Explainable heuristics
    privacy/page.tsx         MVP data practices
    page.tsx                 Dashboard and demo initial state
    layout.tsx               Root metadata and styles
    globals.css              Tailwind v4 + custom design tokens
  components/
    dashboard.tsx            Interactive responsive UI
    charts.tsx               SVG-based visuals without a chart dependency
  lib/
    youtube.ts              Typed YouTube API requests
    analysis.ts             Ratios, median/MAD comparisons, report synthesis
    comment-detection.ts    Comment clustering and signals
    demo.ts                 Synthetic example report
    format.ts               UI formatting
    types.ts                Shared interfaces
```

## Veyra Score and the detection model

The new **Veyra Score** summarizes three separate anomaly categories: engagement consistency (35%), comment integrity (45%), and coordination signals (20%). **100 does not mean 100% authentic**; it means relatively few anomalies were seen in the available evidence. Missing signals are not automatically set to 100, and Veyra displays `—` for the overall score when evidence coverage is insufficient. The score is a local, exploratory index with uncalibrated weights, not a fraud probability. The score and the other derived analytics require the relevant YouTube approval before a public release.

Generic AI-style praise is treated as a weak text pattern; a large cross-account praise wave or dense, generic burst prompts human review. This is not an AI-authorship classifier, and genuine fans can write generic praise.

## How the scoring works

**Video engagement:** Ratios are percentages, with median baselines from at least five comparable uploads. Large deviations trigger heuristic "watch" or "elevated" findings using configurable thresholds in `src/lib/analysis.ts`. This is **not** an estimate of the number or percentage of fake views. Current lifetime totals are **not age matched**; newer videos may legitimately differ from mature uploads.

**Comments:** Each comment starts at zero points. Three or more points marks a comment as **for review**, not "bot". Repeated wording in clusters of 3+: 3 points. Generic reaction: 1. High-density 5-minute window that is also generic/repetitive: 1. Author channel younger than 30 days at time of posting: 1. Narrow generated-name pattern: 1. External link: 2. All criteria are auditable in `src/lib/comment-detection.ts`.

**Important coverage limits:** This is a latest-first convenience sample of top-level comments only. Replies, deleted comments, private activity, all past comments by an arbitrary person, reliable Shorts classification, audience demographics, paid views, live view-velocity histories, and peer-channel benchmarking are **not** available in this MVP. Comment metadata may be absent or private and is never treated as inherently suspicious when missing. Comment activity uses sampled posting timestamps, not video view growth.

## YouTube platform rules (important before public launch)

As of 2026, YouTube's policies restrict custom **derived metrics** and historical storage. The additional analytics permissions are for audited and accepted applications, with specific conditions. **Do not assume this MVP is approved for public production live analysis.** Consult [Developer Policies](https://developers.google.com/youtube/terms/developer-policies) and [Additional policies for derived metrics and storage](https://developers.google.com/youtube/terms/derived-metrics-policy), and obtain necessary approvals before public deployment. The included fictional demo does not depend on YouTube API data.

The app does not persist API data in a database. Next.js upstream YouTube fetch responses may be cached for **5 minutes**. A best-effort per-process limiter allows 12 live analyses per IP per 10 minutes; use a shared limiter and authentication for any public deployment. YouTube quotas apply independently (and different API methods have different quota costs).

## Limitations / follow-up work

- No historical view snapshots or time-normalized comparisons yet.
- No peer cohort recommender or true audience comparison yet.
- No machine-learning bot model or transcript-semantic analysis yet.
- Local in-memory IP rate limiting is **not** a production abuse-prevention solution.
- You must add an operator contact address and review privacy/terms before public release.
- API availability and policies may change; validate against current Google documentation.

## API examples

```bash
# Synthetic data, no key
curl -sS -X POST http://localhost:3000/api/analyze \
  -H 'Content-Type: application/json' -d '{"mode":"demo"}'

# Live data, needs YOUTUBE_API_KEY
curl -sS -X POST http://localhost:3000/api/analyze \
  -H 'Content-Type: application/json' \
  -d '{"mode":"live","url":"https://www.youtube.com/watch?v=dQw4w9WgXcQ"}'
```

Copyright 2026. MVP source released for modification; ensure API policy compliance if publishing.
