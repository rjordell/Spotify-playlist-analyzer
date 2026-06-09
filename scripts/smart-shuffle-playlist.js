#!/usr/bin/env node
"use strict";

const crypto = require("crypto");
const fs = require("fs");
const http = require("http");
const path = require("path");

const API_BASE = "https://api.spotify.com/v1";
const TOKEN_URL = "https://accounts.spotify.com/api/token";
const STATE_VERSION = 1;
const DEFAULT_STATE_DIR = ".spotify-shuffle-state";
const PLAYLIST_ITEM_PAGE_LIMIT = 50;
const ADD_ITEMS_CHUNK_SIZE = 100;

const DEFAULT_OPTIONS = {
  artistWindow: 5,
  genreWindow: 4,
  maxRetries: 5,
  baseDelayMs: 800,
  market: "",
  startIndex: 0,
};

const GENRE_BUCKETS = [
  ["hip-hop", ["hip hop", "rap", "trap", "drill", "grime"]],
  ["r-and-b", ["r&b", "rnb", "soul", "funk"]],
  ["pop", ["pop", "k-pop", "j-pop", "dance pop", "electropop", "synthpop"]],
  ["rock", ["rock", "metal", "punk", "emo", "grunge", "hardcore", "shoegaze"]],
  ["electronic", ["edm", "electro", "house", "techno", "trance", "dubstep", "dnb", "drum and bass", "bass"]],
  ["country", ["country", "americana", "bluegrass"]],
  ["latin", ["latin", "reggaeton", "urbano", "salsa", "bachata", "cumbia"]],
  ["jazz", ["jazz", "bebop", "swing"]],
  ["classical", ["classical", "orchestra", "symphony", "piano"]],
  ["folk", ["folk", "singer-songwriter", "acoustic"]],
];

function printHelp() {
  console.log(`
Smart Spotify playlist shuffle

Usage:
  node scripts/smart-shuffle-playlist.js --playlist <playlist-id-or-url> [options]

Auth:
  Set SPOTIFY_ACCESS_TOKEN, or set SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET,
  and SPOTIFY_REFRESH_TOKEN so the script can refresh an access token.

Options:
  --playlist <id|url>       Source playlist ID or Spotify playlist URL.
  --login                   Get and save SPOTIFY_REFRESH_TOKEN using browser auth.
  --redirect-uri <uri>      Login callback URI. Default matches the old app.
  --apply                   Reorder the source playlist in place.
  --copy-name <name>        Create/resume a new private shuffled copy.
  --seed <value>            Stable shuffle seed. Generated once if omitted.
  --replan                  Ignore an existing plan and compute a new one.
  --state-file <path>       Checkpoint file path.
  --market <code>           Optional market for playlist reads, for example US.
  --artist-window <n>       Recent-track artist spacing window. Default 5.
  --genre-window <n>        Recent-track genre spacing window. Default 4.
  --start-index <n>         Preserve positions before this zero-based index.
  --max-retries <n>         Retry attempts for Spotify calls. Default 5.
  --self-test               Run local algorithm checks without Spotify.
  --help                    Show this help.

Default mode is dry-run: it fetches/enriches/checkpoints the playlist and prints
quality stats without writing to Spotify. Use --apply or --copy-name to write.
`);
}

function parseArgs(argv) {
  const args = {
    dryRun: true,
    apply: false,
    copyName: "",
    replan: false,
    selfTest: false,
    login: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const readValue = () => {
      if (i + 1 >= argv.length) {
        throw new Error(`Missing value for ${arg}`);
      }
      i += 1;
      return argv[i];
    };

    switch (arg) {
      case "--help":
      case "-h":
        args.help = true;
        break;
      case "--playlist":
      case "-p":
        args.playlist = readValue();
        break;
      case "--login":
        args.login = true;
        break;
      case "--redirect-uri":
        args.redirectUri = readValue();
        break;
      case "--apply":
        args.apply = true;
        args.dryRun = false;
        break;
      case "--copy-name":
        args.copyName = readValue();
        args.dryRun = false;
        break;
      case "--seed":
        args.seed = readValue();
        break;
      case "--replan":
        args.replan = true;
        break;
      case "--state-file":
        args.stateFile = readValue();
        break;
      case "--market":
        args.market = readValue().trim().toUpperCase();
        break;
      case "--artist-window":
        args.artistWindow = readPositiveInt(arg, readValue());
        break;
      case "--genre-window":
        args.genreWindow = readPositiveInt(arg, readValue());
        break;
      case "--start-index":
        args.startIndex = readNonNegativeInt(arg, readValue());
        break;
      case "--max-retries":
        args.maxRetries = readPositiveInt(arg, readValue());
        break;
      case "--self-test":
        args.selfTest = true;
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (args.apply && args.copyName) {
    throw new Error("Choose either --apply or --copy-name, not both.");
  }

  return args;
}

function readPositiveInt(name, value) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`${name} must be a positive integer.`);
  }
  return parsed;
}

