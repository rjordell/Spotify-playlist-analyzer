const express = require("express");
const request = require("request");
const router = express.Router();
const redisClient = require("../index");

const getLikedTracks = (offset, limit) => {
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

router.get("/getCurrentUsersProfile/", (req, res) => {
  let data = null;

  request.get(
    `https://api.spotify.com/v1/me`,
    {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    },
    (error, response, body) => {
      if (!error && response.statusCode === 200) {
        data = JSON.parse(body);
        res.json(data);
      } else {
        res
          .status(response.statusCode)
          .json({ error: "Couldn't fetch current user's profile" });
      }
    }
  );
});

router.get("/getUsersPlaylists/:id", (req, res) => {
  const userId = req.params.id;
  let allPlaylists = [];
  let data = null;

  const fetchPlaylists = (url) => {
    request.get(
      url,
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      },
      (error, response, body) => {
        if (!error && response.statusCode === 200) {
          const PlaylistItems = JSON.parse(body);
          allPlaylists = allPlaylists.concat(PlaylistItems.items);
          if (PlaylistItems.next) {
            fetchPlaylists(PlaylistItems.next);
          } else {
            data.items = allPlaylists;
            res.json(data);
          }
        } else {
          res.status(response.statusCode).json({ error: "Invalid playlists" });
        }
      }
    );
  };

  request.get(
    `https://api.spotify.com/v1/users/${userId}/playlists`,
    {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    },
    (error, response, body) => {
      if (!error && response.statusCode === 200) {
        data = JSON.parse(body);
        if (data.next) {
          allPlaylists = allPlaylists.concat(data.items);
          fetchPlaylists(data.next);
        } else {
          res.json(data);
        }
      } else {
        res.status(response.statusCode).json({ error: "Invalid user id" });
      }
    }
  );
});

router.get("/getUsersPlaylists2/:id", async (req, res) => {
  const userId = req.params.id;

  // Check the cache for the user's playlists
  console.log("userroutes.js: ", redisClient, typeof(redisClient))
  redisClient.get(`users:${userId}`, async (err, cachedData) => {
    if (err) {
      console.error("Redis error:", err);
      return res.status(500).json({ error: "Internal server error" });
    }

    if (cachedData) {
      // If user's playlists are found in cache, return cached data
      return res.json(JSON.parse(cachedData));
    } else {
      try {
        // If user's playlists are not found in cache, fetch from Spotify API
        const playlists = await fetchUserPlaylists(userId);
        // Cache the fetched playlists data
        redisClient.set(`users:${userId}`, JSON.stringify(playlists));
        res.json(playlists);
      } catch (error) {
        console.error("Error fetching user's playlists:", error);
        res.status(500).json({ error: "Error fetching user's playlists" });
      }
    }
  });
});

async function fetchUserPlaylists(userId) {
  // Fetch the first batch of playlists
  const playlists = await getPlaylistsFromAPI(userId, 0);
  let offset = playlists.length;

  // Check if all playlists are fetched
  while (offset < playlists.total) {
    // Fetch the next batch of playlists
    const nextPlaylists = await getPlaylistsFromAPI(userId, offset);
    playlists.items.push(...nextPlaylists.items);
    offset += nextPlaylists.items.length;
  }

  return playlists;
}

function getPlaylistsFromAPI(userId, offset) {
  return new Promise((resolve, reject) => {
    request.get(
      `https://api.spotify.com/v1/users/${userId}/playlists?limit=50&offset=${offset}`,
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      },
      (error, response, body) => {
        if (!error && response.statusCode === 200) {
          const playlists = JSON.parse(body);
          resolve(playlists);
        } else {
          reject(error);
        }
      }
    );
  });
}

router.get("/getCurrentUsersPlaylists/", (req, res) => {
  let allPlaylists = [];
  let data = null;

  const fetchPlaylists = (url) => {
    request.get(
      url,
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      },
      (error, response, body) => {
        if (!error && response.statusCode === 200) {
          const PlaylistItems = JSON.parse(body);
          allPlaylists = allPlaylists.concat(PlaylistItems.items);
          if (PlaylistItems.next) {
            fetchPlaylists(PlaylistItems.next);
          } else {
            data.items = allPlaylists;
            res.json(data);
          }
        } else {
          res.status(response.statusCode).json({ error: "Invalid playlists" });
        }
      }
    );
  };

  request.get(
    `https://api.spotify.com/v1/me/playlists`,
    {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    },
    (error, response, body) => {
      if (!error && response.statusCode === 200) {
        data = JSON.parse(body);
        if (data.next) {
          allPlaylists = allPlaylists.concat(data.items);
          fetchPlaylists(data.next);
        } else {
          res.json(data);
        }
      } else {
        res.status(response.statusCode).json({ error: "Invalid user id" });
      }
    }
  );
});

module.exports = router;
