# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Astro 6 SSR frontend for MiniMovie, deployed as a Cloudflare Worker at `minimovie.info`. The Go backend lives in the sibling `minimovie-api/` repo (see the monorepo root `CLAUDE.md`).

## Commands

```sh
pnpm install         # Node >= 24 (.nvmrc), pnpm with hoisted node_modules
pnpm dev             # http://localhost:4321
pnpm host            # dev server exposed on the LAN
pnpm build           # astro build (Cloudflare adapter)
pnpm preview         # wipes .wrangler/state + dist/, builds with --site http://localhost:4321, runs workerd locally
pnpm lint            # ESLint (astro + simple-import-sort); `pnpm lint:fix` fixes import order
pnpm format          # Prettier (`pnpm format:check` in CI)
```

There is no test suite. Verify changes with `pnpm build` and by running the page in `pnpm dev` or `pnpm preview`.

Env vars are declared in the `env.schema` block of `astro.config.mjs` and imported from `astro:env/server` / `astro:env/client`, so adding one means editing that schema (and `wrangler.toml` `[vars]` for non-secret prod values). `API_TOKEN` is the only required var; copy `env.example` to `.env`.

## Cloudflare constraints

`wrangler.toml` caps each request at `cpu_ms = 1000` and `subrequests = 10`. Every backend fetch during SSR is a subrequest, so pages must keep fan-out small (one or two backend calls per page). Anything user-specific that would add a fetch belongs in a client island, not the SSR frontmatter.

## Request flow (`src/middleware.ts`)

Read top to bottom, every request goes through this:

1. `locals.user`, `locals.unseenAchievementCount`, `locals.timezone` (from `request.cf.timezone`) are normalised.
2. The session is resolved server-side **only** for `SESSION_REQUIRED_PATHS` (`/login`, `/profile`, `/watchlist`). Those pages guard with `Astro.locals.user` and call the backend with `fetchUserAPI`. Every other route never sees the user on the server.
3. `NO_CACHE_PATHS` (login, profile, watchlist, `/api/`, `/auth/`, `/_server-islands/`), non-GET, and dev mode bypass the edge cache and get `Cache-Control: private, no-store`.
4. Everything else is served from `caches.default` for 4 hours (HTML 2xx only) and written back via `waitUntil`.
5. Security headers, including the CSP, are stamped on every response, cache hits included. The CSP allow-lists live at the top of the middleware; a new external image/script/API origin must be added there or the browser blocks it.

## Auth shell: marker cookie + client islands

This is how public pages stay cacheable while showing per-user UI:

- Backend session cookie: HttpOnly `__Secure-mm_session` on `.minimovie.info` (`mm_session_dev` on http). Set by `src/pages/auth/finish.ts` after exchanging the OIDC `code` at `/auth/token`; cleared by `src/pages/auth/logout.ts`. Names and options live in `src/lib/session.ts`.
- Marker cookie: non-HttpOnly `mm_authed=1`, set alongside the session. It is a UI hint only.
- `Layout.astro` runs an inline pre-paint script that adds `html.authed` when the marker is present. `src/styles/starwind.css` toggles `.anon-only` / `.authed-only` containers off that class, so the cached HTML carries both branches.
- Solid islands (`client:only="solid-js"`) are mounted inside `.authed-only` and fetch user data from the browser (`UserMenu`, `MediaToolbar`, episode/season toggles). On a 401 they call `clearAuthMarker()` from `src/lib/auth-marker.ts` to fall back to the anonymous shell.
- `server:defer` is used once, for the LLM-backed `InterestingInfo` section on person pages, not for user data.

## Two API clients, never mix them

| File | Runs in | Auth | Use for |
|------|---------|------|---------|
| `src/lib/api.ts` (`fetchPublicAPI`, `fetchUserAPI`, `getMovie`, `search`, ...) | Worker (SSR, `src/pages/api/*`, `src/pages/auth/*`) | `Authorization: Bearer API_TOKEN` or forwarded session cookie | Catalog data during render, session lookups |
| `src/lib/client-api.ts` → `src/lib/user-api.ts` | Browser | `credentials: 'include'` straight to `PUBLIC_API_BASE_URL` | Watchlist, watch events, progress, achievements, account actions |

The browser talks to the backend directly; the Worker is not a proxy for user data. The only Worker-side client endpoint is `/api/search` (autocomplete, trims to 8 results).

## Client-side state

Pages are full SSR reloads, so per-user state that must survive navigation lives in module-level Solid stores persisted to `sessionStorage`:

- `src/lib/media-state-cache.ts` (`mm_media_state_v2`): watchlist/watched flags per `mediaType:mediaId`.
- `src/lib/series-progress.ts` (`mm_series_progress_v2`): season and episode watch events per series, with helpers for "episode covered by a season event".

Both use a 5-minute freshness window, refetch on tab visibility, de-dupe in-flight requests, and write through on mutation. `MediaToolbar` wraps mutations in `runOptimistic` (optimistic patch, API call, rollback on failure, toast). Logout in `user-menu.tsx` clears all of these caches.

## Components and styling

- `src/components/starwind/` is the Starwind UI library (Astro components, versions tracked in `starwind.config.json`). Use it for non-interactive markup.
- `src/components/solid/` are hand-written Kobalte + `tailwind-variants` primitives for islands. Tailwind is v4 CSS-first (`src/styles/starwind.css` holds the `@theme` tokens); there is no JS Tailwind config, so tooling that expects one will not work.
- Dark mode is `data-theme="dark"` on `<html>` (custom variant in the CSS), set from `localStorage.theme` by the same pre-paint script.
- Every component folder exports through an `index.ts` barrel; import via the `@components/*`, `@lib/*`, `@layouts/*`, `@styles/*` aliases from `tsconfig.json`.
- Icons come from `@tabler/icons` SVGs re-exported in `@components/icons` (Astro) and `@tabler/icons-solidjs` (Solid).

## SEO and pages

- `Layout.astro` takes `title`, `description`, `image`, `noindex`, and `jsonLd`; `src/lib/schema.ts` builds the JSON-LD for movie/series/season/episode/person pages.
- `src/pages/sitemap.xml.ts` is generated from the hard-coded catalog slug lists in `src/lib/sitemap-seeds.ts`.
- Detail pages return a 404 status but still render `NotFound` inside the layout when the backend call fails.
