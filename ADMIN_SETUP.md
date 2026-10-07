# Challenge archive and deployment

The game is hosted as static GitHub Pages files and reads challenge records from `public/data/challenges.json` and photos from `public/images/`. The optional archive-management screen uses a Cloudflare Worker to authenticate the administrator and commit approved changes to the repository. The leaderboard is stored in each player's own browser.

## Add or update a challenge

Edit `public/data/challenges.json`. The file must contain a JSON array of objects. Each active object needs the following fields:

```json
{
  "id": "welcome-social-2026",
  "image": "images/welcome-social.jpg",
  "alt": "Students gathered outdoors at a campus event",
  "caption": "A new semester, all together",
  "photoNote": "A familiar crowd. A brand-new year.",
  "title": "The first hello of fall",
  "category": "CSA · WELCOME SOCIAL",
  "date": "2026-09-12T17:30:00",
  "lat": 30.6188,
  "lng": -96.3365,
  "place": "Texas A&M campus, College Station",
  "description": "The approved event details shown after the round.",
  "active": true
}
```

Add the image file at `public/images/welcome-social.jpg`. `image` paths must start with `images/`; filenames are case-sensitive on the published Linux host. Use a unique `id`. Set `active` to `false` to hide a record from gameplay without deleting it; it can be omitted or set to `true` to include it. Keep at least five active records for the five-round game. Use only CSA-approved photos and event details. The starter data and bundled pictures are illustrative samples and must not be represented as verified CSA events.

JSON syntax matters: use double quotes, commas between fields and records, and no trailing comma after the final field. The site validates required fields, duplicate IDs, and that images stay under `public/images/` when it loads the archive.

## Publish changes to GitHub Pages without Actions

GitHub Actions is not used for this deployment. Pages serves the generated static files from a dedicated `gh-pages` branch.

### One-time GitHub setting

In the repository, open **Settings → Pages**. Set **Build and deployment → Source** to **Deploy from a branch**. Select branch `gh-pages`, folder `/(root)`, then save. The branch will be created the first time the local publish command runs. If GitHub does not yet let you choose a branch that does not exist, first create/push an empty `gh-pages` branch, select it in Pages settings, then run the publish command below.

### Publish from your computer

After editing the JSON and adding images, open a terminal in the repository and run:

```sh
npm install
npm run build
npm run deploy:pages
```

`deploy:pages` builds the site for `https://tamiasdrahcir.github.io/chronoscapeatlas/` and publishes only `dist/` to the `gh-pages` branch. It does not invoke GitHub Actions. Git must be authenticated for push access to this repository. Wait a few minutes after the first publish, then open the Pages URL shown in **Settings → Pages**.

If this is a fork or the repository name changes, update the `/chronoscapeatlas/` base in the `build:pages` script in `package.json` to match `/<repository-name>/` before publishing.

## Optional secure admin interface

The site UI alone cannot write repository files. The admin interface is enabled only when a separately deployed Cloudflare Worker URL is configured. The Worker validates entries and image files, checks the admin session on every write, and commits each archive update to both `main` (source files) and `gh-pages` (the currently served Pages files). It never gives a GitHub credential to the browser.

### 1. Create a limited GitHub token

Create a fine-grained personal access token scoped only to this repository, `TamiasDrahcir/chronoscapeatlas`, with **Contents: Read and write** permission. No Actions, Pages, or organization permissions are required. Use an account allowed to push to both `main` and `gh-pages`; repository branch rules must permit these commits. Store the token as a Worker secret only—never in a `VITE_*` variable, source file, or Pages asset.

### 2. Configure and deploy the Worker

From a terminal, change to `admin-api/` and authenticate Wrangler with your Cloudflare account. Run `npx wrangler@4 login`, then add the three secrets interactively (each command prompts for its value):

- `GITHUB_TOKEN`: the limited fine-grained token from step 1.
- `ADMIN_PASSWORD`: choose a new, strong password. The password previously shared in chat should be treated as exposed and **must not be reused**.
- `ADMIN_SESSION_SECRET`: a separately generated random secret of at least 32 bytes.

Run `npx wrangler@4 secret put GITHUB_TOKEN`, `npx wrangler@4 secret put ADMIN_PASSWORD`, and `npx wrangler@4 secret put ADMIN_SESSION_SECRET` from `admin-api/`. Use a password of at least 16 characters; the Worker refuses to start if either secret is too short.

Deploy with `npx wrangler@4 deploy`. The configured admin username is `MediaTeam`. `wrangler.toml` restricts browser requests to the public Pages origin and local Vite development, and rate-limits login attempts. Do not broaden `ALLOWED_ORIGINS` to `*`.

### 3. Connect the Pages build

In the project root, create a local `.env` file (not committed) with `VITE_ADMIN_API_URL` set to the Worker URL printed by Wrangler, for example `https://chronoscapeatlas-admin-api.<your-account>.workers.dev`. Build and publish the site with `npm run deploy:pages`. The top-bar shield opens the admin screen. An administrator signs in, edits drafts, and selects **Publish archive**.

The Worker requires the current `gh-pages` branch deployment configuration described above. Each publish commits the challenge JSON and any uploaded/deleted images to both branches; no GitHub Actions deployment is involved. Before later publishing from a local checkout, pull the latest `main` first so the local archive includes admin changes. If an update to one branch succeeds and the other fails, the API reports an error; retry the publish from the admin screen after the branch issue is corrected.

Images are limited to JPG, PNG, or WebP, at most 6 MB each and 24 MB total per save. Keep at least five active challenges. Admin sessions expire after four hours and are held only in browser memory.

## Important limits

- Visitors cannot upload photos or edit the JSON. Only the configured admin account can use the admin screen; without the separately deployed Worker, the screen remains unavailable.
- Anyone can inspect or download files in `public/`; never put private photos, secrets, or personal data there.
- The browser-local leaderboard is not shared and can be cleared by the player.
- Static files are downloadable but not protected by login or access control. Do not place any secrets or sensitive information in the challenge JSON.
- Production challenge data from the retired Django deployment was not automatically copied into these starter files. If it must be retained, export it from the deployed service and convert the authorized rows/photos into this documented format before removing the old copy.
