const express = require("express");
const request = require("request");
const router = express.Router();
const { redisClient } = require("../index");

const savedTracksSet = new Set();

let isSetCached = false;

var splitArrayIntoChunks = function (arr, chunkSize) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += chunkSize) {
    chunks.push(arr.slice(i, i + chunkSize));
  }
  return chunks;
};

const getSavedTracks = (offset, limit) => {
  return new Promise((resolve, reject) => {
    request.get(
      `https://api.spotify.com/v1/me/tracks?offset=${offset}&limit=${limit}`,
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      },
      (error, response, body) => {
        if (!error && response.statusCode === 200) {
          const likedTracks = JSON.parse(body);
          resolve(likedTracks);
        } else {
          reject(error);
        }
      }
    );
  });
};

router.get("/getSavedTracks/", async (req, res) => {
  try {
    const { offset, limit } = req.query;
    const savedTracks = await getSavedTracks(offset, limit);
    res.json(savedTracks);
  } catch (error) {
    res.status(500).json({ error: "Error fetching saved tracks" });
  }
});

/**
 * Fetches playlist information from the Spotify API and caches it in Redis.
 * @param {string} playlistId - The ID of the playlist.
 */
async function fetchAndCachePlaylistInfo(playlistId) {
  const response = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}`, {
    headers: { Authorization: `Bearer ${access_token}` },
  });
  if (!response.ok) throw new Error('Failed to fetch playlist');
  let playlist = await response.json();

  let cachedData = await redisClient.get(`playlists:${playlistId}`);
  if (cachedData) {
    cachedData = JSON.parse(cachedData);
    console.log("playlist", playlist.name,"found in cache!")
  }

  if (!cachedData || cachedData.snapshot_id !== playlist.snapshot_id) {
    console.log("playlist", playlist.name,"not found in cache, or cache is out of date")
    redisClient.set(`playlists:${playlistId}`, JSON.stringify(playlist));
  } 
}

/**
 * Ensures that the playlist cached in Redis is complete by fetching additional tracks if necessary,
 * updating the cache accordingly, and retrieving or caching individual tracks.
 * @param {string} playlistId - The ID of the playlist.
 */
async function fetchAndUpdateCachedPlaylist(playlistId) {
  const cachedPlaylist = await redisClient.get(`playlists:${playlistId}`);
  const playlist = JSON.parse(cachedPlaylist);
  //console.log("at fetchAndUpdateCachedPlaylist", playlist)
  const totalTracks = playlist.tracks.total;
  let tracks = playlist.tracks.items;

  // Check if the playlist is complete yet by comparing the length of playlist.tracks.items with playlist.tracks.total
  if (tracks.length < totalTracks) {
    let remainingTracks = totalTracks - tracks.length;
    let offset = tracks.length;

    // Fetch additional tracks until the playlist is complete
    while (remainingTracks > 0) {
      console.log("playlist", playlist.name,"does not have all tracks yet, fetching more")
      const response = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks?offset=${offset}&limit=100`, {
        headers: { Authorization: `Bearer ${access_token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch additional tracks');

      const additionalTracks = await response.json();
      tracks.push(...additionalTracks.items);
      offset += additionalTracks.items.length;
      remainingTracks -= additionalTracks.items.length;
    }
  }

  // Update the cache with the complete playlist
  redisClient.set(`playlists:${playlistId}`, JSON.stringify(playlist));

  let x = 0
  // Iterate through every track in tracks and check if the trackId is in the Redis cache 'tracks:trackId'
  // If the track is cached, retrieve it from the cache; otherwise, cache the track
  for (let i = 0; i < tracks.length; i++) {
    const trackId = tracks[i].track.id;
    //console.log("track ", tracks[i].track.name," looking in cache")
    const cachedTrack = await redisClient.get(`tracks:${trackId}`);
    if (cachedTrack) {
      tracks[i].track = JSON.parse(cachedTrack);
      //console.log("track", tracks[i].track.name,"found in cache!")
    } else {
      // If the track is not in the cache, add it to the cache
      //console.log("track", tracks[i].track.name,"not found in cache")
      x++;
      redisClient.set(`tracks:${trackId}`, JSON.stringify(tracks[i].track));
    }
  }
  console.log(x,"tracks not found in cache out of", tracks.length)
}

/**
 * Fetches and updates the artist information for all the artists in all the tracks in the playlist.
 * Retrieves artist information for each track in the playlist from the Redis cache and Spotify API,
 * updates the cache for the artists accordingly, and updates the cached tracks in the playlist with the latest artist information.
 * @param {string} playlistId - The ID of the playlist.
 */
async function fetchAndUpdateCachedArtists(playlistId) {
  const cachedPlaylist = await redisClient.get(`playlists:${playlistId}`);
  const playlist = JSON.parse(cachedPlaylist);
  const artistIdsToCache = await updateTracksWithArtistInfo(playlist);

  // Fetch artist information for uncached artists in batches of 50
  if (artistIdsToCache.size > 0) {
    const batches = splitArrayIntoChunks(Array.from(artistIdsToCache), 50);
    for (const batch of batches) {
      const response = await fetch(`https://api.spotify.com/v1/artists?ids=${batch.join(',')}`, {
        headers: { Authorization: `Bearer ${access_token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch artists info');
      const artistsInfo = await response.json();
      for (const artistInfo of artistsInfo.artists) {
        redisClient.set(`artists:${artistInfo.id}`, JSON.stringify(artistInfo));
        //console.log("getArtistsInfo: ", artistInfo.name)
      }
    }
  }

  // call the function again to update with the newest information
  await updateTracksWithArtistInfo(playlist);
};

/**
 * Retrieves artist information for each track in the playlist from the Redis cache and Spotify API,
 * updates the cache accordingly, and returns a set of artist IDs that need to be cached.
 * @param {Object} playlist - The playlist object.
 * @returns {Set} - Set of artist IDs that need to be cached.
 */
async function updateTracksWithArtistInfo(playlist) {
  const artistIdsToCache = new Set();

  let x = 0
  let y = 0
  let z = 0
  let flag = false
  // Iterate through every track in the playlist
  for (const trackItem of playlist.tracks.items) {
    const trackId = trackItem.track.id;
    const cachedTrack = await redisClient.get(`tracks:${trackId}`);
    const track = JSON.parse(cachedTrack);

    // Iterate through every artist in the track
    for (let j = 0; j < trackItem.track.artists.length; j++) {
      const artist = track.artists[j];
      y++;
      // Check if the artist has the 'popularity' field
      if (!artist.popularity) {
        flag = true;
        const cachedArtist = await redisClient.get(`artists:${artist.id}`);
        if (cachedArtist) {
          track.artists[j] = JSON.parse(cachedArtist);
        } else {
          z++;
          artistIdsToCache.add(artist.id);
        }
      }
    }
    if (flag == true){
      x++;
      console.log("track",track.name,"did not have a artist info field")
      console.log(track)
      flag = false;
    }
    redisClient.set(`tracks:${trackId}`, JSON.stringify(track));
  }
  console.log(x, "tracks did not have all of their artist info completed out of",playlist.tracks.items.length,)
  console.log(z, "artists were not cached out of",y)
  return artistIdsToCache;
}

/**
 * Fetches and updates the liked status for tracks in the playlist.
 * Retrieves liked status for each track in the playlist from the Redis cache and Spotify API,
 * updates the cache accordingly for each track in the playlist.
 * @param {string} playlistId - The ID of the playlist.
 */
async function fetchAndUpdateTracksLikedStatus(playlistId) {
  const cachedPlaylist = await redisClient.get(`playlists:${playlistId}`);
  const playlist = JSON.parse(cachedPlaylist);
  const tracksToCache = new Set();
  
  // Iterate through every track in the playlist
  for (let trackItem of playlist.tracks.items) {
    const trackId = trackItem.track.id;
    const cachedTrack = await redisClient.get(`tracks:${trackId}`);
    const track = JSON.parse(cachedTrack);

    // Check if the track has the 'liked' field
    if (!track.hasOwnProperty('liked')) {
      console.log("track",track.name,"did not have a liked status field")
      console.log(track)
      tracksToCache.add(track);
    }
  }

  console.log(tracksToCache.size,"tracks did not have a liked status field out of", playlist.tracks.items.length)
  // Fetch liked status for uncached tracks in batches of 50
  if (tracksToCache.size > 0) {
    const batches = splitArrayIntoChunks(Array.from(tracksToCache), 50);
    for (let batch of batches) {
      const trackIds = batch.map(track => track.id);
      const response = await fetch(`https://api.spotify.com/v1/me/tracks/contains?ids=${trackIds.join(',')}`, {
        headers: { Authorization: `Bearer ${access_token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch tracks liked status');
      const likedStatus = await response.json();
      for (let i = 0; i < batch.length; i++) {
        const track = batch[i];
        track.liked = likedStatus[i];
        redisClient.set(`tracks:${track.id}`, JSON.stringify(track));
      }
    }
  }
};

/**
 * Fetches and updates the audio features for all tracks in the playlist.
 * Retrieves audio features for each track in the playlist from the Redis cache and Spotify API,
 * updates the cache accordingly for each track in the playlist.
 * @param {string} playlistId - The ID of the playlist.
 */
async function fetchAndUpdateTracksFeatures(playlistId) {
  const cachedPlaylist = await redisClient.get(`playlists:${playlistId}`);
  const playlist = JSON.parse(cachedPlaylist);
  const tracksToCache = new Set();

  // Iterate through every track in the playlist
  for (let trackItem of playlist.tracks.items) {
    const trackId = trackItem.track.id;
    const cachedTrack = await redisClient.get(`tracks:${trackId}`);
    const track = JSON.parse(cachedTrack);

    // Check if the track has the 'audio_features' field
    if (!track.audio_features) {
      tracksToCache.add(track);
    }
  }

  console.log(tracksToCache.size,"tracks did not have an audio features field out of", playlist.tracks.items.length)
  // Fetch audio features for uncached tracks in batches of 100
  if (tracksToCache.size > 0) {
    const batches = splitArrayIntoChunks(Array.from(tracksToCache), 100);
    for (let batch of batches) {
      const trackIds = batch.map(track => track.id);
      const response = await fetch(`https://api.spotify.com/v1/audio-features?ids=${trackIds.join(',')}`, {
        headers: { Authorization: `Bearer ${access_token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch tracks features');
      const audioFeatures = await response.json();
      for (let i = 0; i < batch.length; i++) {
        const track = batch[i];
        track.audio_features = audioFeatures.audio_features[i];
        redisClient.set(`tracks:${track.id}`, JSON.stringify(track)); 
      }
    }
  }
};

/**
 * Express route handler to get combined data of a playlist with a specific ID.
 */
router.get("/getCombinedData/:id", async (req, res) => {
  const playlistId = req.params.id

  await fetchAndCachePlaylistInfo(playlistId)
  await fetchAndUpdateCachedPlaylist(playlistId);
  await fetchAndUpdateCachedArtists(playlistId)
  await fetchAndUpdateTracksLikedStatus(playlistId)
  await fetchAndUpdateTracksFeatures(playlistId)

  const cachedPlaylist = await redisClient.get(`playlists:${playlistId}`);
  const playlist = JSON.parse(cachedPlaylist);
  let tracks = playlist.tracks.items;
  // assemble the full playlist data to send back to frontend
  for (let i = 0; i < tracks.length; i++) {
    const trackId = tracks[i].track.id;
    const cachedTrack = await redisClient.get(`tracks:${trackId}`);
    if (cachedTrack) {
      tracks[i].track = JSON.parse(cachedTrack);
      //console.log("track", tracks[i].track.name,"found in cache!")
    } else {
      console.log("track", tracks[i].track.name,"somehow not found in cache")
    }
  }

  // Update the playlist object with the updated tracks
  playlist.tracks.items = tracks;
  return res.json(playlist);
});

function getPlaylistItems(playlistId, offset, limit) {
  return new Promise((resolve, reject) => {
    request.get(
      `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=${limit}&offset=${offset}`,
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      },
      (error, response, body) => {
        if (!error && response.statusCode === 200) {
          const playlistInfo = JSON.parse(body);
          resolve(playlistInfo);
        } else {
          reject(error);
        }
      }
    );
  });
};

function getMultipleTracksAudioFeatures(ids) {
  const trackIds = ids;

  return new Promise((resolve, reject) => {
    request.get(
      `https://api.spotify.com/v1/audio-features?ids=${trackIds}`,
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      },
      (error, response, body) => {
        if (!error && response.statusCode === 200) {
          const trackInfo = JSON.parse(body);
          resolve({ tracks: trackInfo.audio_features });
        } else {
          reject(error);
        }
      }
    );
  });
};

