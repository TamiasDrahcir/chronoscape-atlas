# ChronoScope Atlas

A five-round CSA photo time-and-place guessing game. The game (`/`) is a React + TypeScript + Vite + Leaflet frontend deployed to GitHub Pages. The media-team admin workspace is a Django + Django REST Framework API (`server/`) with JWT auth, since GitHub Pages can't run a Python backend.

## Run the game locally

```sh
npm install
npm run dev
```

Without a configured API, the game runs on illustrative sample moments and browser-local leaderboard storage.

## Run the admin backend locally

```sh
cd server
python -m venv .venv
.venv\Scripts\pip install -r requirements.txt
Copy-Item .env.example .env
.venv\Scripts\python manage.py migrate
.venv\Scripts\python manage.py runserver 127.0.0.1:8000
```

Then set `VITE_API_BASE_URL=http://127.0.0.1:8000/api` in a root `.env.local` for the frontend. Full instructions — including creating staff accounts, granting media-admin access, and deploying Django to PythonAnywhere — are in [ADMIN_SETUP.md](ADMIN_SETUP.md).

## Media-team administration

The **Media team** link opens a staff sign-in and challenge manager. Public sign-up is disabled; staff accounts and the `Media Team` group are provisioned via the Django shell. Admins can create, update, publish/unpublish, and delete challenge entries, and upload event photos. At least five active challenges are needed for a game.

## Deploy

The Pages workflow deploys the frontend on pushes to `main`; the Vite base path is set to `/chronoscape-atlas/`. Add `VITE_API_BASE_URL` as a GitHub Actions repository **variable** (it's a URL, not a secret) pointing at the deployed Django API. The Django backend itself must be deployed separately (e.g. PythonAnywhere) since GitHub Pages is static-only.

## Checks

```sh
npm run build
npm run lint
```

The leaderboard is currently stored in each player's browser; it is not yet a shared database leaderboard.
