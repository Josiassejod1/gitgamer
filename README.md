# 🎮 gitgamer

[![CI](https://github.com/Josiassejod1/gitgamer/actions/workflows/ci.yml/badge.svg)](https://github.com/Josiassejod1/gitgamer/actions/workflows/ci.yml) [![License: MIT](https://img.shields.io/badge/License-MIT-purple.svg)](LICENSE) [![PRs welcome](https://img.shields.io/badge/PRs-welcome-pink.svg)](CONTRIBUTING.md) [![Used by](https://img.shields.io/endpoint?url=https://gitgamer-tau.vercel.app/api/stats%3Fformat%3Dshields)](https://gitgamer-tau.vercel.app)

Show what you're playing on your GitHub profile, blog or any website, and let visitors vote on what you play next.

- **Now playing + recently played** card, as an SVG that works anywhere an image does
- **Game info and cover art from Wikipedia**, credited and linked on every card
- **Community picks:** visitors recommend games through GitHub issues and vote with 👍
- **Exportable:** Markdown, HTML, SVG or PNG. Four themes, full or compact layout, custom accent color
- **No sign-up, no database:** your list lives in the embed link or in a `games.json` you own

**[⭐ Star it](https://github.com/Josiassejod1/gitgamer) · [🍴 Fork it](https://github.com/Josiassejod1/gitgamer/fork)**. Built by [Dalvin Digital](https://www.dalvindigital.com).

### 👉 [Make your card at gitgamer-tau.vercel.app](https://gitgamer-tau.vercel.app)

Search games, preview your card and copy the embed code. No sign-up.

[![Now playing: Marvel's Wolverine](https://gitgamer-tau.vercel.app/api/card?user=Josiassejod1)](https://github.com/Josiassejod1)

<sub>That's a live card, straight from [@Josiassejod1's profile](https://github.com/Josiassejod1).</sub>

## Embed it

| Where your list lives | Embed URL | Updates when… |
| --- | --- | --- |
| In the link (quickest) | `/api/card?data=<from the builder>` | you copy a new link from the builder |
| `games.json` in your profile repo | `/api/card?user=<github-username>` | you edit `games.json` |
| `games.json` in any repo | `/api/card?user=<you>&repo=<repo>&path=<file>.json` | you edit the file |
| A gist | `/api/card?gist=<gist-id>` | you edit the gist |
| One game, no setup | `/api/card?playing=Hades%20II&platform=PC&name=Sam` | you change the URL |

```md
[![Now playing](https://gitgamer-tau.vercel.app/api/card?user=Josiassejod1)](https://github.com/Josiassejod1)
```

```html
<a href="https://github.com/Josiassejod1"><img src="https://gitgamer-tau.vercel.app/api/card?user=Josiassejod1" alt="Now playing" width="100%" style="max-width:840px"></a>
```

### Options

| Param | Values | Default |
| --- | --- | --- |
| `theme` | `dark`, `light`, `neon`, `retro` | `dark` |
| `accent` | hex color without `#`, e.g. `ff00aa` | theme's accent |
| `layout` | `full`, `compact` (now playing only) | `full` |
| `recent` | `0`–`5` games shown in history | `5` |
| `format` | `svg`, `json` (for building your own UI) | `svg` |

## games.json

```json
{
  "name": "Dalvin",
  "now_playing": { "title": "Marvel's Wolverine", "platform": "PS5", "started": "2026-09-26" },
  "recently_played": [
    { "title": "Astro Bot", "platform": "PS5", "status": "Finished", "ended": "2026-09-20" },
    { "title": "Hades II", "platform": "PC", "status": "Dropped" }
  ]
}
```

Optional per game:
- `wiki`: the exact Wikipedia article title, used when search picks the wrong page
- `cover`: your own image (hosted on GitHub, `githubusercontent.com`, Wikimedia or Imgur)
- `url`: where the game links to (defaults to Wikipedia)

See [`examples/games.json`](examples/games.json).

## Community picks ("What should I play next?")

Any open issue in your repo whose title starts with `[Rec]`, or that has the `game-rec` label, counts as a recommendation. Its 👍 reactions are its votes.

```md
[![What should I play next?](https://gitgamer-tau.vercel.app/api/picks?repo=you/you)](https://github.com/you/you/issues?q=is%3Aissue+is%3Aopen+%5BRec%5D+in%3Atitle+sort%3Areactions-%2B1-desc)

[**➕ Recommend a game**](https://github.com/you/you/issues/new?title=%5BRec%5D+) · [**👍 Vote on picks**](https://github.com/you/you/issues?q=is%3Aissue+is%3Aopen+%5BRec%5D+in%3Atitle+sort%3Areactions-%2B1-desc)
```

For a nicer form, the builder gives you an issue template to drop into `.github/ISSUE_TEMPLATE/`.

## Deploy

It runs on Vercel with zero dependencies: import the repo and deploy.

Set a **`GITHUB_TOKEN`** environment variable (a fine-grained token with no extra permissions is enough). Without one, GitHub allows only 60 API requests per hour per IP. That limit affects community picks and gist sources, and Vercel's IPs are shared. `games.json` from a repo is read from `raw.githubusercontent.com`, which doesn't need a token.

Cards that read a `games.json` or gist are cached for 5 minutes, so an edit shows up within about 10 minutes (GitHub caches the raw file for up to 5). Link-only cards are cached for 6 hours, and picks for 10 minutes. Wikipedia lookups and images are also cached in memory.

### Usage stats (optional)

Want to know how many people use your deployment? In Vercel, go to **Storage → Create → Upstash Redis** (free tier) and connect it to the project. gitgamer then counts unique GitHub users with a card, and repos with a picks board.

- `/api/stats` returns `{"gamers": 250, "picks_boards": 40}`
- `/api/stats?format=badge` returns an SVG "🎮 used by 250 gamers" badge
- `/api/stats?format=shields` works with `https://img.shields.io/endpoint?url=...`

Only public identifiers are stored (GitHub usernames, gist ids and repo names that are already in card URLs). Link-only (`?data=`) and `?playing=` cards aren't counted. Without Upstash, nothing is recorded and everything else works the same.

## Develop

```sh
npm start   # http://localhost:3000
npm test
```

Requires Node 20+. `api/` holds the Vercel functions, `lib/` the logic, and `public/` the builder page.

## Contributing

It's open source, and contributions are welcome: new themes, platforms, better Wikipedia matching, or integrations like Steam and Backloggd sync. See [CONTRIBUTING.md](CONTRIBUTING.md) to get started and the [Code of Conduct](CODE_OF_CONDUCT.md). Report security issues privately ([SECURITY.md](SECURITY.md)).

## Credits

- Game descriptions and cover art come from [Wikipedia](https://en.wikipedia.org), via its public API. Text is licensed [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). Box art is non-free and is shown at thumbnail size under fair use; it belongs to its publishers. Cards credit Wikipedia and link each article.
- Created by [Dalvin Josias Sejour](https://github.com/Josiassejod1) at [Dalvin Digital Design](https://www.dalvindigital.com). MIT licensed; keep the credit if you fork it.

<a href="https://www.dalvindigital.com">
  <picture>
    <source srcset="public/dalvin-digital-logo-dark.png" media="(prefers-color-scheme: dark)">
    <img src="public/dalvin-digital-logo-light.png" alt="Dalvin Digital Design" width="200">
  </picture>
</a>

Built by **[Dalvin Digital Design](https://www.dalvindigital.com)**. Want something like this for your brand? Email [dalvin@dalvindigital.com](mailto:dalvin@dalvindigital.com).
