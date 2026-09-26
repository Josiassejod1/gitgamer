# Contributing to gitgamer

Thanks for helping! gitgamer is small on purpose, so the bar for a good contribution is simple: it works, it's tested, and it doesn't add runtime dependencies.

## Getting started

```sh
git clone https://github.com/Josiassejod1/gitgamer.git
cd gitgamer
npm start   # http://localhost:3000
npm test
```

You need Node 20+ and nothing else. There's no install step.

## Where things live

| Path | What it does |
| --- | --- |
| `api/card.js`, `api/picks.js` | HTTP handlers (Vercel functions, also used by `server.js`) |
| `lib/sources.js` | Loads a game list from `?user=`, `?gist=`, `?data=` or `?playing=` |
| `lib/wiki.js` | Wikipedia lookup and cover art (with an allow-list of image hosts) |
| `lib/render.js` | SVG cards and themes |
| `lib/picks.js` | Community picks from GitHub issues |
| `public/` | The builder page (plain HTML/CSS/JS, no build step) |
| `test/` | `node:test` suites; network calls are mocked in `test/helpers.js` |

## Good first contributions

- **A new theme:** add an entry to `THEMES` in `lib/render.js` and to the theme picker in `public/index.html`.
- **More platforms** in the builder's `PLATFORMS` list.
- **Better Wikipedia matching** for games with ambiguous titles, with a test.
- **Integrations** that fill in `games.json` automatically (Steam, Backloggd, PSN…). Open an issue first so we can agree on the design.

## Pull requests

1. Open an issue first for anything bigger than a small fix.
2. Keep the change focused, and add or update tests in `test/`.
3. Run `npm test`; CI runs it on Node 20 and 22.
4. If you change how a card looks, include a screenshot in the PR.

## Ground rules

- **No runtime dependencies.** Node's standard library and `fetch` only.
- **Escape everything.** Any user-provided text that ends up in an SVG goes through `escapeXml`.
- **No arbitrary fetching.** New image hosts go through the allow-list in `lib/wiki.js`.
- **Keep the Wikipedia credit** on cards and in the UI.

By contributing, you agree that your contributions are licensed under the [MIT License](LICENSE) and that you'll follow the [Code of Conduct](CODE_OF_CONDUCT.md).