async function getMultipleArtistsInfo(ids) {
  const artistIds = ids.split(",");
  const chunkedIds = splitArrayIntoChunks(artistIds, 50);

  const artistInfoPromises = chunkedIds.map((chunk) => {
    const artistIdsString = chunk.join(",");
    return new Promise((resolve, reject) => {
      request.get(
        `https://api.spotify.com/v1/artists?ids=${artistIdsString}`,
        {
          headers: {
            Authorization: `Bearer ${access_token}`,
          },
        },
        (error, response, body) => {
          if (!error && response.statusCode === 200) {
            const artistInfo = JSON.parse(body);
            resolve(artistInfo);
          } else {
            reject(error);
          }
        }
      );
    });
  });

  try {
    const artistInfoResults = await Promise.all(artistInfoPromises);
    const artistsArray = artistInfoResults.reduce(
      (accumulator, current) => accumulator.concat(current.artists),
      []
    );
    return { artists: [].concat(...artistsArray) };
  } catch (error) {
    throw new Error("Error fetching artist information");
  }
};

async function getMultipleTracksSavedStatus(ids) {
  const trackIds = ids.split(",");
  const chunkedIds = splitArrayIntoChunks(trackIds, 50);

  const trackInfoPromises = chunkedIds.map((chunk) => {
    const trackIdsString = chunk.join(",");
    return new Promise((resolve, reject) => {
      request.get(
        `https://api.spotify.com/v1/me/tracks/contains?ids=${trackIdsString}`,
        {
          headers: {
            Authorization: `Bearer ${access_token}`,
          },
        },
        (error, response, body) => {
          if (!error && response.statusCode === 200) {
            const trackInfo = JSON.parse(body);
            resolve(trackInfo);
          } else {
            reject(error);
          }
        }
      );
    });
  });

  try {
    const trackInfoResults = await Promise.all(trackInfoPromises);
    const combinedTrackInfo = [].concat(...trackInfoResults);
    return { tracks: combinedTrackInfo };
  } catch (error) {
    throw new Error("Error fetching tracks' saved status");
  }
};

