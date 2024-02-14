const express = require("express");
const request = require("request");
const router = express.Router();
const { redisClient } = require("../index");
console.log("log right after import: ", redisClient)

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

router.get("/getUsersPlaylists/:id", async (req, res) => {
  const userId = req.params.id;
  // Check the cache for the user's playlists
  //console.log("USERROUTES.JS: called getuserspalyslits2")
  redisClient.get(`users:${userId}`).then((cachedData) => {
    //console.log("inside of get");
    if (cachedData) {
      // If user's playlists are found in cache, return cached data
      //console.log("USERROUTES.JS: found palyists in cache")
      return res.json(JSON.parse(cachedData));
    } else {
      //console.log("USERROUTES.JS: didnt find palyists")
      try {
        //console.log("USERROUTES.JS: lookign thru api ")
        // If user's playlists are not found in cache, fetch from Spotify API
        fetchUserPlaylists(userId).then((playlists) => {
          // Cache the fetched playlists data
          redisClient.set(`users:${userId}`, JSON.stringify(playlists));
          //console.log("USERROUTES.JS: retrieved from api ", redisClient)
          //console.log("USERROUTES.JS: retrieved from api")
          res.json(playlists);
        });
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

module.exports = router;
