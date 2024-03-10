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
 * Ensures that the playlist cached in Redis is up to date and caching the most recent version if necessary.
 * @param {string} playlistId - The ID of the playlist.
 */
async function fetchAndUpdatePlaylistInfo(playlistId) {
  const response = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}`, {
    headers: { Authorization: `Bearer ${access_token}` },
  });
  if (!response.ok) throw new Error('Failed to fetch playlist');
  let playlist = await response.json();

  let cachedData = await redisClient.get(`playlists:${playlistId}`);
  if (cachedData) {
    cachedData = JSON.parse(cachedData);
    console.log("playlist", playlist.name,"found in cache!")
    //console.log(playlist)
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
async function ensurePlaylistCompleteness(playlistId) {
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
      //console.log("playlist", playlist.name,"does not have all tracks yet, fetching more")
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

  playlist.tracks.items = tracks
  // Update the cache with the complete playlist
  redisClient.set(`playlists:${playlistId}`, JSON.stringify(playlist));
  await updatePlaylistWithTracks(playlistId);
}

/**
 * Fetches and updates the artist information for all the artists in all the tracks in the playlist.
 * Retrieves artist information for each track in the playlist from the Redis cache and Spotify API,
 * updates the cache for the artists accordingly, and updates the cached tracks in the playlist with the latest artist information,
 * and updated the cached playlist with the updated cached tracks.
 * @param {string} playlistId - The ID of the playlist.
 */
async function fetchAndUpdateTracksArtistInfo(playlistId) {
  const cachedPlaylist = await redisClient.get(`playlists:${playlistId}`);
  const playlist = JSON.parse(cachedPlaylist);
  const artistIdsToCache = await updateCachedTracksWithCachedArtists(playlist);

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
  await updateCachedTracksWithCachedArtists(playlist);
};

/**
 * Retrieves artist information for each track in the playlist from the Redis cache and Spotify API,
 * updates the cached track accordingly, and returns a set of artist IDs that need to be cached.
 * @param {Object} playlist - The playlist object.
 * @returns {Set} - Set of artist IDs that need to be cached.
 */
async function updateCachedTracksWithCachedArtists(playlist) {
  const artistIdsToCache = new Set();

  // let x = 0
  // let y = 0
  // let z = 0
  // let flag = false
  // Iterate through every track in the playlist
  for (const trackItem of playlist.tracks.items) {
    let track = trackItem.track;
    // Iterate through every artist in the track
    for (let j = 0; j < track.artists.length; j++) {
      const artist = track.artists[j];
      //y++;
      // Check if the artist field in the playlist cache has the 'popularity' field
      if (!artist.popularity) {
        //flag = true;
        const cachedTrack = await redisClient.get(`tracks:${track.id}`);
        track = JSON.parse(cachedTrack);
        // Check if the artist field in the track cache has the 'popularity' field
        if (!track.artists[j].popularity) {
          // Check if the artist exists in the cache
          const cachedArtist = await redisClient.get(`artists:${artist.id}`);
          if (cachedArtist) {
            track.artists[j] = JSON.parse(cachedArtist);
          } else {
            //z++;
            artistIdsToCache.add(artist.id);
          }
        }
      }
      // Update the cached track with the artists' infos completed
      redisClient.set(`tracks:${track.id}`, JSON.stringify(track));
    }
    // if (flag == true){
    //   x++;
    //   console.log("track",track.name,"did not have a artist info field")
    //   console.log(track)
    //   flag = false;
    // }
  }
  //console.log(x, "tracks did not have all of their artist info completed out of",playlist.tracks.items.length,)
  //console.log(z, "artists were not cached out of",y)
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
    track = trackItem.track;

    // Check if the track in the playlist cache has the 'liked' field
    if (!track.hasOwnProperty('liked')) {
      // console.log("track",track.name,"did not have a liked status field")
      // console.log(track)
      const cachedTrack = await redisClient.get(`tracks:${track.id}`);
      track = JSON.parse(cachedTrack);
      // Check if the cached track has the 'liked' field
      if (!track.hasOwnProperty('liked')) {
        tracksToCache.add(track);
      }
    }
  }

  //console.log(tracksToCache.size,"tracks did not have a liked status field out of", playlist.tracks.items.length)
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
        // Update the cached track with the liked status
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
  for (const trackItem of playlist.tracks.items) {
    track = trackItem.track;

    // Check if the track has the 'liked' field
    if (!track.hasOwnProperty('liked')) {
      // console.log("track",track.name,"did not have a liked status field")
      // console.log(track)
      const cachedTrack = await redisClient.get(`tracks:${track.id}`);
      track = JSON.parse(cachedTrack);
      if (!track.hasOwnProperty('audio_features')) {
        tracksToCache.add(track);
      }
    }
  }

  //console.log(tracksToCache.size,"tracks did not have an audio features field out of", playlist.tracks.items.length)
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
 * Updates the cached playlist with the cached tracks.
 * @param {string} playlistId - The ID of the playlist.
 */
async function updatePlaylistWithTracks(playlistId){
  const cachedPlaylist = await redisClient.get(`playlists:${playlistId}`);
  const playlist = JSON.parse(cachedPlaylist);
  let tracks = playlist.tracks.items;
  // Iterate through every track in tracks and check if the trackId is in the Redis cache 'tracks:trackId'
  // If the track is cached, retrieve it from the cache; otherwise, cache the track
  for (let i = 0; i < tracks.length; i++) {
    let track = tracks[i].track; // i think i could change this to const
    //console.log("track ", tracks[i].track.name," looking in cache")
    if (!track.hasOwnProperty('audio_features') || !track.hasOwnProperty('liked') || !track.artists[0].hasOwnProperty('popularity')) {
      const cachedTrack = await redisClient.get(`tracks:${track.id}`);
      if (cachedTrack) {
        tracks[i].track = JSON.parse(cachedTrack);
        //console.log("track", tracks[i].track.name,"found in cache!")
      } else {
        // If the track is not in the cache, add it to the cache
        //console.log("track", tracks[i].track.name,"not found in cache")
        //console.log("track", track,"not found in cache")
        //x++;
        redisClient.set(`tracks:${track.id}`, JSON.stringify(track));
      }
      tracks[i].index = i
    }
  }
  //console.log(x,"tracks not found in cache out of", tracks.length)

  playlist.tracks.items = tracks
  // Update the cache with the complete playlist
  redisClient.set(`playlists:${playlistId}`, JSON.stringify(playlist));
}

/**
 * Retrieves and updates the data for a playlist.
 *
 * @param {string} id - The ID of the playlist.
 * @returns {Promise<Object>} - The updated playlist data.
 */
router.get("/getCombinedData/:id", async (req, res) => {
  const playlistId = req.params.id

  await fetchAndUpdatePlaylistInfo(playlistId);
  await ensurePlaylistCompleteness(playlistId);
  await fetchAndUpdateTracksArtistInfo(playlistId);
  await fetchAndUpdateTracksLikedStatus(playlistId);
  await fetchAndUpdateTracksFeatures(playlistId);

  await updatePlaylistWithTracks(playlistId);

  const playlist = await redisClient.get(`playlists:${playlistId}`);
  // Return the updated playlist
  return res.json(JSON.parse(playlist));
});

/**
 * Groups tracks in a playlist by artist.
 *
 * @param {Object} playlist - The playlist object containing tracks.
 * @returns {Array} - An array of artist groups, each containing the artist group ID, the items (tracks) in the group, and the top 3 genres in the group.
 */
async function groupTracksByArtist(playlist, startIndex) {
  const artistTrackMap = new Map();
  const trackGroups = [];
  const preStartIndexGroup = {
    items: [],
    genresCount: new Map(),
  };

  console.log("startIndex: ", startIndex)
  playlist.tracks.items.forEach((item, index) => {
    const track = item.track;
    let sharedGroupIndex = null;

    // Check all artists of the track to find any existing group
    if (index >= startIndex) {
      track.artists.forEach(artist => {
        if (artistTrackMap.has(artist.id)) {
          const existingGroupIndex = artistTrackMap.get(artist.id);
          if (sharedGroupIndex === null) {
            sharedGroupIndex = existingGroupIndex;
          } else if (sharedGroupIndex !== existingGroupIndex) {
            // Merge groups if the current artist connects two groups
            trackGroups[existingGroupIndex].items.forEach(item => {
              item.track.artists.forEach(artist => {
                artistTrackMap.set(artist.id, sharedGroupIndex);
              });
            });
            // console.log("trackGroups[existingGroupIndex]: ", trackGroups[existingGroupIndex])
            // console.log("trackGroups[sharedGroupIndex]: ", trackGroups[sharedGroupIndex])
            trackGroups[sharedGroupIndex].items = trackGroups[sharedGroupIndex].items.concat(trackGroups[existingGroupIndex].items);
            trackGroups[existingGroupIndex].items = []; // Clear the merged group
            // console.log("trackGroups[existingGroupIndex] after: ", trackGroups[existingGroupIndex])
            // console.log("trackGroups[sharedGroupIndex] after: ", trackGroups[sharedGroupIndex])
          }
        }
      });
      
      // Add track to a group or create a new group if it doesn't share any artist with existing groups
      if (sharedGroupIndex === null) {
        sharedGroupIndex = trackGroups.length;
        trackGroups.push({
          items: [item],
          genresCount: new Map()
        });
      } else {
        trackGroups[sharedGroupIndex].items.push(item);
      }

      // Update artistTrackMap
      track.artists.forEach(artist => {
        artistTrackMap.set(artist.id, sharedGroupIndex);
      });

      // Count genres in the current track and update genre count for the group
      const group = trackGroups[sharedGroupIndex];
      track.artists.forEach(artist => {
        artist.genres.forEach(genre => {
          if (group.genresCount.has(genre)) {
            group.genresCount.set(genre, group.genresCount.get(genre) + 1);
          } else {
            group.genresCount.set(genre, 1);
          }
        });
      });
    } else {
      preStartIndexGroup.items.push(item);
      // Count genres in the current track and update genre count for the special group
      track.artists.forEach((artist) => {
        artist.genres.forEach((genre) => {
          if (preStartIndexGroup.genresCount.has(genre)) {
            preStartIndexGroup.genresCount.set(genre, preStartIndexGroup.genresCount.get(genre) + 1);
          } else {
            preStartIndexGroup.genresCount.set(genre, 1);
          }
        });
      });
    }
  });

  // Filter out any empty groups caused by merging
  const finalGroups = trackGroups.filter(group => group.items.length);
  
  // Shuffle tracks within each group
  finalGroups.forEach(group => {
    //group.genres.slice(0, 3).map(([genre, _]) => genre)
    if (group.items.length > 2) {  // No point in shuffling an array with only 1 or 2 tracks in it
      group.items = shuffleArray(group.items);
    }
  });

  // Push the special group for tracks before startIndex
  finalGroups.push(preStartIndexGroup);

  return finalGroups.map((group, index) => ({
    artistGroupId: index,
    items: group.items,
    genres: Array.from(group.genresCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([genre, _]) => genre)
  }));
}

/**
 * Groups artists by genre.
 *
 * @param {Array} initialGroups - The initial groups of artists.
 * @returns {Array} - The final groups of artists, grouped by genre.
 */
async function groupArtistsByGenre(initialGroups) {
  let finalGroups = [];

  initialGroups.forEach(group => {
    //let found = false;
    // console.log("group")
    // console.log(group)
    let res = {
      groups: [group],
      genres: group.genres
    }
    finalGroups.forEach(finalGroup => {
      // console.log("finalGroup")
      // console.log(finalGroup)

      // Check if there is any overlap in genres between the current group and any final group
      const sharedGenres = res.genres.filter(genre => finalGroup.genres.includes(genre));
      if (sharedGenres.length > 0) {
        // Merge groups if they share at least one genre
        res.genres = Array.from(new Set([...finalGroup.genres, ...res.genres]));
        //console.log(finalGroup.groups)
        res.groups = res.groups.concat(finalGroup.groups);
        finalGroup.groups = []
        finalGroup.genres = []
        //found = true;
        //break;
      }
    });

    // If no shared genres were found with existing final groups, add as a new final group
    finalGroups.push({
      groupId: finalGroups.length,
      ...res,
    });
  });

  // Step 3: Merge single-track groups into a single group
  let singleArtistGroups = finalGroups.filter(group => group.groups.length === 1);
  if (singleArtistGroups.length > 1) {
    let mergedGroups = singleArtistGroups.reduce((acc, curr) => acc.concat(curr.groups), []);
    let mergedGenres = singleArtistGroups.reduce((acc, curr) => acc.concat(curr.genres), []);
    finalGroups = finalGroups.filter(group => group.groups.length > 1);
    finalGroups.push({
      groupId: finalGroups.length,
      groups: mergedGroups,
      genres: mergedGenres
    });
  }

  // Optionally, refine finalGroups to remove redundancy or further process
  finalGroups = finalGroups.filter(group => group.groups.length);

  return finalGroups;
}

function shuffleArray(array) {
  // Custom sorting function to generate random values
  const randomSort = () => Math.random() - 0.5;
  
  // Use the custom sorting function to shuffle the array
  return array.sort(randomSort);
}

/**
 * Shuffles multiple arrays into each other evenly.
 *
 * @param {Array<Array>} arrays - The arrays to be shuffled into each other.
 * @returns {Array} - The final shuffled array.
 */
function pseudorandomShuffle(arrays) {
  // Step 1: Calculate the total length of all arrays
  //console.log("arrays passed into shuffle: ", arrays)
  const totalLength = 5*arrays.reduce(
    (acc, array) => acc + Math.floor(array.length),
    0
  );
  //console.log(totalLength);

  // Randomize the order of the arrays
  arrays = shuffleArray(arrays);

  let spreadArrays = [];
  arrays.forEach((array) => {
    const sectionSize = totalLength / (array.length + 1);
    const offset = (Math.random() - 0.5) * (sectionSize);
    // console.log("sectionSize");
    // console.log(sectionSize);
    // console.log("offset");
    // console.log(offset);
    let output = new Array(totalLength).fill().map((_) => []);

    let index = 0;
    for (let i = 1; i <= array.length; i++) {
      index += sectionSize;
      output[Math.round(index + offset)] = array[i - 1];
    }
    // console.log("before");
    // console.log(array);
    // console.log("spread");
    // console.log(output);
    spreadArrays.push(output);
    //console.log(array)
  });

  //console.log("spreadArrays")

  //console.log("spreadArrays: ", spreadArrays)
  let i = 0;
  let finalArray = [];
  while (i < totalLength) {
    let res = [];
    spreadArrays.forEach((array) => {
      //console.log(array)
      if (!Array.isArray(array[i])){
        res.push(array[i]);
      }
    });
    //   if (res.length > 2){
    //       res = shuffleArray(res);
    //   }
    res.forEach((item) => {
      finalArray.push(item);
    });
    i += 1;
  }
  return finalArray;
}

/**
 * Retrieves a shuffled playlist based on the provided playlist ID.
 *
 * @param {string} id - The ID of the playlist.
 * @returns {Object} - The shuffled playlist.
 */
router.get("/getShuffledPlaylist/:id/:startIndex?", async (req, res) => {
  const playlistId = req.params.id
  const startIndex = req.query.startIndex ? parseInt(req.query.startIndex) : 0;


  console.log("req.params: ", req.params)
  console.log("req.query: ", req.query);

  const cachedPlaylist = await redisClient.get(`playlists:${playlistId}`);
  let playlist = JSON.parse(cachedPlaylist);

  let groupedTracksByArtists = await groupTracksByArtist(playlist, startIndex);

  //return res.json(groupedTracksByArtists);

  let groupedArtistsByGenre = await groupArtistsByGenre(groupedTracksByArtists);
  //return res.json(groupedArtistsByGenre);
  let shuffled = []
  
  groupedArtistsByGenre.forEach(genreGroup => {
    let preShuffledGroup = genreGroup.groups.map((artistGroup) => artistGroup.items)
    shuffled.push(pseudorandomShuffle(preShuffledGroup));
  });

  //return res.json(shuffled);
  shuffled = pseudorandomShuffle(shuffled);
  playlist.tracks.items = shuffled;
  redisClient.set(`currentShuffle`, JSON.stringify(playlist));
  // Return the updated playlist
  return res.json(playlist);
});

/**
 * Retrieves the cached shuffled playlist.
 *
 * @returns {Object} - The shuffled playlist.
 */
router.get("/getCachedShuffledPlaylist/", async (req, res) => {
  const cachedPlaylist = await redisClient.get(`currentShuffle`);
  let playlist = JSON.parse(cachedPlaylist);

  return res.json(playlist);
});

/**
 * Reorders the tracks in a playlist based on the current shuffle order.
 * 
 * @returns {Promise<void>} A promise that resolves once the playlist has been reordered successfully.
 * @throws {Error} If there is an error reordering the playlist.
 */
async function reorderPlaylistTracks() {
  // Retrieve the shuffled playlist
  const cachedShuffle = await redisClient.get(`currentShuffle`);
  let shuffledPlaylist = JSON.parse(cachedShuffle);

  // Retrieve the current playlist
  const cachedPlaylist = await redisClient.get(`playlists:${shuffledPlaylist.id}`);
  let playlist = JSON.parse(cachedPlaylist);

  // Map the current playlist to the goal indices
  for (let i = 0; i < playlist.tracks.items.length; i++) {
    const shuffledIndex = shuffledPlaylist.tracks.items.findIndex(item => item.track.id === playlist.tracks.items[i].track.id);
    // Set the index of the current track in the playlist to the index of the corresponding track in the shuffledPlaylist
    playlist.tracks.items[i].index = shuffledIndex;

  }

  //return (playlist)

  for (let i = 0; i < playlist.tracks.items.length; i++) {
    if (playlist.tracks.items[i].index == i){
      console.log(`Track ${playlist.tracks.items[i].track.name} in correct place, skipping reorder.`);
      continue;
    }
    const currentIndex = playlist.tracks.items.findIndex(item => item.index === i)

    // Make the request to reorder the track
    const response = await fetch(`https://api.spotify.com/v1/playlists/${playlist.id}/tracks`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        range_start: currentIndex,
        insert_before: i,
        range_length: 1,
      })
    });
    if (!response.ok) {
      const errorMessage = await response.json();

      throw new Error(`Failed to reorder playlist: ${errorMessage}`);
    }

    // Remove the track from its current position in the playlist
    const trackToReorder = playlist.tracks.items.splice(currentIndex, 1)[0];
    
    // Reinsert the track at the correct index
    playlist.tracks.items.splice(i, 0, trackToReorder);

    const reorderData = await response.json();

    playlist.tracks.items[i].index = i;
    playlist.snapshot_id = reorderData.snapshot_id;

    redisClient.set(`playlists:${playlist.id}`, JSON.stringify(playlist));
    console.log(`Track ${trackToReorder.track.name} reordered successfully.`);
  }

  console.log('Playlist reordered successfully.');
}

router.get("/reorderPlaylist/", async (req, res) => {
  try {
    // Call the function to reorder the playlist tracks
    await reorderPlaylistTracks();
    //const temp = await reorderPlaylistTracks();
    //return res.json(temp)
    res.status(200).json({ message: 'Playlist shuffled successfully.' });
  } catch (error) {
    console.error('Error shuffling playlist:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
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
