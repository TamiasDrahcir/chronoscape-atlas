# ChronoScape Atlas

A five-round CSA photo time-and-place guessing game. The React + TypeScript + Vite + Leaflet frontend and the Django + Django REST Framework admin API (`server/`) are built to deploy together as a single app, with Django serving the built frontend and the `/api/` endpoints from the same origin.

## Run locally (split dev servers)

```sh
npm install
npm run dev
```

Without a configured API, the game runs on illustrative sample moments and browser-local leaderboard storage. To exercise the real admin/API during development, run the backend (below) and set `VITE_API_BASE_URL=http://127.0.0.1:8000/api` in a root `.env.local`, then restart `npm run dev`.

## Run the backend locally

```sh
cd server
python -m venv .venv
.venv\Scripts\pip install -r requirements.txt
Copy-Item .env.example .env
.venv\Scripts\python manage.py migrate
.venv\Scripts\python manage.py runserver 127.0.0.1:8000
```

Full instructions — including creating staff accounts, granting media-admin access, and deploying to PythonAnywhere — are in [ADMIN_SETUP.md](ADMIN_SETUP.md).

## Media-team administration

The **Media team** link opens a staff sign-in and challenge manager. Public sign-up is disabled; staff accounts and the `Media Team` group are provisioned via the Django shell. Admins can create, update, publish/unpublish, and delete challenge entries, and upload event photos. At least five active challenges are needed for a game.

## Deploy (PythonAnywhere, single app)

Build the frontend (`npm run build`) so `dist/` sits at the repo root, then deploy `server/` to PythonAnywhere. Django serves the built frontend directly via WhiteNoise (same origin as the API), so no separate static host or CORS configuration is needed in production. See [ADMIN_SETUP.md](ADMIN_SETUP.md) for the full walkthrough.

## Checks

```sh
npm run build
npm run lint
```

The leaderboard is currently stored in each player's browser; it is not yet a shared database leaderboard.
