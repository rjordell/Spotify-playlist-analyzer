const express = require("express");
const request = require("request");
const router = express.Router();

var splitArrayIntoChunks = function (arr, chunkSize) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += chunkSize) {
    chunks.push(arr.slice(i, i + chunkSize));
  }
  return chunks;
};

const getPlaylistItems = (playlistId, offset, limit) => {
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

const getMultipleTracksAudioFeatures = async (ids) => {
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

const getMultipleArtistsInfo = async (ids) => {
  const artistIds = ids.split(",");
  const chunkedIds = splitArrayIntoChunks(artistIds, 50);

  const artistInfoPromises = [];

  for (const chunk of chunkedIds) {
    const artistIdsString = chunk.join(",");
    const promise = new Promise((resolve, reject) => {
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
    artistInfoPromises.push(promise);
  }

  try {
    const artistInfoResults = await Promise.all(artistInfoPromises);
    const combinedArtistInfo = artistInfoResults.reduce(
      (accumulator, current) => accumulator.concat(current.artists),
      []
    );
    return { artists: combinedArtistInfo };
  } catch (error) {
    throw new Error("Error fetching artist information");
  }
};

const getMultipleTracksSavedStatus = async (ids) => {
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

    const trackIds = playlistTracks.items
      .map((item) => item.track.id)
      .join(",");

    const artistsInfo = await getMultipleArtistsInfo(artistIds);

    const tracksInfo = await getMultipleTracksAudioFeatures(trackIds);
    //console.log("tracksInfo");
    //console.log(tracksInfo);

    const savedStatus = await getMultipleTracksSavedStatus(trackIds);
    //console.log(savedStatus);
    //console.log("savedStatus");

    //console.log("playlistTracks.items");
    //console.log(playlistTracks.items);

    playlistTracks.items.map((item, index) => {
      const trackWithArtist = {
        ...item.track,
        artists: [artistsInfo.artists[index]],
        ...tracksInfo.tracks[index],
        saved: savedStatus.tracks[index],
      };
      playlistTracks.items[index].track = trackWithArtist;
    });

    //console.log("playlistTracks.items after");
    //console.log(playlistTracks.items);
    res.json(playlistTracks);
    //console.log(playlistTracks);
  } catch (error) {
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

router.get("/getPlaylistinfo/:id", (req, res) => {
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
