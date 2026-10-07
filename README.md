# Bug Arcade 🕹

Tiny browser games about developer life. A new game every week.

| Game | Folder |
|------|--------|
| No Internet 🦖 | [`no-internet/`](no-internet/) |
| Hungry Hole 🕳️ | [`hungry-hole/`](hungry-hole/) |
| Focus Time 🎧 | [`focus-time/`](focus-time/) |
| Friday Deploy 🔥 | [`friday-deploy/`](friday-deploy/) |

## Run locally
Open `index.html` in a browser, or serve the folder:

    python3 -m http.server 8000

## Publish (GitHub Pages)
Push to GitHub → Settings → Pages → Source: `main` branch, `/ (root)`.
The site appears at `https://<username>.github.io/<repo>/`.

## Add a new game
1. Create a folder, e.g. `my-new-game/index.html`
2. Add a card for it in the root `index.html`