router.get("/getCombinedSavedTracks/", async (req, res) => {
  try {
    const { offset, limit } = req.query;

    const savedTracks = await getSavedTracks(offset, limit);

    const artistIds = savedTracks.items
      .map((item) => item.track.artists[0].id)
      .join(",");

    const trackIds = savedTracks.items.map((item) => item.track.id).join(",");

    const artistsInfo = await getMultipleArtistsInfo(artistIds);

    const tracksInfo = await getMultipleTracksAudioFeatures(trackIds);

    savedTracks.items.map((item, index) => {
      savedTracksSet.add(item.track.id);
      const trackWithArtist = {
        ...item.track,
        artists: [artistsInfo.artists[index]],
        ...tracksInfo.tracks[index],
        saved: true,
      };
      savedTracks.items[index].track = trackWithArtist;
    });
    //console.log(savedTracksSet);
    if (savedTracks.next === null) {
      isSetCached = true;
    }
    res.json(savedTracks);
  } catch (error) {
    res
      .status(500)
      .json({ error: "Error fetching combined data saved tracks" });
  }
});

router.get("/getPlaylistItems/:id", async (req, res) => {
  try {
    const playlistId = req.params.id;
    const { offset, limit } = req.query;

    const playlistInfo = await getPlaylistItems(playlistId, offset, limit);
    res.json(playlistInfo);
  } catch (error) {
    res.status(500).json({ error: "Error fetching playlist items" });
  }
});

