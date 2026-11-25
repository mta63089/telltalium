# Telltalium — historical intelligence roadmap

## Why persist channel data?

- Avoid repeated API requests for channel metadata and historical uploads.
- Track how **the same video** accumulates views, likes, and comments at matching ages (24h, 72h, 7d, 30d).
- Compare a channel with itself over time without pretending lifetime counts are age-matched.
- Enable more meaningful comparisons between similarly sized, topic-related channels **only if YouTube API policy approval covers that use case**.

## Important approval blocker

Do not enable long-term public-data retention or public derived scores without securing the required YouTube analytics permissions. Default YouTube rules limit storage of non-authorized data to **30 days** (delete or refresh); the additional accepted analytics policy may permit statistical and derived metrics for up to **36 months**, while titles, descriptions, and comment text still require 30-day refresh/delete. The approval's scope and the aggregation rules must be reviewed before cross-creator benchmarking.

References: <https://developers.google.com/youtube/terms/developer-policies> and <https://developers.google.com/youtube/terms/derived-metrics-policy>

## Proposed stack (not implemented yet)

PostgreSQL + Drizzle ORM, background worker (e.g. Inngest) with a rate-limited scheduler. App stays server-rendered through Next.js.

Candidate tables:

- `channels (id, platform_id, title, category_tags, last_refreshed_at, expires_at)` — provider ID unique.
- `videos (id, channel_id, platform_id, published_at, duration_seconds, last_refreshed_at, expires_at)` — unique platform video ID.
- `video_metric_snapshots (video_id, captured_at, age_minutes, views, likes, comments)` — unique video + snapshot time; retention policy enforced.
- `channel_metric_snapshots (channel_id, captured_at, subscribers)` — subject to approved retention.
- `analyses (video_id, analyzed_at, model_version, score, score_coverage, expiry_at)` — recalculable and clearly third-party derived.
- `comment_fingerprints (video_id, captured_at, text_hash, cluster_id, expiry_at)` — only if explicitly authorized and necessary; avoid unnecessary author profiling.
- `collection_jobs (video_id, status, next_run_at, attempts)` — internal job control.

## Collection

On initial analysis: upsert channel + video metadata (respecting TTL), fetch a short cohort and current totals. Schedule carefully bounded rechecks around 1d, 3d, 7d, and 30d for newer videos only. Refresh or delete all stored provider metadata when required. Never save API keys or private user credentials in tables. Deletion mechanism and access controls are mandatory before public deployment.

## Correct analytical comparisons

Compare **views at video age 7 days**, not a 7-day-old upload to a 2-year lifetime total. Use a median and MAD by content format and age bucket. YouTube does not supply arbitrary historical data for other creators via Data API, so historical baselines only improve after collection begins. Comparisons are a hypothesis, not proof of purchased engagement. Cross-creator cohorts need explicit platform policy review.
