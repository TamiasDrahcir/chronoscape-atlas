# ChronoScape Atlas

A five-round CSA photo time-and-place guessing game built with React, TypeScript, Vite, and Leaflet. GitHub Pages hosts the frontend; Supabase provides challenge data, invite-only media-team authentication, and storage for approved game photos. The leaderboard is stored locally in each player's browser.

## Local development

1. Copy `.env.example` to `.env.local` and fill in the Supabase project URL and publishable key.
2. Install dependencies and start Vite:

```sh
npm install
npm run dev
```

Without Supabase settings or five active challenge records, the app uses illustrative sample moments so gameplay remains available. Supabase database and Storage policies are required for secure admin behavior; see [ADMIN_SETUP.md](ADMIN_SETUP.md).

## Media team

The **Media team** link opens staff sign-in and challenge management. Public sign-up is disabled; project owners invite staff and grant the trusted `app_metadata.media_admin` role. Supabase Row Level Security is authoritative for all reads and writes. Only CSA-approved photos intended for public gameplay should be uploaded to the public photo bucket.

## Deploy

The GitHub Actions workflow deploys the Vite build to GitHub Pages on pushes to `main`. Configure `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` as repository Actions variables. Never expose a Supabase service-role key in the browser or Pages build. The workflow obtains the Pages base path for the repository subpath.

Full Supabase project, schema, invite, migration, and deployment setup is in [ADMIN_SETUP.md](ADMIN_SETUP.md). The database schema and RLS policies are in [supabase/migrations/20261004000000_initial_schema.sql](supabase/migrations/20261004000000_initial_schema.sql).

## Checks

```sh
npm run build
npm run lint
```
