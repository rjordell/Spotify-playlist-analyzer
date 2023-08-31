const express = require("express");
const request = require("request");
const dotenv = require("dotenv");

const port = 5000;

global.access_token = "";

dotenv.config({ path: "test.env" });

var spotify_client_id = process.env.SPOTIFY_CLIENT_ID;
var spotify_client_secret = process.env.SPOTIFY_CLIENT_SECRET;

var spotify_redirect_uri = "http://localhost:3000/auth/callback";

var generateRandomString = function (length) {
  var text = "";
  var possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  for (var i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

var app = express();

const playlistRoutes = require("./routes/playlistRoutes");

app.use("/auth/playlist", playlistRoutes);

app.get("/auth/login", (req, res) => {
  var scope =
    "streaming user-read-email user-read-private playlist-read-private playlist-read-collaborative playlist-modify-private playlist-modify-public user-library-modify user-library-read";
  var state = generateRandomString(16);

  var auth_query_parameters = new URLSearchParams({
    response_type: "code",
    client_id: spotify_client_id,
    scope: scope,
    redirect_uri: spotify_redirect_uri,
    state: state,
  });

  res.redirect(
    "https://accounts.spotify.com/authorize/?" +
      auth_query_parameters.toString()
  );
});

app.get("/auth/getUsersPlaylists/:id", (req, res) => {
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

app.get("/auth/getCurrentUsersPlaylists/", (req, res) => {
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

app.get("/auth/getTrackinfo/:id", (req, res) => {
  const trackId = req.params.id;

  request.get(
    `https://api.spotify.com/v1/tracks/${trackId}`,
    {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    },
    (error, response, body) => {
      if (!error && response.statusCode === 200) {
        const trackInfo = JSON.parse(body);
        res.json(trackInfo);
      } else {
        res.status(response.statusCode).json({ error: "Invalid track id" });
      }
    }
  );
});

app.get("/auth/getArtistInfo/:id", (req, res) => {
  const artistId = req.params.id;

  request.get(
    `https://api.spotify.com/v1/artists/${artistId}`,
    {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    },
    (error, response, body) => {
      if (!error && response.statusCode === 200) {
        const artistInfo = JSON.parse(body);
        res.json(artistInfo);
      } else {
        res.status(response.statusCode).json({ error: "Invalid artist id" });
      }
    }
  );
});

app.get("/auth/callback", (req, res) => {
  var code = req.query.code;

  var authOptions = {
    url: "https://accounts.spotify.com/api/token",
    form: {
      code: code,
      redirect_uri: spotify_redirect_uri,
      grant_type: "authorization_code",
    },
    headers: {
      Authorization:
        "Basic " +
        Buffer.from(spotify_client_id + ":" + spotify_client_secret).toString(
          "base64"
        ),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    json: true,
  };

  request.post(authOptions, function (error, response, body) {
    if (!error && response.statusCode === 200) {
      access_token = body.access_token;
      res.redirect("/");
    }
  });
});

app.get("/auth/token", (req, res) => {
  res.json({ access_token: access_token });
});

app.listen(port, () => {
  console.log(`Listening at http://localhost:${port}`);
});
