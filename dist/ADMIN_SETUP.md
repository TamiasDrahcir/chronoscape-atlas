# Media-team admin setup

Full setup and security notes are in the project-root [`ADMIN_SETUP.md`](https://github.com/TamiasDrahcir/chronoscapeatlas/blob/main/ADMIN_SETUP.md) once the repository is published.

## Quick start

1. Run the Django backend in `server/` (see the root guide for exact commands): create a virtualenv, install `requirements.txt`, copy `.env.example` to `.env`, run `manage.py migrate`.
2. Create staff accounts via `manage.py shell` and add them to the `Media Team` group. There is no public sign-up endpoint.
3. Build the frontend (`npm run build`) so Django can serve `dist/` directly alongside the API from the same origin.
4. Deploy `server/` (with the built `dist/` folder alongside it) to PythonAnywhere. Django serves both the game and the API from one app; no separate static host is needed.
5. Open **Media team** in the game header and sign in. Admins can add, edit, activate/deactivate, and delete event challenges and upload photos.

At least five active challenge records are required before a game can start. Only approved, CSA-owned/authorized photos and event details should be published. The leaderboard currently remains local to each browser.
