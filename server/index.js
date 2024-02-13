const express = require("express");
const request = require("request");
const dotenv = require("dotenv");
const { createClient } = require('redis');

const port = 5000;

global.access_token = "";

dotenv.config({ path: "test.env" });

var spotify_client_id = process.env.SPOTIFY_CLIENT_ID;
var spotify_client_secret = process.env.SPOTIFY_CLIENT_SECRET;

var spotify_redirect_uri = "http://localhost:3000/auth/callback";

var app = express();

const redisClient = createClient({ url: 'redis://127.0.0.1:6379' });
redisClient.connect().then(() => {
  const playlistRoutes = require("./routes/playlistRoutes");
  const userRoutes = require("./routes/userRoutes");  
  app.use("/auth/playlist", playlistRoutes);
  app.use("/auth/user", userRoutes);
});

var generateRandomString = function (length) {
  var text = "";
  var possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  for (var i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

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

module.exports = { redisClient };

