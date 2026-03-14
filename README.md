# MiniMovie UI

Server-rendered frontend for _MiniMovie_ built with Astro and deployed to Cloudflare.

## Tech Stack

| Category | Technology |
| --- | --- |
| Framework | [Astro](https://astro.build/) 5.x (SSR) |
| Language | TypeScript |
| Styling | [Tailwind CSS](https://tailwindcss.com/) v4 |
| Components | [Starwind UI](https://starwind.dev/) |
| Icons | [Tabler Icons](https://tabler.io/icons) |
| Font | [Inter](https://rsms.me/inter/) |
| Deployment | [Cloudflare](https://www.cloudflare.com/) |

## Installation

### Install Dependencies

```sh
pnpm install
```

### Environment Variables

Create a `.env` file in the project root:

```sh
LOG_LEVEL=INFO
API_BASE_URL=http://localhost:8080
API_TOKEN=your_api_token_here
```

| Variable | Default | Required | Description |
| --- | --- | --- | --- |
| `LOG_LEVEL` | `INFO` | No | Server-side log level |
| `API_BASE_URL` | `https://api.minimovie.info` | No | MiniMovie API base URL |
| `API_TOKEN` | — | Yes | Bearer token for API authentication |

### Run the Application

```sh
pnpm dev
```

Preview a production build:

```sh
pnpm build && pnpm preview
```

## App Structure

```
minimovie-ui/
├── src/
│   ├── components/
│   │   ├── cards/
│   │   │   ├── credit-card.astro
│   │   │   ├── episode-card.astro
│   │   │   ├── media-card.astro
│   │   │   ├── person-card.astro
│   │   │   └── season-card.astro
│   │   │
│   │   ├── icons/
│   │   │   └── index.ts
│   │   │
│   │   ├── layout/
│   │   │   ├── breadcrumbs.astro
│   │   │   ├── footer.astro
│   │   │   └── header.astro
│   │   │
│   │   ├── search/
│   │   │   └── search-box.astro
│   │   │
│   │   ├── sections/
│   │   │   ├── collection-info.astro
│   │   │   ├── crew-grid.astro
│   │   │   ├── key-crew.astro
│   │   │   ├── top-cast.astro
│   │   │   └── where-to-watch.astro
│   │   │
│   │   ├── starwind/                # Starwind UI components
│   │   │
│   │   └── theme/
│   │       └── theme-toggle.astro
│   │
│   ├── layouts/
│   │   └── Layout.astro
│   │
│   ├── lib/
│   │   ├── api.ts                   # API client (fetchAPI, search, getMovie, etc.)
│   │   ├── logger.ts                # Server-side logger
│   │   ├── types.ts                 # Shared TypeScript types
│   │   └── utils.ts                 # Utility functions
│   │
│   ├── pages/
│   │   ├── api/
│   │   │   └── search.ts            # Search autocomplete endpoint
│   │   ├── index.astro              # Home page
│   │   ├── search.astro             # Search results
│   │   ├── movies/
│   │   │   └── [id].astro           # Movie details
│   │   ├── people/
│   │   │   └── [id].astro           # Person details
│   │   └── series/
│   │       ├── [id].astro           # Series details
│   │       └── [seriesId]/
│   │           └── seasons/
│   │               └── [seasonNumber]/
│   │                   └── [episodeNumber].astro
│   │
│   └── styles/
│       └── starwind.css
│
├── openapi/
│   └── minimovie-api.yaml           # API specification
│
├── astro.config.mjs
├── eslint.config.js
├── package.json
├── starwind.config.json
└── tsconfig.json
```

## Pages

| Route | Page | Description |
| --- | --- | --- |
| `/` | Home | Hero search box |
| `/search?q=` | Search Results | Multi-search with pagination |
| `/movies/:id` | Movie Details | Cast, crew, watch providers, collection info |
| `/series/:id` | Series Details | Cast, crew, seasons list, watch providers |
| `/series/:id/seasons/:num/:ep` | Episode Details | Episode cast and crew |
| `/people/:id` | Person Details | Combined movie and series credits |

## API Integration

All data is fetched server-side during SSR via `src/lib/api.ts`. The API client authenticates with a bearer token and provides functions for each entity type (`getMovie`, `getSeries`, `getSeason`, `getEpisode`, `getPerson`, `search`).

The only client-side API call is the search autocomplete in the `SearchBox` component, which hits the internal `/api/search` endpoint.
