# Supabase setup and media-team administration

ChronoScape Atlas is a static React/Vite application deployed to GitHub Pages. Supabase provides challenge records (Postgres), staff sign-in (Auth), and approved public game photos (Storage). The old Django server is retained temporarily as the source for production data migration and rollback; it is no longer used by the frontend.

## 1. Create the Supabase project

Create a Supabase project in a region acceptable for the organization. In **Project Settings → API**, copy the project URL and the publishable key (or legacy anon key). These are browser-visible values; never use the `service_role` key in the frontend, a GitHub Pages variable, or a checked-in file.

In **Authentication → Providers → Email**, keep email/password sign-in enabled and disable public sign-ups. Staff accounts must be invited by a project owner. In **Authentication → URL Configuration**, set the Site URL to the deployed Pages URL and add redirect URLs for that URL and local development (`http://localhost:5173/**`). The current repository Pages URL is expected to be `https://tamiasdrahcir.github.io/chronoscapeatlas/`; confirm it under the repository's **Settings → Pages** before configuring Supabase.

## 2. Create the database and storage policies

Open the Supabase **SQL Editor** and run the complete migration in [`supabase/migrations/20261004000000_initial_schema.sql`](supabase/migrations/20261004000000_initial_schema.sql). It creates the `challenges` table, validation constraints, active-only public reads, media-admin write policies, the `challenge-photos` public bucket, and upload/delete policies. The public bucket is intentionally for CSA-approved photos used in gameplay: anyone with an image URL can download those files. Do not upload private or unapproved draft photos to it.

The security model reads `media_admin: true` from Supabase Auth's trusted `app_metadata`; users cannot edit their own `app_metadata`. Do not substitute `user_metadata` for this claim.

## 3. Invite media admins

In **Authentication → Users**, invite each staff member by email. Once the invite creates the user, grant the trusted role in the SQL Editor, replacing the email with that user's exact address:

```sql
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
  || '{"media_admin": true}'::jsonb
where lower(email) = lower('staffer@example.com');
```

Confirm the update affected exactly one user. The staff member should accept the invite and set a password, then sign in through **Media team** in the app. Have them sign out and back in after role changes so the JWT contains the current app metadata. To revoke media access, set `media_admin` to false (or remove that key) in the user's `app_metadata` using a trusted Supabase admin channel; never grant roles from the client.

## 4. Configure local development

Copy `.env.example` to `.env.local` in the repository root and set the Supabase project URL and publishable key:

```dotenv
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
```

Then run:

```sh
npm install
npm run dev
```

Restart Vite after changing environment values. Without these values, gameplay uses illustrative sample moments and Supabase-backed admin functions are unavailable.

## 5. Configure GitHub Pages

In the repository, open **Settings → Secrets and variables → Actions → Variables** and add:

- `VITE_SUPABASE_URL` — the Supabase Project URL.
- `VITE_SUPABASE_PUBLISHABLE_KEY` — the Supabase publishable (or anon) key.

These values are public by design; database and Storage policies must remain secure even if a visitor reads them. Never create a Pages variable containing a service-role key. Ensure **Settings → Pages → Build and deployment** uses **GitHub Actions**, then push to `main` or run the workflow manually. The workflow sets the Pages base path while building, so the repository subpath is included in asset URLs.

## 6. Migrate production challenges and photos

Before changing or deleting Django, identify the authoritative deployed SQLite database and its matching media directory. The checked-out `server/db.sqlite3` may not be the live database. Make a protected backup of both, export every challenge (including inactive rows, IDs, timestamps, image URL/file path, and creator email), and copy the original photos. For a PythonAnywhere source, run this from the deployed `server/` directory with its configured virtualenv:

```sh
python manage.py dumpdata challenges.Challenge --indent 2 --output /tmp/challenges.json
```

Download that JSON fixture and the matching `server/media/` files to a trusted local migration workspace. Do not export password hashes or commit database/media backups, `.env` files, or Supabase service-role credentials.

The repository includes `scripts/import-django-fixture.mjs` to upload Django image files and import fixture rows. Install npm dependencies, set the four environment variables in a private local shell (never paste the service-role key into chat, source, GitHub Actions, or a committed file), then run the script:

```sh
export DJANGO_EXPORT_PATH=/path/to/challenges.json
export DJANGO_MEDIA_DIR=/path/to/server/media
export SUPABASE_URL=https://your-project-ref.supabase.co
read -s -p "Supabase service-role key: " SUPABASE_SERVICE_ROLE_KEY; echo
export SUPABASE_SERVICE_ROLE_KEY
node scripts/import-django-fixture.mjs
unset SUPABASE_SERVICE_ROLE_KEY
```

In PowerShell, set `$env:DJANGO_EXPORT_PATH`, `$env:DJANGO_MEDIA_DIR`, and `$env:SUPABASE_URL`, then securely read the service key and run the importer:

```powershell
$secureKey = Read-Host "Supabase service-role key" -AsSecureString
$env:SUPABASE_SERVICE_ROLE_KEY = [System.Net.NetworkCredential]::new("", $secureKey).Password
node scripts/import-django-fixture.mjs
Remove-Item Env:SUPABASE_SERVICE_ROLE_KEY
```

The script uploads existing files to the `challenge-photos` bucket and records their Storage path in `image_path`; it retains `image_url` when no uploaded file exists. It imports IDs and timestamps but leaves `created_by` null because Django user IDs do not correspond to Supabase Auth UUIDs. Run the script only against a verified export and a backup of the destination project. The service-role key bypasses RLS and must remain private.

Since explicit IDs do not advance Postgres's identity sequence, reset it after import:

```sql
select setval(
  pg_get_serial_sequence('public.challenges', 'id'),
  coalesce(max(id), 1),
  max(id) is not null
)
from public.challenges;
```

Re-invite staff and map `created_by` to their new Supabase Auth UUIDs if creator attribution is needed. Django password hashes cannot be carried over as Supabase passwords; staff must set new passwords through invitations. Compare record counts, IDs, active state, dates, coordinates, text fields, and every photo URL before switching the Pages site. Keep the old database and media backup intact through the rollback period.

## 7. Verify access before launch

Test with three identities: logged out, an invited non-admin, and a media admin.

- Logged out: can read active challenges and download approved public photos; cannot see inactive challenges, edit records, or upload/delete photos.
- Invited non-admin: still cannot see drafts or make changes.
- Media admin: can list drafts and create, edit, activate/deactivate, delete, upload, replace, and remove challenge photos.
- Game: at least five active challenges load; otherwise the sample fallback keeps the game playable. The leaderboard remains local to each browser.
- Pages: verify the deployed repository-subpath URL, assets, Supabase Auth, photos, game start, and admin help link.

Run `npm run build` and `npm run lint`. Review RLS and Storage policies in Supabase before publishing real content. Supabase free-tier quotas, pausing, backups, and retention should be checked against the current plan before relying on the service for production.

## Retiring Django

Do not remove `server/` until production data and photos have been migrated, the Pages deployment has passed the checks above, and a rollback copy is confirmed. After sign-off, Django source, requirements, and PythonAnywhere-specific deployment instructions can be removed from the active repository; retain only the protected data export required by the organization's retention policy.
