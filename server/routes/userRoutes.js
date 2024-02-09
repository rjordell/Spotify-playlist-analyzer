const express = require("express");
const request = require("request");
const router = express.Router();

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
