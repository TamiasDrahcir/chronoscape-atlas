# Media-team admin setup

The admin workspace is a Django + Django REST Framework API (`server/`). It issues JWTs for email/password sign-in and enforces media-team permissions server-side on every write; the React admin page only renders what the API allows, it never decides access on its own.

## 1. Run the Django backend locally

```sh
cd server
python -m venv .venv
.venv\Scripts\pip install -r requirements.txt     # Windows
# source .venv/bin/activate && pip install -r requirements.txt   # macOS/Linux
Copy-Item .env.example .env                        # Windows; or: cp .env.example .env
.venv\Scripts\python manage.py migrate
```

Edit `server/.env` and set a real `SECRET_KEY`. Keep `DEBUG=True` for local development.

## 2. Create a media-team account

Staff accounts are provisioned by a project owner — there is no public sign-up endpoint. Create a user and grant them admin rights with the shell:

```sh
.venv\Scripts\python manage.py shell
```

```python
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group

User = get_user_model()
group, _ = Group.objects.get_or_create(name="Media Team")
user = User.objects.create_user(username="staffer@example.com", email="staffer@example.com", password="choose-a-strong-password")
user.groups.add(group)
```

To revoke access later, remove the user from the "Media Team" group (or delete the user). Superusers (`is_superuser=True`, e.g. via `createsuperuser`) are always treated as admins too.

## 3. Run the backend

```sh
.venv\Scripts\python manage.py runserver 127.0.0.1:8000
```

## 4. Configure the frontend

Copy `.env.example` to `.env.local` in the project root and set:

```
VITE_API_BASE_URL=http://127.0.0.1:8000/api
```

Restart the Vite dev server after changing environment variables. Open the app and choose **Media team** in the header. Staff sign in with their provisioned email/password. The admin list and editor let them:

- add, edit, activate/deactivate, and delete event entries;
- upload JPEG, PNG, WebP, or AVIF photos up to 10 MB, or provide an existing image URL;
- set the event date/time, image alt text, caption, category, US coordinates, place, photo clue, and reveal paragraph.

Only active challenges are loaded into gameplay. At least five active entries are required to start a full game. The API rejects event dates outside September 1, 2026 – June 1, 2027 and coordinates outside the US (including Alaska and Hawaii).

## 5. Deploy the Django backend to PythonAnywhere

1. Create a PythonAnywhere account and open a **Bash console**.
2. Clone or upload the repository, then `cd` into `server/`.
3. Create a virtualenv and install requirements: `mkvirtualenv --python=/usr/bin/python3.11 chronoscope-env` then `pip install -r requirements.txt`.
4. In the **Web** tab, create a new web app (Manual configuration, matching Python version), set the virtualenv path, and point the WSGI file to import `config.wsgi.application` (edit the generated WSGI file to add the `server/` path and `os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")`).
5. Set environment variables for `SECRET_KEY`, `DEBUG=False`, `ALLOWED_HOSTS=yourusername.pythonanywhere.com`, and `CORS_ALLOWED_ORIGINS=https://tamiasdrahcir.github.io` (your Pages origin) — either in a `server/.env` file on PythonAnywhere or the Web tab's env var section.
6. In the **Web** tab's static files section, map URL `/static/` to `server/staticfiles` and `/media/` to `server/media`, then run `python manage.py collectstatic`.
7. Run `python manage.py migrate` on PythonAnywhere. SQLite is fine for this project's scale; the `db.sqlite3` file persists on disk.
8. Reload the web app from the **Web** tab.

## 6. Configure GitHub Pages

In the GitHub repository settings, add a repository **Actions variable** (Settings → Secrets and variables → Actions → *Variables* tab, not Secrets, since this is a public URL, not a credential):

- `VITE_API_BASE_URL` = `https://yourusername.pythonanywhere.com/api`

The deployment workflow injects it at build time. Push to `main`, then set **Settings → Pages → Build and deployment → Source** to **GitHub Actions**. The app is configured for `/chronoscape-atlas/`.

## Security and data notes

- The frontend never receives a Django secret key, database credentials, or superuser password — only short-lived JWT access/refresh tokens tied to a signed-in staff account.
- Media-admin status is determined by Django group membership (`Media Team`) or `is_superuser`, checked on the server for every write; the browser cannot grant itself access.
- `CORS_ALLOWED_ORIGINS` should list only the GitHub Pages origin (and `localhost` during development) — do not use a wildcard in production.
- The current leaderboard is still browser-local storage. This setup shares challenge records and photos, but it does not yet create a shared cloud leaderboard.
- Replace the prototype sample entries with CSA-approved material. Do not publish private photos or event details without permission.

