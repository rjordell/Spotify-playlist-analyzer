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

router.get("/getCombinedData/:id", async (req, res) => {
  try {
    const playlistId = req.params.id;
    const { offset, limit } = req.query;

    const playlistInfo = await getPlaylistItems(playlistId, offset, limit);

    res.json(playlistInfo);
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

router.get("/getMultipleTracksAudioFeatures/:ids", async (req, res) => {
  try {
    const trackIds = req.params.ids;

    const trackAudioFeatures = await getMultipleTracksAudioFeatures(trackIds);
    res.json(trackAudioFeatures);
  } catch (error) {
    res.status(500).json({ error: "Error fetching tracks' audio features" });
  }
});

/*
router.get("/getMultipleTracksAudioFeatures/:ids", async (req, res) => {
  const trackIds = req.params.ids.split(",");
  const chunkedIds = splitArrayIntoChunks(trackIds, 100);

  const trackInfoPromises = [];

  for (const chunk of chunkedIds) {
    const trackIdsString = chunk.join(",");
    const promise = new Promise((resolve, reject) => {
      request.get(
        `https://api.spotify.com/v1/audio-features?ids=${trackIdsString}`,
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
    trackInfoPromises.push(promise);
  }

  try {
    const trackInfoResults = await Promise.all(trackInfoPromises);
    const combinedTrackInfo = trackInfoResults.reduce(
      (accumulator, current) => accumulator.concat(current.audio_features),
      []
    );
    res.json({ tracks: combinedTrackInfo });
  } catch (error) {
    res.status(500).json({ error: "Error fetching track information" });
  }
});

*/

router.get("/getMultipleArtistsInfo/:ids", async (req, res) => {
  const artistIds = req.params.ids.split(",");
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
    res.json({ artists: combinedArtistInfo });
  } catch (error) {
    res.status(500).json({ error: "Error fetching artist information" });
  }
});

module.exports = router;
