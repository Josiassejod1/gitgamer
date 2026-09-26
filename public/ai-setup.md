# Set up a gitgamer card with AI

Paste the prompt below into ChatGPT, Claude, Copilot or any AI assistant. Replace the games with your own, or build your list at https://www.gitgamer.com and use **Export → 🤖 Set up with AI** to get this prompt already filled in.

---

Help me add a gitgamer "now playing" card to my GitHub profile.
First, ask me for my GitHub username and use it wherever you see <YOUR-USERNAME>. Also ask what game I'm playing now (and on what platform), and what I played recently.

Background:
- GitHub shows a profile README on github.com/<YOUR-USERNAME> when a PUBLIC repository named exactly "<YOUR-USERNAME>" (same as the username) has a README.md.
- gitgamer (https://www.gitgamer.com) draws the card from a file called games.json in that repository.

Steps:
1. Check whether the repository <YOUR-USERNAME>/<YOUR-USERNAME> exists. If it doesn't, create it: public, named exactly "<YOUR-USERNAME>", with a README.md.
2. Add a file named games.json at the root of that repository, in this format:

{
  "username": "<YOUR-USERNAME>",
  "now_playing": { "title": "Marvel's Wolverine", "platform": "PS5", "started": "2026-09-26" },
  "recently_played": [
    { "title": "Astro Bot", "platform": "PS5", "status": "Finished" },
    { "title": "Hades II", "platform": "PC", "status": "Played" }
  ]
}

3. Add this line to README.md near the top. Keep everything already in the README:

[![Now playing](https://www.gitgamer.com/api/card?user=<YOUR-USERNAME>)](https://www.gitgamer.com/card?user=<YOUR-USERNAME>)

4. Commit both changes to the default branch (usually main).
5. Check https://www.gitgamer.com/card?user=<YOUR-USERNAME> shows my games. Changes can take about 10 minutes to appear on GitHub.

How to do it:
- If you can use GitHub directly (for example the gh CLI or a GitHub integration), do the steps yourself and tell me what you changed.
- If you can't, walk me through it on github.com one step at a time, and wait for me to confirm each step before the next.

Rules:
- Don't delete or rewrite anything already in my README.
- Only change README.md and games.json.
- games.json must stay valid JSON.

---

## games.json reference

| Field | Required | Notes |
| --- | --- | --- |
| `username` | no | GitHub username, shown as @username. Filled in automatically for `?user=` cards. |
| `now_playing.title` | yes | The game's name. Use the Wikipedia article title for the best cover art match. |
| `now_playing.platform` | no | e.g. PS5, PC, Switch, Xbox Series X\|S, Steam Deck |
| `now_playing.started` | no | Date as `YYYY-MM-DD` |
| `recently_played[]` | no | Up to 12 games; the first 5 show on the card. Each has `title`, and optionally `platform`, `status` (Finished, Played, Dropped, On hold, 100%), `started`, `ended`. |
| `wiki` (any game) | no | Exact Wikipedia article title, if the search picks the wrong page. |

## Card options

Add to the card URL: `&theme=dark|light|neon|retro`, `&layout=compact`, `&recent=0-5`, `&accent=ff00aa`.

Game info and cover art come from Wikipedia. gitgamer is free and open source: https://github.com/Josiassejod1/gitgamer
