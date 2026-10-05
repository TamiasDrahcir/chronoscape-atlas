# Local challenge archive

The game reads from a JSON file and a folder of public images; there is no online database or in-browser editor.

1. Edit `public/data/challenges.json` in the repository.
2. Add image files to `public/images/` and use paths such as `images/event.jpg` in JSON.
3. Keep at least five active records. Use `"active": false` to keep a record out of game rounds.
4. Commit the changes and publish a new static build. See the full [local archive and GitHub Pages guide](https://github.com/TamiasDrahcir/chronoscapeatlas/blob/main/ADMIN_SETUP.md).

Files under `public/` are visible to every site visitor. Use only approved public content and never put secrets or sensitive information there. The starter records are illustrative placeholders, not verified CSA events.
