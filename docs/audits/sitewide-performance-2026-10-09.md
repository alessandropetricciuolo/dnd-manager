# Sitewide performance work — 2026-10-09

## Changes

- `DualSourceImage` now uses `next/image` for configured Supabase Storage, Drive, Googleusercontent, placeholder, and local image-proxy sources. It falls back to the original URL if optimization fails, then tries the Telegram source if the original fails. Unconfigured origins and SVGs stay on direct image loading; there is no broad remote-host allowlist. Wiki index portraits request 36px or 24px variants. Character and map cards use optimization only for configured sources. The projection and full-size Wiki gallery keep the original image URL.
- Server components in one React render request now share a context containing the authenticated user and role. It uses `auth.getUser()` and RLS-backed profile reads; it does not use `getSession()` for authorization or retain state between requests. Dashboard/campaign layouts, dashboard/profile/campaign pages, Command Center, and Forge/Vault access use the shared context. Forge/Vault checks run concurrently. GM sheet URLs are created concurrently and only when the PG tab is rendered.
- Campaign detail checks only whether a player has an assigned character to choose the default tab. Full character rows are fetched only for the PG tab. GM/Admin sessioni, wiki, mappe, missioni, and GM tabs keep their existing URL-driven loading behavior. An inaccessible tab still falls back to the player's prior PG/sessioni choice.
- Dashboard slots now render from the `tab` query parameter, and tab controls/data-switch-tab update it while retaining hash handling. Only the selected server slot performs its data work; direct hash entry remains supported and resolves to a tab in the client.
- The Wiki index now sends compact rows: identity, visibility, tags, image references, mission labels, safe quick labels, the detail version, and searchable text. It omits the separate `contentBody` and full attributes fields, but `searchText` preserves current search behavior and can contain the full body when an entry has no description. Player list labels omit combat stats. The selected entry fetches reader content and permitted attributes through `getEntity`; players continue to receive its sanitized response. Detail version changes invalidate the selected cache after refresh, and board mode does not request reader detail. Search, type/mission filtering, gallery, edit flow, board labels, and visibility labels remain available.
- The shared navbar no longer reads cookies on the server. A root client auth provider performs one browser `getUser()` and fans out auth events to existing consumers, including the navbar and home personalization. The public home page therefore has no server auth lookup and retains its 300-second revalidation. The middleware skips only `/api/tg-image/*`; protected pages and API handlers keep their existing checks.

## Baseline and evidence

The pre-change production inventory was 23 campaigns, 397 Wiki entities (378 with images), 48 maps, and 167 campaign characters. Browser checks found Wiki rows rendering original-size portraits: Beneventum had 36 images with no lazy images; Scommessa had 22 with none lazy; Fossa's PG view had 25 images, 24 lazy, and 24 original images; Eldaria's maps view had 55 images with one lazy image. The optimized images observed were mostly the small logo rather than the media rows.

Unauthenticated HTML responses were cache MISS: home TTFB 0.33–1.00s, privacy 0.20–0.34s, and `/scopri` 0.19–0.33s. The browser performance API was unavailable, so this work does not claim an authenticated LCP/TTFB improvement. Authenticated Wiki query measurements were approximately 72ms for admin, 56ms for GM, and 199ms for player under RLS; the privileged baseline query was about 3.6ms. This shows an RLS cost but no evidence of database saturation. Policies remain unchanged, and no index or policy migration was added without query-plan evidence.

The existing Next image patterns already cover the verified Drive and Googleusercontent URLs; no arbitrary remote image hosts were added. A prior local check of `/api/tg-image` confirmed a 64px WebP response of 1.37KB from a 214KB original. No thumbnail migration, paid plan, new infrastructure, or database migration was introduced. The implementation is released through the existing Vercel project.

## Known limits

- Wiki search still carries the text used by its current full-text search, because replacing it with server-side search or a dedicated indexed summary would change the request path and needs separate query/latency validation. The duplicate reader-body field and full attributes are removed from index rows; searchText may still contain the body when no description exists. Full permitted reader detail is fetched for the selected row.
- Telegram fallback still makes a Telegram file lookup on a cache miss. The middleware no longer performs an extra Supabase auth check for that public image route.
- Origins outside the explicit Next image allowlist remain functional through direct loading, without optimization. Oversized maps retry the original URL when Next's optimizer rejects them.
- Replacing RLS policies was intentionally left out. No schema indexes were added; the primary review found no query plan evidence supporting an index change.

## Verification

- Integrated performance and complete security tests: 12 passed.
- `next lint`: passed with pre-existing warnings in the AI artifact card, scene workspace, and tournament initiative hook.
- Final integrated production build passed after rebasing onto the concurrent Wiki video commit 9200bc5, with 53 static-page generation steps. Home, privacy and scopri are prerendered; authenticated campaign/dashboard routes remain dynamic. Lint and diff checks passed. Direct tsc still reports existing fixture typing errors in sheet-generator and Command Center tests plus the missing @electric-sql/pglite test dependency; none are in changed files.
