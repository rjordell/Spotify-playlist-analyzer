Goal is to recreate the spotify app with additional functionality from the spotify api.

## Smart playlist shuffle script

This repo now includes a dependency-free Node script for shuffling one Spotify
playlist with better artist and genre spacing:

```powershell
npm run smart-shuffle -- --playlist <playlist-id-or-url>
```

or directly:

```powershell
node scripts/smart-shuffle-playlist.js --playlist <playlist-id-or-url>
```

The default run is a dry-run. It fetches the playlist, checkpoints progress in
`.spotify-shuffle-state/`, fetches artist genres one at a time, builds the order,
and prints before/after spacing stats.

To write changes:

```powershell
# Reorder the source playlist in place.
npm run smart-shuffle -- --playlist <playlist-id-or-url> --apply

# Safer: create or resume a new private shuffled copy.
npm run smart-shuffle -- --playlist <playlist-id-or-url> --copy-name "My Playlist - smart shuffled"
```

Authentication can use either a short-lived access token:

```powershell
$env:SPOTIFY_ACCESS_TOKEN = "<token>"
```

or refresh-token credentials:

```powershell
$env:SPOTIFY_CLIENT_ID = "<client-id>"
$env:SPOTIFY_CLIENT_SECRET = "<client-secret>"
$env:SPOTIFY_REFRESH_TOKEN = "<refresh-token>"
```

If `.env` only has `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET`, generate
and save the refresh token with:

```powershell
node scripts/smart-shuffle-playlist.js --login
```

The default login callback is `http://127.0.0.1:3000/auth/callback`, matching
the old app. If your Spotify app uses a different callback, pass it with
`--redirect-uri`.

The script is resumable. If Spotify rate-limits or fails mid-run, run the same
command again. Fetch/enrichment progress, the shuffle plan, in-place reorder
state, and copied playlist progress are all kept in the checkpoint file. Use
`--replan` when you intentionally want to throw away the saved plan and compute
a fresh order.

Useful tuning flags:

```powershell
npm run smart-shuffle -- --playlist <playlist-id-or-url> --artist-window 6 --genre-window 4 --start-index 14 --seed june-mix
```

`--start-index` is zero-based. For example, `--start-index 14` keeps playlist
positions `0` through `13` in their original order and smart-shuffles position
`14` onward.
