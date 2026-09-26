import { lookupGame, imageToDataUri, isAllowedImageUrl } from './wiki.js';

// Adds Wikipedia info to a game and resolves its cover to a data: URI.
async function resolveGame(game, withImage) {
  const wiki = await lookupGame(game.title, game.wiki);
  const src = game.cover && isAllowedImageUrl(game.cover) ? game.cover : wiki?.image;
  return {
    ...game,
    wikipedia: wiki,
    link: game.url || wiki?.url || '',
    coverUri: withImage && src ? await imageToDataUri(src) : '',
  };
}

// Turns normalized games.json data into what the renderer / JSON API needs.
export async function buildCard(data, { recent = 5, images = true } = {}) {
  // With nothing being played, the most recent game is featured instead, so fetch one extra.
  const wanted = data.recently_played.slice(0, recent + (data.now_playing ? 0 : 1));
  const [now, ...rest] = await Promise.all([
    data.now_playing ? resolveGame(data.now_playing, images) : null,
    ...wanted.map((g) => resolveGame(g, images)),
  ]);
  return { name: data.name, username: data.username, backloggd: data.backloggd, now, recent: rest };
}