function readNonNegativeInt(name, value) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${name} must be zero or a positive integer.`);
  }
  return parsed;
}

function loadEnvFiles() {
  for (const fileName of [".env", "test.env"]) {
    const filePath = path.resolve(process.cwd(), fileName);
    if (!fs.existsSync(filePath)) {
      continue;
    }

    const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }
      const equalsIndex = trimmed.indexOf("=");
      if (equalsIndex === -1) {
        continue;
      }
      const key = trimmed.slice(0, equalsIndex).trim();
      let value = trimmed.slice(equalsIndex + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (key && process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  }
}

function extractPlaylistId(input) {
  if (!input) {
    throw new Error("Missing --playlist.");
  }

  const trimmed = input.trim();
  const uriMatch = trimmed.match(/^spotify:playlist:([A-Za-z0-9]+)$/);
  if (uriMatch) {
    return uriMatch[1];
  }

  const urlMatch = trimmed.match(/open\.spotify\.com\/playlist\/([A-Za-z0-9]+)/);
  if (urlMatch) {
    return urlMatch[1];
  }

  const simpleIdMatch = trimmed.match(/^[A-Za-z0-9]+$/);
  if (simpleIdMatch) {
    return trimmed;
  }

  throw new Error("Could not parse playlist ID. Pass an ID, Spotify URI, or open.spotify.com playlist URL.");
}

function defaultStateFile(playlistId) {
  return path.resolve(process.cwd(), DEFAULT_STATE_DIR, `${playlistId}.json`);
}

function loadCheckpoint(filePath, playlistId) {
  if (!fs.existsSync(filePath)) {
    return {
      version: STATE_VERSION,
      playlistId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      source: {},
      tracks: [],
      artists: {},
      plan: null,
      apply: {},
    };
  }

  const checkpoint = JSON.parse(fs.readFileSync(filePath, "utf8"));
  if (checkpoint.playlistId !== playlistId) {
    throw new Error(`Checkpoint belongs to playlist ${checkpoint.playlistId}, not ${playlistId}.`);
  }
  if (checkpoint.version !== STATE_VERSION) {
    throw new Error(`Unsupported checkpoint version ${checkpoint.version}.`);
  }
  checkpoint.source = checkpoint.source || {};
  checkpoint.tracks = checkpoint.tracks || [];
  checkpoint.artists = checkpoint.artists || {};
  checkpoint.apply = checkpoint.apply || {};
  return checkpoint;
}

function saveCheckpoint(filePath, checkpoint) {
  checkpoint.updatedAt = new Date().toISOString();
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tempFile = `${filePath}.tmp`;
  fs.writeFileSync(tempFile, `${JSON.stringify(checkpoint, null, 2)}\n`);
  fs.renameSync(tempFile, filePath);
}

function clearPlanAndFetch(checkpoint) {
  checkpoint.source = {};
  checkpoint.tracks = [];
  checkpoint.artists = checkpoint.artists || {};
  checkpoint.plan = null;
  checkpoint.apply = {};
}

async function refreshAccessToken(client) {
  if (!client.refreshToken || !client.clientId || !client.clientSecret) {
    return false;
  }

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: client.refreshToken,
  });
  const auth = Buffer.from(`${client.clientId}:${client.clientSecret}`).toString("base64");
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`Failed to refresh Spotify token: ${response.status} ${JSON.stringify(payload)}`);
  }

  client.accessToken = payload.access_token;
  return true;
}

async function runLoginFlow(args) {
  const clientId = process.env.SPOTIFY_CLIENT_ID || "";
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET || "";
  const redirectUri = args.redirectUri || process.env.SPOTIFY_REDIRECT_URI || "http://127.0.0.1:3000/auth/callback";
  if (!clientId || !clientSecret) {
    throw new Error("Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET in .env before running --login.");
  }

  const redirect = new URL(redirectUri);
  const state = crypto.randomBytes(16).toString("hex");
  const verifier = crypto.randomBytes(32).toString("hex");
  const scope = [
    "playlist-read-private",
    "playlist-read-collaborative",
    "playlist-modify-private",
    "playlist-modify-public",
  ].join(" ");

  const authParams = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    scope,
    redirect_uri: redirectUri,
    state,
    show_dialog: "true",
  });

  console.log("Open this URL in your browser and approve Spotify access:");
  console.log(`https://accounts.spotify.com/authorize?${authParams.toString()}`);
  console.log(`Waiting for callback on ${redirectUri} ...`);

  const code = await waitForAuthCode(redirect, state);
  const tokenBody = new URLSearchParams({
    code,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: tokenBody,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`Spotify token exchange failed: ${response.status} ${JSON.stringify(payload)}`);
  }
  if (!payload.refresh_token) {
    throw new Error("Spotify did not return a refresh token. Try --login again, or remove the app grant from your Spotify account first.");
  }

  updateEnvFile({
    SPOTIFY_REFRESH_TOKEN: payload.refresh_token,
  });
  console.log("Saved SPOTIFY_REFRESH_TOKEN to .env.");
}

