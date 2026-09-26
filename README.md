# 🎮 Gamer Card

Show what you're playing on your GitHub profile, blog or any website, and let visitors vote on what you play next.

- **Now playing + recently played** card, as an SVG that works anywhere an image does
- **Game info and cover art from Wikipedia**, credited and linked on every card
- **Community picks:** visitors recommend games through GitHub issues and vote with 👍
- **Exportable:** Markdown, HTML, SVG or PNG. Four themes, full or compact layout, custom accent color
- **No sign-up, no database:** your list lives in the embed link or in a `games.json` you own

Use the builder at the site root to search games, preview your card and copy the embed code.

## Embed it

| Where your list lives | Embed URL | Updates when… |
| --- | --- | --- |
| In the link (quickest) | `/api/card?data=<from the builder>` | you copy a new link from the builder |
| `games.json` in your profile repo | `/api/card?user=<github-username>` | you edit `games.json` |
| `games.json` in any repo | `/api/card?user=<you>&repo=<repo>&path=<file>.json` | you edit the file |
| A gist | `/api/card?gist=<gist-id>` | you edit the gist |
| One game, no setup | `/api/card?playing=Hades%20II&platform=PC&name=Sam` | you change the URL |

```md
[![Now playing](https://YOUR-DEPLOYMENT/api/card?user=Josiassejod1)](https://github.com/Josiassejod1)
```

```html
<a href="https://github.com/Josiassejod1"><img src="https://YOUR-DEPLOYMENT/api/card?user=Josiassejod1" alt="Now playing" width="100%" style="max-width:840px"></a>
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
[![What should I play next?](https://YOUR-DEPLOYMENT/api/picks?repo=you/you)](https://github.com/you/you/issues?q=is%3Aissue+is%3Aopen+%5BRec%5D+in%3Atitle+sort%3Areactions-%2B1-desc)

[**➕ Recommend a game**](https://github.com/you/you/issues/new?title=%5BRec%5D+) · [**👍 Vote on picks**](https://github.com/you/you/issues?q=is%3Aissue+is%3Aopen+%5BRec%5D+in%3Atitle+sort%3Areactions-%2B1-desc)
```

For a nicer form, the builder gives you an issue template to drop into `.github/ISSUE_TEMPLATE/`.

## Deploy

It runs on Vercel with zero dependencies: import the repo and deploy.

Set a **`GITHUB_TOKEN`** environment variable (a fine-grained token with no extra permissions is enough). Without one, GitHub allows only 60 API requests per hour per IP. That limit affects community picks and gist sources, and Vercel's IPs are shared. `games.json` from a repo is read from `raw.githubusercontent.com`, which doesn't need a token.

Cards are cached at the edge for an hour (picks for 10 minutes). Wikipedia lookups and images are also cached in memory.

## Develop

```sh
npm start   # http://localhost:3000
npm test
```

Requires Node 20+. `api/` holds the Vercel functions, `lib/` the logic, and `public/` the builder page.

## Credits

- Game descriptions and cover art come from [Wikipedia](https://en.wikipedia.org), via its public API. Text is licensed [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). Box art is non-free and is shown at thumbnail size under fair use; it belongs to its publishers. Cards credit Wikipedia and link each article.
- Created by [Dalvin Josias Sejour](https://github.com/Josiassejod1). MIT licensed; keep the credit if you fork it.
