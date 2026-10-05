# Local challenge archive and deployment

The live game is static. It reads challenge records from `public/data/challenges.json` and photos from `public/images/`. There is no Django server, Supabase project, database, account system, or browser-based upload. The leaderboard is stored in each player's own browser.

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

## Important limits

- Visitors cannot upload photos or edit the JSON through the deployed page. Make file changes in the repository and publish a new build.
- Anyone can inspect or download files in `public/`; never put private photos, secrets, or personal data there.
- The browser-local leaderboard is not shared and can be cleared by the player.
- Static files are downloadable but not protected by login or access control. Do not place any secrets or sensitive information in the challenge JSON.
- Production challenge data from the retired Django deployment was not automatically copied into these starter files. If it must be retained, export it from the deployed service and convert the authorized rows/photos into this documented format before removing the old copy.