function waitForAuthCode(redirect, expectedState) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      try {
        const currentUrl = new URL(req.url, `${redirect.protocol}//${redirect.host}`);
        if (currentUrl.pathname !== redirect.pathname) {
          res.writeHead(404);
          res.end("Not found.");
          return;
        }

        const error = currentUrl.searchParams.get("error");
        const state = currentUrl.searchParams.get("state");
        const code = currentUrl.searchParams.get("code");
        if (error) {
          throw new Error(`Spotify authorization failed: ${error}`);
        }
        if (state !== expectedState) {
          throw new Error("Spotify authorization state did not match.");
        }
        if (!code) {
          throw new Error("Spotify callback did not include an authorization code.");
        }

        res.writeHead(200, { "Content-Type": "text/plain" });
        res.end("Spotify auth complete. You can close this tab and return to the script.");
        server.close(() => resolve(code));
      } catch (error) {
        res.writeHead(400, { "Content-Type": "text/plain" });
        res.end(error.message);
        server.close(() => reject(error));
      }
    });

    server.on("error", reject);
    server.listen(Number(redirect.port || 80), redirect.hostname === "localhost" ? undefined : redirect.hostname);
  });
}

function updateEnvFile(values) {
  const filePath = path.resolve(process.cwd(), ".env");
  const existing = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8").split(/\r?\n/) : [];
  const remaining = new Map(Object.entries(values));
  const nextLines = existing.map((line) => {
    const trimmed = line.trim();
    const equalsIndex = trimmed.indexOf("=");
    if (!trimmed || trimmed.startsWith("#") || equalsIndex === -1) {
      return line;
    }
    const key = trimmed.slice(0, equalsIndex).trim();
    if (!remaining.has(key)) {
      return line;
    }
    const value = remaining.get(key);
    remaining.delete(key);
    return `${key}=${value}`;
  });

  for (const [key, value] of remaining) {
    nextLines.push(`${key}=${value}`);
  }

  fs.writeFileSync(filePath, `${nextLines.filter((line, index) => line || index < nextLines.length - 1).join("\n")}\n`);
}

async function createSpotifyClient(options) {
  if (typeof fetch !== "function") {
    throw new Error("This script needs Node 18+ because it uses the built-in fetch API.");
  }

  const client = {
    accessToken: process.env.SPOTIFY_ACCESS_TOKEN || "",
    refreshToken: process.env.SPOTIFY_REFRESH_TOKEN || "",
    clientId: process.env.SPOTIFY_CLIENT_ID || "",
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET || "",
    maxRetries: options.maxRetries,
    baseDelayMs: options.baseDelayMs,
  };

  if (!client.accessToken && client.refreshToken) {
    await refreshAccessToken(client);
  }

  if (!client.accessToken) {
    throw new Error(
      "Missing Spotify auth. Set SPOTIFY_ACCESS_TOKEN, or set SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, and SPOTIFY_REFRESH_TOKEN."
    );
  }

  return client;
}