router.get("/getMultipleTracksAudioFeatures/:ids", async (req, res) => {
  try {
    const trackIds = req.params.ids;

    const trackAudioFeatures = await getMultipleTracksAudioFeatures(trackIds);
    res.json(trackAudioFeatures);
  } catch (error) {
    res.status(500).json({ error: "Error fetching tracks' audio features" });
  }
});

router.get("/getMultipleArtistsInfo/:ids", async (req, res) => {
  try {
    const artistIds = req.params.ids;

    const artistsInfo = await getMultipleArtistsInfo(artistIds);
    res.json(artistsInfo);
  } catch (error) {
    res.status(500).json({ error: "Error fetching artists' info" });
  }
});

router.get("/getPlaylistInfo/:id", (req, res) => {
  const playlistId = req.params.id;

  request.get(
    `https://api.spotify.com/v1/playlists/${playlistId}`,
    {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    },
    (error, response, body) => {
      if (!error && response.statusCode === 200) {
        const playlistInfo = JSON.parse(body);
        res.json(playlistInfo);
      } else {
        res.status(response.statusCode).json({ error: "Invalid playlist id" });
      }
    }
  );
});

router.get("/getMultipleTracksSavedStatus/:ids", async (req, res) => {
  try {
    const trackIds = req.params.ids;

    const tracksLikedStatuses = await getMultipleTracksSavedStatus(trackIds);
    res.json(tracksLikedStatuses);
  } catch (error) {
    res.status(500).json({ error: "Error fetching tracks' liked statuses" });
  }
});

module.exports = router;
