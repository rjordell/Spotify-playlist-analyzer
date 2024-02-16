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
async function getPlaylistInfo(playlistId) {
  const response = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}`, {
    headers: { Authorization: `Bearer ${access_token}` },
  });
  if (!response.ok) throw new Error('Failed to fetch playlist');
  let playlist = await response.json();

  let cachedData = await redisClient.get(`playlists:${playlistId}`);
  if (cachedData) cachedData = JSON.parse(cachedData);

  if (!cachedData || cachedData.snapshot_id !== playlist.snapshot_id) {
    console.log("playlist not found in cache, or cache invalid")
    redisClient.set(`playlists:${playlistId}`, JSON.stringify(playlist));
  } else {
    playlist = cachedData
  }

  console.log("cachedData before gettign full playist tracks, not compelte: ", playlist)

  // gets all the tracks in the playlist, the tracks do not have completed data yet
  for (let trackItem of playlist.tracks.items) {
    const track = trackItem.track;
    console.log("each track in cachedData before gettign full playist tracks, not compelte: ", track.name)
  }

  playlist = await getPlaylistTracks(playlist);

  for (let trackItem of playlist.tracks.items) {
    const track = trackItem.track;
    console.log("each track in cachedData after gettign full playist tracks, not compelte: ", track.name)
  }

  //console.log("cachedData after gettign full playist tracks, not compelte: ", cachedData)
  // this function will get all the completed playlist data with full track data and return it
  playlist = await getPlaylistTracksInfo(playlist);

  return playlist;
}

async function getPlaylistTracks(playlist) {
  // check if the playlist is complete yet by checking if playlist.tracks.items.length == playlist.tracks.total
  const totalTracks = playlist.tracks.total;
  let tracks = playlist.tracks.items;

  if (tracks.length < totalTracks) {
    let remainingTracks = totalTracks - tracks.length;
    let offset = tracks.length;
    while (remainingTracks > 0) {
      const response = await fetch(`https://api.spotify.com/v1/playlists/${playlist.id}/tracks?offset=${offset}&limit=100`, {
        headers: { Authorization: `Bearer ${access_token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch additional tracks');
      const additionalTracks = await response.json();
      tracks.push(...additionalTracks.items);
      offset += additionalTracks.items.length;
      remainingTracks -= additionalTracks.items.length;
    }
    

    // go through every track in tracks and check if the trackId is in the redis cache tracks:trackId
    // if it is in the cache, set the track to the track that is stored in the cache tracks:trackId
    // if the trackId is not in the cache then add the track to the cache tracks:trackId
    for (let i = 0; i < tracks.length; i++) {
      const trackId = tracks[i].track.id;
      const cachedTrack = await redisClient.get(`tracks:${trackId}`);
      if (cachedTrack) {
        tracks[i].track = JSON.parse(cachedTrack);
      } else {
        // If the track is not in the cache, add it to the cache
        redisClient.set(`tracks:${trackId}`, JSON.stringify(tracks[i].track));
      }
    }

    playlist.tracks.items = tracks;
    redisClient.set(`playlists:${playlist.id}`, JSON.stringify(playlist));
  }
  return playlist;
}

async function getPlaylistTracksInfo(playlist) {

  //console.log("start of getPlaylistTracksInfo")
  playlist = await getArtistsInfo(playlist)
  //console.log("after getArtistsInfo")
  playlist = await getTracksFeatures(playlist)
  //console.log("after getTracksFeatures")
  playlist = await getTracksLikedStatus(playlist)
  //console.log("after getTracksLikedStatus")
  return playlist 
};

async function getArtistsInfo(playlist) {
  let artistIdsToCache = [];

  for (let track of playlist.tracks.items) {
    for (let artist of track.track.artists) {
      if (!artist.hasOwnProperty('popularity')) {
        let cachedArtist = await redisClient.get(`artists:${artist.id}`);
        if (cachedArtist) {
          artist = JSON.parse(cachedArtist);
        } else {
          artistIdsToCache.push(artist.id);
        }
      }
    }
  }

  if (artistIdsToCache.length > 0) {
    const batches = splitArrayIntoChunks(artistIdsToCache, 50);
    for (let batch of batches) {
      const response = await fetch(`https://api.spotify.com/v1/artists?ids=${batch.join(',')}`, {
        headers: { Authorization: `Bearer ${access_token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch artists info');
      const artistsInfo = await response.json();
      for (let artistInfo of artistsInfo.artists) {
        redisClient.set(`artists:${artistInfo.id}`, JSON.stringify(artistInfo));
      }
    }
  }

  for (let trackItem of playlist.tracks.items) {
    const track = trackItem.track;
    for (let i = 0; i < track.artists.length; i++) {
      let cachedArtist = await redisClient.get(`artists:${track.artists[i].id}`);
      if (cachedArtist) {
        track.artists[i] = JSON.parse(cachedArtist);
      }
    }
  }

  return playlist;

  // for every track in the playlist
  // for every artist in the track
  // check if artist has the field popularity
  // if it doesnt, check if the artistId is in the redis cache artists:artistId
  // if it is, set playlist.items.track.artist[] to what you got from the redis cache artists:artistId
  // if not add the artistId to a list artistIdsToCache[]

  // split artistIdsToCache[] in batches of 50 and call spotify api `https://api.spotify.com/v1/artists?ids=${artistIdsString}`, artistIdsString is a comma-separated list of the artistsIds, for each batch
  // set the redis cache artists:artistId to the corresponding result from the spotify api call
  // set playlist.items.track.artist[] to what you got from the spotify api call

  // return the updated playlist with the completed artists info's for all the tracks
};

async function getTracksFeatures(playlist) {
  let trackIdsToCache = [];

  for (let trackItem of playlist.tracks.items) {
    const track = trackItem.track;
    if (!track.hasOwnProperty('audio_features')) {
      trackIdsToCache.push(track.id);
    }
  }

  if (trackIdsToCache.length > 0) {
    const batches = splitArrayIntoChunks(trackIdsToCache, 100);
    for (let batch of batches) {
      const response = await fetch(`https://api.spotify.com/v1/audio-features?ids=${batch.join(',')}`, {
        headers: { Authorization: `Bearer ${access_token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch tracks features');
      const audioFeatures = await response.json();
      for (let feature of audioFeatures.audio_features) {
        redisClient.set(`tracks:${feature.id}.audio_features`, JSON.stringify(feature));
      }
    }
  }

  // Update playlist with completed audio features
  for (let trackItem of playlist.tracks.items) {
    const track = trackItem.track;
    let cachedFeatures = await redisClient.get(`tracks:${track.id}.audio_features`);
    if (cachedFeatures) {
      track.audio_features = JSON.parse(cachedFeatures);
    }
  }

  return playlist;

  // for every track in the playlist
  // check if the redis cache tracks:trackId has the field audio_features
  // if it does have it, set playlist.items.track.audio_features to what you got from the redis cache tracks:trackId
  // if it doesnt, add the trackId to a list trackIdsToCache[]
  // split trackIdsToCache[] in batches of 100 and call spotify api `https://api.spotify.com/v1/audio-features?ids=${trackIds}`, trackIds should be a comma-separated list of the track Ids, for each batch
  // update the redis cache tracks:trackId.track.audio_features with the the corresponding information from the spotify api call
  // set playlist.items.track.audio_features to what you got from the spotify api call

  // return the updated playlist with the completed audio_features for all the tracks
};

async function getTracksLikedStatus(playlist) {
  let trackIdsToCache = [];

  for (let trackItem of playlist.tracks.items) {
    const track = trackItem.track;
    if (!track.hasOwnProperty('liked')) {
      trackIdsToCache.push(track.id);
    }
  }

  if (trackIdsToCache.length > 0) {
    //console.log("trackIdsToCache: ", trackIdsToCache)
    const batches = splitArrayIntoChunks(trackIdsToCache, 50);
    //console.log("batches: ", batches)
    for (let batch of batches) {
      //console.log("batch: ", batch)
      const response = await fetch(`https://api.spotify.com/v1/me/tracks/contains?ids=${batch.join(',')}`, {
        headers: { Authorization: `Bearer ${access_token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch tracks liked status');
      const likedStatus = await response.json();
      //console.log("likedStatus1: ", likedStatus)
      for (let i = 0; i < batch.length; i++) {
        const trackId = batch[i];
        const trackIndex = playlist.tracks.items.findIndex(item => item.track.id === trackId);
        if (trackIndex !== -1) {
          playlist.tracks.items[trackIndex].track.liked = likedStatus[i];
          redisClient.set(`liked:${trackId}`, JSON.stringify(likedStatus[i]));
        }
      }
    }
  }

  return playlist;

  // for every track in the playlist
  // check if track has the field liked
  // if it doesnt, check if the trackId is in the redis cache liked:trackId
  // if it is, set playlist.items.track.liked to what you got from the redis cache liked:trackId
  // if not add the trackId to a list trackIdsToCache[]

  // split trackIdsToCache[] in batches of 50 and call spotify api `https://api.spotify.com/v1/me/tracks/contains?ids=${trackIdsString}`, trackIdsString is a comma-separated list of the trackIds, for each batch
  // set the redis cache liked:trackId to the corresponding result from the spotify api call
  // set playlist.items.track.liked to what you got from the spotify api call

  // return the updated playlist with the completed liked status for all the tracks
};

router.get("/getCombinedData2/:id", async (req, res) => {
  const playlistId = req.params.id;
  // calls function getPlaylistInfo(playlistId) 
  const playlist = await getPlaylistInfo(playlistId);
  // returns the full playlist data with all the tracks completed
  res.json(playlist);
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

router.get("/getCombinedData/:id", async (req, res) => {
  try {
    const playlistId = req.params.id;
    const { offset, limit } = req.query;

    const playlistTracks = await getPlaylistItems(playlistId, offset, limit);

    const filteredTracks = playlistTracks.items.filter((item) => {
      if (item.track === null || item.track.name == "") {
        playlistTracks.total -= 1;
        return false;
      }
      return true;
    });

    playlistTracks.items = filteredTracks;

    const artistIds = playlistTracks.items
      .map((item) => item.track.artists[0].id)
      .join(",");

    const trackIds = playlistTracks.items.map((item) => item.track.id);

    const trackIdsString = trackIds.join(",");

    const artistsInfo = await getMultipleArtistsInfo(artistIds);

    const tracksInfo = await getMultipleTracksAudioFeatures(trackIdsString);

    let savedStatus;
    if (isSetCached) {
      savedStatus = trackIds.map((trackId) => savedTracksSet.has(trackId));
    } else {
      savedStatus = await getMultipleTracksSavedStatus(trackIdsString);
    }

    playlistTracks.items.map((item, index) => {
      const trackWithArtist = {
        ...item.track,
        artists: [artistsInfo.artists[index]],
        ...tracksInfo.tracks[index],
        saved: savedStatus[index],
      };
      playlistTracks.items[index].track = trackWithArtist;
    });
    res.json(playlistTracks);
  } catch (error) {
    console.error("Error in route handler:", error);
    res.status(500).json({ error: "Error fetching combined data" });
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
