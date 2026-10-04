# Media-team admin setup

Full setup and security notes are in the project-root [`ADMIN_SETUP.md`](https://github.com/tamiasdrahcir/CSA-TimeTravel/blob/main/ADMIN_SETUP.md) once the repository is published.

## Quick start

1. Run the Django backend in `server/` (see the root guide for exact commands): create a virtualenv, install `requirements.txt`, copy `.env.example` to `.env`, run `manage.py migrate`.
2. Create staff accounts via `manage.py shell` and add them to the `Media Team` group. There is no public sign-up endpoint.
3. Set `VITE_API_BASE_URL` in `.env.local` for local development, or as a GitHub Actions repository **variable** for deployment (it's a URL, not a secret).
4. Deploy the Django backend to PythonAnywhere (or another host that runs Python); GitHub Pages only serves the static React frontend and cannot run Django itself.
5. Open **Media team** in the game header and sign in. Admins can add, edit, activate/deactivate, and delete event challenges and upload photos.

At least five active challenge records are required before a game can start. Only approved, CSA-owned/authorized photos and event details should be published. The leaderboard currently remains local to each browser.