async function spotifyRequest(client, method, endpoint, body = null, allowRefresh = true) {
  const url = endpoint.startsWith("https://") ? endpoint : `${API_BASE}${endpoint}`;
  let lastError = null;

  for (let attempt = 0; attempt <= client.maxRetries; attempt += 1) {
    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${client.accessToken}`,
        "Content-Type": "application/json",
      },
      body: body === null ? undefined : JSON.stringify(body),
    });

    if (response.status === 401 && allowRefresh && (await refreshAccessToken(client))) {
      return spotifyRequest(client, method, endpoint, body, false);
    }

    if (response.status === 204) {
      return {};
    }

    const text = await response.text();
    const payload = parseJsonOrText(text);
    if (response.ok) {
      return payload;
    }

    lastError = new Error(`Spotify API ${method} ${url} failed: ${response.status} ${formatPayload(payload)}`);
    lastError.status = response.status;
    lastError.payload = payload;

    if (attempt < client.maxRetries && (response.status === 429 || response.status >= 500)) {
      const retryAfter = Number.parseInt(response.headers.get("retry-after") || "", 10);
      const waitMs = Number.isInteger(retryAfter)
        ? retryAfter * 1000
        : client.baseDelayMs * Math.pow(2, attempt);
      await sleep(waitMs);
      continue;
    }

    break;
  }

  throw lastError;
}

function parseJsonOrText(text) {
  if (!text) {
    return {};
  }
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function formatPayload(payload) {
  return typeof payload === "string" ? payload : JSON.stringify(payload);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchPlaylistMetadata(client, playlistId) {
  return spotifyRequest(client, "GET", `/playlists/${encodeURIComponent(playlistId)}`);
}

function buildItemsEndpoint(playlistId, offset, market) {
  const params = new URLSearchParams({
    limit: String(PLAYLIST_ITEM_PAGE_LIMIT),
    offset: String(offset),
    additional_types: "track",
    fields: "total,limit,offset,next,items(added_at,is_local,item(id,uri,name,type,artists(id,name,uri)))",
  });
  if (market) {
    params.set("market", market);
  }
  return `/playlists/${encodeURIComponent(playlistId)}/items?${params.toString()}`;
}

async function fetchPlaylistItemsFresh(client, playlistId, market) {
  const metadata = await fetchPlaylistMetadata(client, playlistId);
  const tracks = [];
  let total = Number.isInteger(metadata.tracks && metadata.tracks.total) ? metadata.tracks.total : null;
  let offset = 0;

  do {
    const page = await spotifyRequest(client, "GET", buildItemsEndpoint(playlistId, offset, market));
    total = Number.isInteger(page.total) ? page.total : total;
    for (const item of page.items || []) {
      const simplified = simplifyPlaylistItem(item, tracks.length);
      if (simplified) {
        tracks.push(simplified);
      }
    }
    offset += PLAYLIST_ITEM_PAGE_LIMIT;
  } while (total !== null && offset < total);

  return {
    metadata,
    snapshotId: metadata.snapshot_id,
    tracks,
  };
}

async function ensureSourceTracks(client, playlistId, checkpoint, save, options) {
  const metadata = await fetchPlaylistMetadata(client, playlistId);
  const total = Number.isInteger(metadata.tracks && metadata.tracks.total) ? metadata.tracks.total : null;
  const sameSource =
    checkpoint.source &&
    checkpoint.source.snapshotId === metadata.snapshot_id &&
    checkpoint.tracks.length > 0 &&
    (total === null || checkpoint.tracks.length === total);

  if (sameSource) {
    return checkpoint.tracks;
  }

  checkpoint.source = {
    id: metadata.id,
    name: metadata.name,
    snapshotId: metadata.snapshot_id,
    total,
    fetchedOffsets: [],
  };
  checkpoint.tracks = [];
  checkpoint.plan = null;
  checkpoint.apply = {};
  save();

  let offset = 0;
  while (total === null || offset < total) {
    const page = await spotifyRequest(client, "GET", buildItemsEndpoint(playlistId, offset, options.market));
    const pageItems = [];
    for (const item of page.items || []) {
      const simplified = simplifyPlaylistItem(item, checkpoint.tracks.length + pageItems.length);
      if (simplified) {
        pageItems.push(simplified);
      }
    }
    checkpoint.tracks.push(...pageItems);
    checkpoint.source.total = Number.isInteger(page.total) ? page.total : total;
    checkpoint.source.fetchedOffsets.push(offset);
    save();

    if (!page.next && offset + PLAYLIST_ITEM_PAGE_LIMIT >= checkpoint.source.total) {
      break;
    }
    offset += PLAYLIST_ITEM_PAGE_LIMIT;
  }

  return checkpoint.tracks;
}

function simplifyPlaylistItem(entry, sourceIndex) {
  const item = entry.item || entry.track;
  if (!item || !item.uri) {
    return null;
  }

  const artists = Array.isArray(item.artists)
    ? item.artists.map((artist) => ({
        id: artist.id || "",
        name: artist.name || "",
        uri: artist.uri || "",
      }))
    : [];

  return {
    sourceIndex,
    addedAt: entry.added_at || null,
    isLocal: Boolean(entry.is_local || item.is_local),
    type: item.type || "track",
    id: item.id || "",
    uri: item.uri,
    name: item.name || item.uri,
    artists,
  };
}

async function ensureArtistInfo(client, tracks, checkpoint, save) {
  const artistIds = Array.from(
    new Set(
      tracks
        .flatMap((track) => track.artists || [])
        .map((artist) => artist.id)
        .filter(Boolean)
    )
  ).sort();

  checkpoint.artists = checkpoint.artists || {};

  for (const artistId of artistIds) {
    if (checkpoint.artists[artistId]) {
      continue;
    }

    try {
      const artist = await spotifyRequest(client, "GET", `/artists/${encodeURIComponent(artistId)}`);
      checkpoint.artists[artistId] = {
        id: artist.id || artistId,
        name: artist.name || "",
        genres: Array.isArray(artist.genres) ? artist.genres : [],
      };
    } catch (error) {
      if (error.status === 404) {
        checkpoint.artists[artistId] = {
          id: artistId,
          name: "",
          genres: [],
          missing: true,
        };
      } else {
        save();
        throw error;
      }
    }

    save();
  }

  return checkpoint.artists;
}

function makePlan(tracks, artistsById, args) {
  const seed = args.seed || crypto.randomBytes(8).toString("hex");
  const options = {
    artistWindow: args.artistWindow || DEFAULT_OPTIONS.artistWindow,
    genreWindow: args.genreWindow || DEFAULT_OPTIONS.genreWindow,
  };
  const featuredTracks = buildTrackFeatures(tracks, artistsById);
  const startIndex = args.startIndex || DEFAULT_OPTIONS.startIndex;
  if (startIndex > featuredTracks.length) {
    throw new Error(`--start-index ${startIndex} is beyond the playlist length ${featuredTracks.length}.`);
  }

  const preservedPrefix = featuredTracks.slice(0, startIndex);
  const shuffleRegion = featuredTracks.slice(startIndex);
  const shuffledRegion = smartShuffle(shuffleRegion, seed, options);
  const desiredOrder = preservedPrefix.concat(shuffledRegion);
  const originalStats = analyzeOrder(featuredTracks);
  const shuffledStats = analyzeOrder(desiredOrder);
  const previewStart = Math.max(0, startIndex - 3);

  return {
    seed,
    options,
    startIndex,
    preservedPrefixCount: preservedPrefix.length,
    generatedAt: new Date().toISOString(),
    desiredUris: desiredOrder.map((track) => track.uri),
    desiredTrackIds: desiredOrder.map((track) => track.id || track.uri),
    preview: desiredOrder.slice(previewStart, previewStart + 30).map((track, index) => previewTrack(track, previewStart + index)),
    originalStats,
    shuffledStats,
    shuffledRegionStats: analyzeOrder(shuffledRegion),
  };
}

function buildTrackFeatures(tracks, artistsById) {
  return tracks.map((track) => {
    const artistIds = (track.artists || []).map((artist) => artist.id).filter(Boolean);
    const artistNames = (track.artists || []).map((artist) => artist.name).filter(Boolean);
    const primaryArtistKey =
      artistIds[0] ||
      (artistNames[0] ? `name:${normalizeKey(artistNames[0])}` : `item:${normalizeKey(track.uri)}`);

    const genres = unique(
      artistIds.flatMap((artistId) => {
        const artist = artistsById[artistId];
        return artist && Array.isArray(artist.genres) ? artist.genres : [];
      })
    );
    const normalizedGenres = genres.map(normalizeGenre).filter(Boolean);
    const genreBuckets = unique(normalizedGenres.map(toGenreBucket));
    const primaryGenre = genreBuckets.find((genre) => genre !== "unknown") || normalizedGenres[0] || "unknown";

    return {
      ...track,
      artistIds,
      artistNames,
      primaryArtistKey,
      primaryArtistName: artistNames[0] || "Unknown artist",
      genres: normalizedGenres,
      genreBuckets,
      primaryGenre,
    };
  });
}

function smartShuffle(tracks, seed, options) {
  const remaining = tracks.map((track) => ({ ...track }));
  stableShuffle(remaining, seed);

  const placed = [];
  const placedArtistCounts = new Map();
  const placedGenreCounts = new Map();
  const totalArtistCounts = countBy(remaining, (track) => track.primaryArtistKey);
  const totalGenreCounts = countBy(remaining, (track) => track.primaryGenre);

  while (remaining.length > 0) {
    let bestIndex = 0;
    let bestScore = Number.POSITIVE_INFINITY;

    for (let i = 0; i < remaining.length; i += 1) {
      const candidate = remaining[i];
      const score = scoreCandidate(candidate, placed, {
        position: placed.length,
        total: tracks.length,
        seed,
        options,
        placedArtistCounts,
        placedGenreCounts,
        totalArtistCounts,
        totalGenreCounts,
      });
      if (score < bestScore) {
        bestScore = score;
        bestIndex = i;
      }
    }

    const [chosen] = remaining.splice(bestIndex, 1);
    placed.push(chosen);
    incrementMap(placedArtistCounts, chosen.primaryArtistKey);
    incrementMap(placedGenreCounts, chosen.primaryGenre);
  }

  return improveOrder(placed, seed, options);
}

function scoreCandidate(candidate, placed, context) {
  const { position, total, seed, options, placedArtistCounts, placedGenreCounts, totalArtistCounts, totalGenreCounts } =
    context;
  let score = stableNoise(seed, position, candidate.uri) * 0.25;

  for (let distance = 1; distance <= options.artistWindow; distance += 1) {
    const previous = placed[placed.length - distance];
    if (!previous) {
      break;
    }
    const closeness = (options.artistWindow + 1 - distance) / options.artistWindow;
    if (candidate.primaryArtistKey === previous.primaryArtistKey) {
      score += 120 * closeness;
    }
    if (setsOverlap(candidate.artistIds, previous.artistIds)) {
      score += 55 * closeness;
    }
  }

  for (let distance = 1; distance <= options.genreWindow; distance += 1) {
    const previous = placed[placed.length - distance];
    if (!previous) {
      break;
    }
    const closeness = (options.genreWindow + 1 - distance) / options.genreWindow;
    if (candidate.primaryGenre !== "unknown" && candidate.primaryGenre === previous.primaryGenre) {
      score += 36 * closeness;
    }
    const overlapCount = intersectionSize(candidate.genreBuckets, previous.genreBuckets);
    if (overlapCount > 0 && !candidate.genreBuckets.includes("unknown")) {
      score += 16 * overlapCount * closeness;
    }
  }

  const artistTotal = totalArtistCounts.get(candidate.primaryArtistKey) || 1;
  const artistPlaced = placedArtistCounts.get(candidate.primaryArtistKey) || 0;
  const artistExpected = (artistTotal * position) / total;
  score += (artistPlaced - artistExpected) * 8;

  if (candidate.primaryGenre !== "unknown") {
    const genreTotal = totalGenreCounts.get(candidate.primaryGenre) || 1;
    const genrePlaced = placedGenreCounts.get(candidate.primaryGenre) || 0;
    const genreExpected = (genreTotal * position) / total;
    score += (genrePlaced - genreExpected) * 4;
  }

  return score;
}

function improveOrder(order, seed, options) {
  let best = order.slice();
  let bestScore = orderCost(best, options);
  const maxRounds = Math.min(5, Math.max(1, Math.floor(order.length / 50) + 1));

  for (let round = 0; round < maxRounds; round += 1) {
    let improved = false;
    for (let i = 0; i < best.length - 1; i += 1) {
      for (let offset = 1; offset <= 20 && i + offset < best.length; offset += 1) {
        const j = i + offset;
        const candidate = best.slice();
        [candidate[i], candidate[j]] = [candidate[j], candidate[i]];
        const candidateScore = orderCost(candidate, options) + stableNoise(seed, i, `${candidate[i].uri}:${j}`) * 0.01;
        if (candidateScore < bestScore) {
          best = candidate;
          bestScore = candidateScore;
          improved = true;
          break;
        }
      }
      if (improved) {
        break;
      }
    }
    if (!improved) {
      break;
    }
  }

  return best;
}

function orderCost(order, options) {
  let cost = 0;
  for (let i = 0; i < order.length; i += 1) {
    const current = order[i];
    for (let distance = 1; distance <= options.artistWindow && i - distance >= 0; distance += 1) {
      const previous = order[i - distance];
      const closeness = (options.artistWindow + 1 - distance) / options.artistWindow;
      if (current.primaryArtistKey === previous.primaryArtistKey) {
        cost += 120 * closeness;
      }
      if (setsOverlap(current.artistIds, previous.artistIds)) {
        cost += 55 * closeness;
      }
    }
    for (let distance = 1; distance <= options.genreWindow && i - distance >= 0; distance += 1) {
      const previous = order[i - distance];
      const closeness = (options.genreWindow + 1 - distance) / options.genreWindow;
      if (current.primaryGenre !== "unknown" && current.primaryGenre === previous.primaryGenre) {
        cost += 36 * closeness;
      }
      cost += 16 * intersectionSize(current.genreBuckets, previous.genreBuckets) * closeness;
    }
  }
  return cost;
}

function analyzeOrder(order) {
  let adjacentSamePrimaryArtist = 0;
  let adjacentSharedArtist = 0;
  let adjacentSameGenre = 0;
  let adjacentSharedGenreBucket = 0;
  let maxArtistRun = 0;
  let maxGenreRun = 0;
  let artistRun = 0;
  let genreRun = 0;
  let previous = null;

  for (const track of order) {
    if (previous) {
      if (track.primaryArtistKey === previous.primaryArtistKey) {
        adjacentSamePrimaryArtist += 1;
        artistRun += 1;
      } else {
        artistRun = 1;
      }
      if (setsOverlap(track.artistIds, previous.artistIds)) {
        adjacentSharedArtist += 1;
      }
      if (track.primaryGenre !== "unknown" && track.primaryGenre === previous.primaryGenre) {
        adjacentSameGenre += 1;
        genreRun += 1;
      } else {
        genreRun = 1;
      }
      if (intersectionSize(track.genreBuckets, previous.genreBuckets) > 0 && !track.genreBuckets.includes("unknown")) {
        adjacentSharedGenreBucket += 1;
      }
    } else {
      artistRun = 1;
      genreRun = 1;
    }

    maxArtistRun = Math.max(maxArtistRun, artistRun);
    maxGenreRun = Math.max(maxGenreRun, genreRun);
    previous = track;
  }

  return {
    totalItems: order.length,
    adjacentSamePrimaryArtist,
    adjacentSharedArtist,
    adjacentSameGenre,
    adjacentSharedGenreBucket,
    maxArtistRun,
    maxGenreRun,
  };
}

function previewTrack(track, index) {
  return {
    position: index,
    name: track.name,
    artists: track.artistNames.join(", ") || "Unknown artist",
    genre: track.primaryGenre,
    uri: track.uri,
  };
}

async function applyInPlace(client, playlistId, desiredUris, checkpoint, save, options) {
  console.log("Reading current playlist order before in-place reorder...");
  let current = await fetchPlaylistItemsFresh(client, playlistId, options.market);
  let currentUris = current.tracks.map((track) => track.uri);
  let snapshotId = current.snapshotId;

  assertSameMultiset(currentUris, desiredUris);

  checkpoint.apply = {
    mode: "in-place",
    startedAt: checkpoint.apply.startedAt || new Date().toISOString(),
    snapshotId,
    completedMoves: checkpoint.apply.completedMoves || 0,
  };
  save();

  for (let targetIndex = 0; targetIndex < desiredUris.length; targetIndex += 1) {
    if (currentUris[targetIndex] === desiredUris[targetIndex]) {
      continue;
    }

    const sourceIndex = currentUris.findIndex((uri, index) => index > targetIndex && uri === desiredUris[targetIndex]);
    if (sourceIndex === -1) {
      throw new Error(`Could not find planned URI ${desiredUris[targetIndex]} after position ${targetIndex}.`);
    }

    const payload = {
      range_start: sourceIndex,
      insert_before: targetIndex,
      range_length: 1,
      snapshot_id: snapshotId,
    };

    const response = await spotifyRequest(client, "PUT", `/playlists/${encodeURIComponent(playlistId)}/items`, payload);
    snapshotId = response.snapshot_id || snapshotId;

    const [moved] = currentUris.splice(sourceIndex, 1);
    currentUris.splice(targetIndex, 0, moved);

    checkpoint.apply.snapshotId = snapshotId;
    checkpoint.apply.completedMoves += 1;
    checkpoint.apply.lastTargetIndex = targetIndex;
    save();

    if (checkpoint.apply.completedMoves % 25 === 0) {
      console.log(`Applied ${checkpoint.apply.completedMoves} reorder moves...`);
    }
  }

  checkpoint.apply.finishedAt = new Date().toISOString();
  save();
  console.log(`In-place shuffle complete. Moves applied: ${checkpoint.apply.completedMoves}`);
}

async function applyCopy(client, desiredUris, checkpoint, save, copyName, sourceName, options) {
  const localUris = desiredUris.filter((uri) => uri.startsWith("spotify:local:"));
  if (localUris.length > 0) {
    throw new Error(
      "Spotify does not allow local files to be added through the Web API. Use --apply to reorder the original playlist instead."
    );
  }

  checkpoint.apply = checkpoint.apply || {};
  checkpoint.apply.mode = "copy";
  checkpoint.apply.startedAt = checkpoint.apply.startedAt || new Date().toISOString();

  if (!checkpoint.apply.destinationPlaylistId) {
    const playlist = await spotifyRequest(client, "POST", "/me/playlists", {
      name: copyName,
      public: false,
      description: `Smart shuffle copy of ${sourceName || "playlist"} generated ${new Date().toISOString()}.`,
    });
    checkpoint.apply.destinationPlaylistId = playlist.id;
    checkpoint.apply.destinationName = playlist.name;
    checkpoint.apply.completedItems = 0;
    save();
    console.log(`Created shuffled copy: ${playlist.name} (${playlist.id})`);
  }

  const destinationId = checkpoint.apply.destinationPlaylistId;
  const destination = await fetchPlaylistItemsFresh(client, destinationId, options.market);
  const destinationUris = destination.tracks.map((track) => track.uri);
  const completedItems = commonPrefixLength(destinationUris, desiredUris);

  if (completedItems !== destinationUris.length) {
    throw new Error(
      `Destination playlist ${destinationId} no longer matches the planned prefix. Stop and inspect before resuming.`
    );
  }

  checkpoint.apply.completedItems = completedItems;
  save();

  for (let offset = completedItems; offset < desiredUris.length; offset += ADD_ITEMS_CHUNK_SIZE) {
    const chunk = desiredUris.slice(offset, Math.min(offset + ADD_ITEMS_CHUNK_SIZE, desiredUris.length));
    const response = await spotifyRequest(client, "POST", `/playlists/${encodeURIComponent(destinationId)}/items`, {
      uris: chunk,
      position: offset,
    });
    checkpoint.apply.completedItems = offset + chunk.length;
    checkpoint.apply.snapshotId = response.snapshot_id || checkpoint.apply.snapshotId;
    save();
    console.log(`Copied ${checkpoint.apply.completedItems}/${desiredUris.length} items...`);
  }

  checkpoint.apply.finishedAt = new Date().toISOString();
  save();
  console.log(`Copy shuffle complete: ${destinationId}`);
}

function assertSameMultiset(currentUris, desiredUris) {
  const current = countBy(currentUris, (uri) => uri);
  const desired = countBy(desiredUris, (uri) => uri);
  const keys = new Set([...current.keys(), ...desired.keys()]);
  for (const key of keys) {
    if ((current.get(key) || 0) !== (desired.get(key) || 0)) {
      throw new Error(
        "Current playlist items do not match the checkpointed plan. Use --replan if you intentionally changed the playlist."
      );
    }
  }
}

function commonPrefixLength(a, b) {
  const max = Math.min(a.length, b.length);
  let i = 0;
  while (i < max && a[i] === b[i]) {
    i += 1;
  }
  return i;
}

function normalizeGenre(value) {
  return normalizeKey(value).replace(/\s+/g, " ").trim();
}

function normalizeKey(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9&+\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toGenreBucket(genre) {
  if (!genre) {
    return "unknown";
  }
  for (const [bucket, hints] of GENRE_BUCKETS) {
    if (hints.some((hint) => genre.includes(hint))) {
      return bucket;
    }
  }
  return genre;
}

function stableShuffle(items, seed) {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(stableNoise(seed, i, items[i].uri || String(i)) * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
}

function stableNoise(seed, position, key) {
  const hash = crypto.createHash("sha256").update(`${seed}:${position}:${key}`).digest();
  const value = hash.readUInt32BE(0);
  return value / 0xffffffff;
}

function unique(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function setsOverlap(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length === 0 || b.length === 0) {
    return false;
  }
  const bSet = new Set(b);
  return a.some((value) => bSet.has(value));
}

function intersectionSize(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length === 0 || b.length === 0) {
    return 0;
  }
  const bSet = new Set(b);
  return a.reduce((count, value) => count + (bSet.has(value) ? 1 : 0), 0);
}

function countBy(items, keyFn) {
  const counts = new Map();
  for (const item of items) {
    incrementMap(counts, keyFn(item));
  }
  return counts;
}

function incrementMap(map, key) {
  map.set(key, (map.get(key) || 0) + 1);
}

function printStats(plan, checkpointPath) {
  console.log(`Checkpoint: ${checkpointPath}`);
  console.log(`Seed: ${plan.seed}`);
  console.log(`Start index: ${plan.startIndex || 0} (${plan.preservedPrefixCount || 0} preserved items)`);
  console.log("Original order:");
  printOrderStats(plan.originalStats);
  console.log("Smart shuffle:");
  printOrderStats(plan.shuffledStats);
  if ((plan.startIndex || 0) > 0) {
    console.log("Shuffled region only:");
    printOrderStats(plan.shuffledRegionStats);
  }
  console.log("Preview:");
  for (const item of plan.preview.slice(0, 12)) {
    console.log(`${String(item.position).padStart(2, " ")}. ${item.name} - ${item.artists} [${item.genre}]`);
  }
}

function printOrderStats(stats) {
  console.log(
    `  items=${stats.totalItems}, adjacent same primary artist=${stats.adjacentSamePrimaryArtist}, ` +
      `adjacent shared artist=${stats.adjacentSharedArtist}, adjacent same genre=${stats.adjacentSameGenre}, ` +
      `max artist run=${stats.maxArtistRun}, max genre run=${stats.maxGenreRun}`
  );
}

function runSelfTest() {
  const tracks = [];
  const artists = {};
  const groups = [
    ["artist-a", "Artist A", ["pop"], 8],
    ["artist-b", "Artist B", ["rock"], 8],
    ["artist-c", "Artist C", ["hip hop"], 8],
    ["artist-d", "Artist D", ["electronic"], 8],
  ];

  for (const [artistId, name, genres, count] of groups) {
    artists[artistId] = { id: artistId, name, genres };
    for (let i = 0; i < count; i += 1) {
      tracks.push({
        sourceIndex: tracks.length,
        type: "track",
        id: `${artistId}-${i}`,
        uri: `spotify:track:${artistId}-${i}`,
        name: `${name} Song ${i + 1}`,
        artists: [{ id: artistId, name }],
      });
    }
  }

  const featured = buildTrackFeatures(tracks, artists);
  const shuffled = smartShuffle(featured, "self-test", {
    artistWindow: DEFAULT_OPTIONS.artistWindow,
    genreWindow: DEFAULT_OPTIONS.genreWindow,
  });
  const partialPlan = makePlan(tracks, artists, {
    seed: "self-test-partial",
    startIndex: 4,
    artistWindow: DEFAULT_OPTIONS.artistWindow,
    genreWindow: DEFAULT_OPTIONS.genreWindow,
  });
  const originalStats = analyzeOrder(featured);
  const shuffledStats = analyzeOrder(shuffled);

  if (shuffled.length !== tracks.length) {
    throw new Error("Self-test failed: shuffled length changed.");
  }
  assertSameMultiset(
    shuffled.map((track) => track.uri),
    tracks.map((track) => track.uri)
  );
  if (shuffledStats.adjacentSamePrimaryArtist >= originalStats.adjacentSamePrimaryArtist) {
    throw new Error("Self-test failed: artist adjacency did not improve.");
  }
  if (shuffledStats.maxArtistRun >= originalStats.maxArtistRun) {
    throw new Error("Self-test failed: artist run length did not improve.");
  }
  if (partialPlan.desiredUris.slice(0, 4).join("|") !== tracks.slice(0, 4).map((track) => track.uri).join("|")) {
    throw new Error("Self-test failed: start-index prefix was not preserved.");
  }
  assertSameMultiset(
    partialPlan.desiredUris.slice(4),
    tracks.slice(4).map((track) => track.uri)
  );

  console.log("Self-test passed.");
  printOrderStats(originalStats);
  printOrderStats(shuffledStats);
}

async function main() {
  loadEnvFiles();
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }
  if (args.selfTest) {
    runSelfTest();
    return;
  }
  if (args.login) {
    await runLoginFlow(args);
    return;
  }

  const playlistId = extractPlaylistId(args.playlist);
  const options = {
    ...DEFAULT_OPTIONS,
    ...args,
  };
  const checkpointPath = path.resolve(args.stateFile || defaultStateFile(playlistId));
  const checkpoint = loadCheckpoint(checkpointPath, playlistId);
  const save = () => saveCheckpoint(checkpointPath, checkpoint);

  if (args.replan) {
    clearPlanAndFetch(checkpoint);
    save();
  }

  const client = await createSpotifyClient(options);

  let tracks = checkpoint.tracks;
  if (!checkpoint.plan) {
    console.log("Fetching playlist items...");
    tracks = await ensureSourceTracks(client, playlistId, checkpoint, save, options);
    console.log(`Fetched ${tracks.length} playlist items.`);

    console.log("Fetching artist genres...");
    await ensureArtistInfo(client, tracks, checkpoint, save);

    checkpoint.plan = makePlan(tracks, checkpoint.artists, options);
    checkpoint.plan.sourceSnapshotId = checkpoint.source.snapshotId;
    checkpoint.plan.sourceName = checkpoint.source.name;
    save();
  } else {
    console.log("Using existing checkpointed shuffle plan. Pass --replan to compute a new one.");
  }

  printStats(checkpoint.plan, checkpointPath);

  if (args.copyName) {
    await applyCopy(client, checkpoint.plan.desiredUris, checkpoint, save, args.copyName, checkpoint.plan.sourceName, options);
    return;
  }

  if (args.apply) {
    await applyInPlace(client, playlistId, checkpoint.plan.desiredUris, checkpoint, save, options);
    return;
  }

  console.log("Dry-run complete. Re-run with --apply to reorder in place, or --copy-name \"Name\" to create a shuffled copy.");
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
  });
}
