# Veyra v0.3 design and navigation

## Intent

A minimalist, editorial, speculative-instrument aesthetic: ink-black backgrounds, off-white type, one acidic chartreuse accent (`#d6ff52`), restrained violet for secondary data, an angular custom V mark, and unusually large typography. The dashboard has **no left sidebar**. Its navigation remains visible at the top while the document scrolls normally.

## Animation behavior

- The hero signal scanner rotates slowly; its fine concentric rings create a distinctive animated brand motif.
- Small ambient status dots pulse.
- The ticker rolls continuously.
- Report sections reveal on entry using IntersectionObserver.
- Progress bars animate when created.
- A 2px fixed scroll progress line reflects document position.
- `prefers-reduced-motion: reduce` disables transitions and loops. The core content remains accessible without JS-activated reveal classes.
- All motion is CSS; no animation library is required.

## Navigation

- The landing page at `/` includes an illustrative fictional report, explicitly marked as demo.
- Pasting a valid YouTube URL and clicking **Analyze** navigates to `/analyze/<videoId>`.
- `src/app/analyze/[videoId]/page.tsx` validates the 11-character ID and renders a report shell.
- The dashboard then calls the existing `POST /api/analyze` live endpoint in the browser, preserving its rate limiting and server-side API key.
- Historical titles from **live** reports are internal Next.js links to the same route, not direct YouTube links.
- Fictional demo titles are not live links.
- The target video's `View original on YouTube` link remains external, intentionally separated from historical analysis navigation.

## Files

- `src/components/dashboard.tsx`: report layout, animations, internal history links, loading state.
- `src/components/veyra-mark.tsx`: angular SVG logomark, reusable with the supporting page shell.
- `src/components/docs-shell.tsx`: matching minimalist branding for supporting pages.
- `src/lib/video-url.ts`: shared YouTube URL parsing used in client route navigation and server analysis API.
- `src/app/globals.css`: complete v0.3 visual system and responsive/reduced-motion rules.
- `src/app/analyze/[videoId]/page.tsx`: shareable in-app analysis route.

## Scope and caveats

The v0.3 release intentionally makes no changes to the integrity-scoring algorithm, sample coverage, or YouTube API behavior. Derived metrics and storage still require policy review/approval before public deployment. Links inside a private deployed environment are shareable only with viewers who have access and a configured API key.
