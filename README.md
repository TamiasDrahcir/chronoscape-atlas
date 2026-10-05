# ChronoScape Atlas

A five-round CSA photo time-and-place guessing game built with React, TypeScript, Vite, and Leaflet. Challenge information lives in [`public/data/challenges.json`](public/data/challenges.json); photos are regular files in `public/images/`. No database, server, account, or upload service is used. Scores remain in each player's browser.

## Run locally

```sh
npm install
npm run dev
```

## Update the archive

Edit `public/data/challenges.json` and add the corresponding approved image file to `public/images/`. Set each challenge's `image` to a path like `images/welcome.jpg`. Set `"active": false` to keep a record out of game rounds; omit it or set it true to publish. The archive management screen explains the editing workflow. Changes to the hosted site require committing the files and publishing a new build; GitHub Pages cannot save edits from a visitor's browser.

The bundled starting records and pictures are illustrative placeholders, not verified CSA event documentation. Replace them with approved content before treating the game as a real event archive.

## Publish on GitHub Pages without Actions

1. In the repository, open **Settings → Pages**. Choose **Deploy from a branch**, select branch `gh-pages` and folder `/(root)`, then save.
2. On a computer with Git access to this repository, run `npm install` and `npm run deploy:pages`.
3. The command builds the static app under `/chronoscapeatlas/` and pushes only the generated `dist/` files to `gh-pages`. It does not use GitHub Actions runners.

The first publish may take a few minutes. Future updates are published by running the same command again. GitHub Pages must be enabled for this repository; the command cannot change repository Pages settings.

See [ADMIN_SETUP.md](ADMIN_SETUP.md) for the JSON format, image handling, and more deployment detail.

## Checks

```sh
npm run build
npm run lint
```
